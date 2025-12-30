import express from "express";
// PrismaClient is CommonJS, needs default import in ES modules
import pkg from "@prisma/client";
const { PrismaClient } = pkg as any;
import { parseUnits } from "viem";
import type { Address } from "viem";
import { serializeSession, type SessionConfig } from "../libs/sessionKey.ts";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { CallPolicyVersion, ParamCondition, toCallPolicy } from "@zerodev/permissions/policies";
import { USDC_ADDRESSES } from "../libs/constants.ts"




const ERC20_ABI = [
  {
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;


const router = express.Router();
const prisma = new PrismaClient();

const FACILITATOR_PAY_TO = (process.env.FACILITATOR_PAY_TO || "0x88c45377C7653a3B5e42685cB74835f669D9A546") as Address;
const SESSION_SPENDING_LIMIT = process.env.SESSION_SPENDING_LIMIT || "100"; // USDC amount
const SESSION_DURATION = parseInt(process.env.SESSION_DURATION || "86400"); // 24 hours

/**
 * POST /session/create
 * Generate a new session key for the user
 */
router.post("/create", async (req: express.Request, res: express.Response) => {
  try {
    const { walletAddress, smartAccountAddress, chainId } = req.body;
    const usdcAddress = chainId ? USDC_ADDRESSES[chainId] : undefined;


    if (!walletAddress || !smartAccountAddress) {
      return res.status(400).json({
        error: "Missing walletAddress or smartAccountAddress",
      });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress },
      });
    }

    // Generate session key pair  
    // const { privateKey, publicKey } = generateSessionKeyPair();
    const privateKey = generatePrivateKey();
    const sessionKeySigner = privateKeyToAccount(privateKey);
    console.log("🔍 privateKey:", privateKey);
    console.log("🔍 publicKey:", sessionKeySigner);


    const spendingLimitAmount = parseUnits(SESSION_SPENDING_LIMIT, 6); // USDC has 6 decimals


    const ownerAddress = process.env.RECEIVER_ADDRESS as `0x${string}`;
    if (!ownerAddress) throw new Error("Owner address not configured");


    


    // Create session config (private key stored in DB, public key sent to client)
    const sessionConfig: SessionConfig = {
      privateKey,
      sessionKeySigner: sessionKeySigner.address,
      smartAccountAddress,
      enableSignature: "", // Will be filled after client signs
      spendingLimit: SESSION_SPENDING_LIMIT,
      spendingLimitAmount,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION * 1000,
    };

    console.log("🔍 sessionConfig:", sessionConfig);
    // Create session in database
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        smartAccountAddress: smartAccountAddress,
        sessionPublicKey: sessionKeySigner.address,
        status: "ACTIVE",
        totalAmount: parseFloat(SESSION_SPENDING_LIMIT),
        remainingAmount: parseFloat(SESSION_SPENDING_LIMIT),
        expiresAt: new Date(sessionConfig.expiresAt!),
        sessionConfig: sessionConfig,
      },
    });

    // Return only the public key and session ID to the client
    res.status(201).json({
      sessionId: session.id,
      sessionKeySigner: sessionKeySigner,  
      spendingLimit: SESSION_SPENDING_LIMIT,
      expiresAt: sessionConfig.expiresAt,
      message: "Session key created. Please sign the enable signature.",
    });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

/**
 * POST /session/activate
 * Store the enable signature after user signs
 */
router.post("/activate", async (req: express.Request, res: express.Response) => {
  try {
    const { sessionId, enableSignature } = req.body;

    if (!sessionId || !enableSignature) {
      return res.status(400).json({
        error: "Missing sessionId or enableSignature",
      });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Update session with enable signature
    const sessionConfig = session.sessionConfig as SessionConfig;
    sessionConfig.enableSignature = enableSignature;

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: "ACTIVE",
        sessionConfig: sessionConfig,
      },
    });

    res.status(200).json({
      message: "Session activated successfully",
      sessionId: updatedSession.id,
    });
  } catch (error) {
    console.error("Error activating session:", error);
    res.status(500).json({ error: "Failed to activate session" });
  }
});

/**
 * GET /session/:walletAddress
 * Get active session for a wallet
 */
router.get("/:walletAddress", async (req: express.Request, res: express.Response) => {
  try {
    const { walletAddress } = req.params;

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        sessions: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!user || !user.sessions.length) {
      return res.status(404).json({
        error: "No active session found",
        hasSession: false,
      });
    }

    const session = user.sessions[0];
    const isExpired = session.expiresAt && new Date(session.expiresAt) < new Date();

    if (isExpired) {
      await prisma.session.update({
        where: { id: session.id },
        data: { status: "EXPIRED" },
      });

      return res.status(200).json({
        error: "Session expired",
        hasSession: false,
      });
    }

    const sessionConfig = session.sessionConfig as SessionConfig;

    res.status(200).json({
      hasSession: true,
      sessionId: session.id,
      sessionKeySigner: sessionConfig.sessionKeySigner,
      remainingAmount: session.remainingAmount,
      totalAmount: session.totalAmount,
      spendingLimit: sessionConfig.spendingLimit,
      status: session.status,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

/**
 * POST /session/revoke
 * Revoke a session
 */
router.post("/revoke", async (req: express.Request, res: express.Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: { status: "REVOKED" },
    });

    res.status(200).json({
      message: "Session revoked successfully",
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Error revoking session:", error);
    res.status(500).json({ error: "Failed to revoke session" });
  }
});

/**
 * POST /session/update-balance
 * Update remaining balance after payment (called by backend after paying for API)
 */
router.post("/update-balance", async (req: express.Request, res: express.Response) => {
  try {
    const { sessionId, amountUsed } = req.body;

    if (!sessionId || amountUsed === undefined) {
      return res.status(400).json({
        error: "Missing sessionId or amountUsed",
      });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const newRemainingAmount = session.remainingAmount - amountUsed;

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        remainingAmount: Math.max(0, newRemainingAmount),
        status: newRemainingAmount <= 0 ? "EXPIRED" : "ACTIVE",
      },
    });

    res.status(200).json({
      message: "Balance updated",
      remainingAmount: updatedSession.remainingAmount,
      status: updatedSession.status,
    });
  } catch (error) {
    console.error("Error updating balance:", error);
    res.status(500).json({ error: "Failed to update balance" });
  }
});

export default router;
