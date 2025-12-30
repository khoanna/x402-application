import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, parseUnits, encodeFunctionData, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient } from "@zerodev/sdk";
import { toPermissionValidator } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { CallPolicyVersion, ParamCondition, toCallPolicy } from "@zerodev/permissions/policies";
// PrismaClient is CommonJS, needs default import in ES modules
import pkg from "@prisma/client";
const { PrismaClient } = pkg as any;
import dotenv from "dotenv";
import { USDC_ADDRESSES } from "../libs/constants.ts";

dotenv.config();

const prisma = new PrismaClient();

// ERC20 ABI for transfer
const ERC20_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

// Chain configuration
const CHAIN = baseSepolia;
const USDC_ADDRESS = USDC_ADDRESSES[CHAIN.id] as Hex;
const ENTRYPOINT_ADDRESS_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as const;
const ZERODEV_PROJECT_ID = process.env.ZERODEV_PROJECT_ID;
const BUNDLER_RPC = process.env.ZERODEV_BUNDLER_RPC || `https://rpc.zerodev.app/api/v3/bundler/${ZERODEV_PROJECT_ID}`;
const PAYMASTER_RPC = process.env.ZERODEV_PAYMASTER_RPC || `https://rpc.zerodev.app/api/v3/paymaster/${ZERODEV_PROJECT_ID}`;

interface PayFetchOptions {
  sessionId?: string;
  walletAddress?: string;
  apiCost?: number; // Cost of the API call in USDC (e.g., 0.001)
}

/**
 * Withdraw USDC from Smart Account to Backend EOA using Session Key
 */
async function withdrawFromSmartAccount(
  sessionPrivateKey: Hex,
  smartAccountAddress: Hex,
  enableSignature: Hex,
  amount: bigint
): Promise<Hex> {
  const backendSigner = privateKeyToAccount(process.env.BUYER_PRIVATE_KEY as Hex);
  const backendAddress = backendSigner.address;

  console.log(`\n🔄 Withdrawing ${amount} USDC units from Smart Account to Backend EOA`);
  console.log(`   Smart Account: ${smartAccountAddress}`);
  console.log(`   Backend EOA: ${backendAddress}`);

  // Create public client
  const publicClient = createPublicClient({
    chain: CHAIN,
    transport: http(),
  });

  // Create session key signer
  const sessionSigner = privateKeyToAccount(sessionPrivateKey);
  const ecdsaSigner = await toECDSASigner({ signer: sessionSigner });

  // Recreate the call policy that was used when creating the session
  const callPolicy = await toCallPolicy({
    policyVersion: CallPolicyVersion.V0_0_4,
    permissions: [
      {
        target: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [
          { condition: ParamCondition.EQUAL, value: backendAddress },
          { condition: ParamCondition.LESS_THAN_OR_EQUAL, value: parseUnits("100", 6) } // Max spending limit
        ]
      }
    ]
  });

  // Create permission validator with the session key
  const permissionValidator = await toPermissionValidator(publicClient, {
    entryPoint: {
      address: ENTRYPOINT_ADDRESS_V07,
      version: "0.7"
    },
    kernelVersion: "0.3.1",
    signer: ecdsaSigner,
    policies: [callPolicy]
  });

  // Create kernel account with the permission validator
  const kernelAccount = await createKernelAccount(publicClient, {
    entryPoint: {
      address: ENTRYPOINT_ADDRESS_V07,
      version: "0.7"
    },
    kernelVersion: "0.3.1",
    plugins: {
      sudo: permissionValidator,
      regular: permissionValidator,
      pluginEnableSignature: enableSignature,
    },
    address: smartAccountAddress,
  });

  // Create ZeroDev paymaster client for gas sponsorship
  const paymasterClient = createZeroDevPaymasterClient({
    chain: CHAIN,
    transport: http(PAYMASTER_RPC),
  });

  // Create kernel client with paymaster
  const kernelClient = createKernelAccountClient({
    account: kernelAccount,
    chain: CHAIN,
    bundlerTransport: http(BUNDLER_RPC),
    paymaster: paymasterClient,
  });

  // Execute transfer from Smart Account to Backend EOA
  const txHash = await kernelClient.sendTransaction({
    to: USDC_ADDRESS,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [backendAddress, amount]
    }),
    value: 0n
  });

  console.log(`✅ Withdrawal tx hash: ${txHash}`);
  return txHash;
}

/**
 * Get session data and prepare for payment
 */
async function getSessionData(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session || !session.sessionConfig) {
    return null;
  }

  const sessionConfig = session.sessionConfig as any;
  return {
    sessionPrivateKey: sessionConfig.privateKey as Hex,
    smartAccountAddress: sessionConfig.smartAccountAddress as Hex,
    enableSignature: sessionConfig.enableSignature as Hex,
    remainingAmount: session.remainingAmount,
  };
}

/**
 * Update session balance after payment
 */
async function updateSessionBalance(sessionId: string, amountUsed: number) {
  try {
    const response = await fetch("http://localhost:3001/session/update-balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        amountUsed,
      }),
    });

    if (!response.ok) {
      console.warn("Failed to update session balance:", await response.text());
    }
  } catch (error) {
    console.error("Error updating session balance:", error);
  }
}

/**
 * Main payFetch function
 * 
 * Flow when using session:
 * 1. Withdraw USDC from Smart Account to Backend EOA (using session key)
 * 2. Pay the facilitator using Backend EOA (using BUYER_PRIVATE_KEY)
 * 
 * Flow without session:
 * 1. Pay directly using Backend EOA (using BUYER_PRIVATE_KEY)
 */
export default async function payFetch(url: string, options?: PayFetchOptions) {
  try {
    // Backend EOA signer - always used for x402 payment
    if (!process.env.BUYER_PRIVATE_KEY) {
      throw new Error("❌ BUYER_PRIVATE_KEY not set in environment");
    }
    const backendSigner = privateKeyToAccount(process.env.BUYER_PRIVATE_KEY as Hex);

    // If session ID provided, first withdraw from Smart Account to Backend EOA
    if (options?.sessionId && options?.apiCost) {
      console.log(`\n🔐 Session payment flow initiated`);
      
      const sessionData = await getSessionData(options.sessionId);
      
      if (!sessionData) {
        throw new Error(`Session not found: ${options.sessionId}`);
      }

      if (!sessionData.enableSignature) {
        throw new Error("Session not activated - missing enable signature");
      }

      // Check remaining balance
      if (sessionData.remainingAmount < options.apiCost) {
        throw new Error(`Insufficient session balance. Required: ${options.apiCost}, Available: ${sessionData.remainingAmount}`);
      }

      // Convert API cost to USDC units (6 decimals)
      const amountInUnits = parseUnits(options.apiCost.toString(), 6);

      // Step 1: Withdraw from Smart Account to Backend EOA
      console.log(`\n📤 Step 1: Withdrawing ${options.apiCost} USDC from Smart Account...`);
      try {
        await withdrawFromSmartAccount(
          sessionData.sessionPrivateKey,
          sessionData.smartAccountAddress,
          sessionData.enableSignature,
          amountInUnits
        );
        console.log(`✅ Withdrawal complete`);
      } catch (withdrawError) {
        console.error("❌ Failed to withdraw from Smart Account:", withdrawError);
        throw new Error(`Smart Account withdrawal failed: ${withdrawError instanceof Error ? withdrawError.message : "Unknown error"}`);
      }
    } else {
      console.log(`\n💳 Direct EOA payment flow (no session)`);
    }

    // Step 2: Pay facilitator using Backend EOA
    console.log(`\n📤 Step 2: Paying facilitator via x402...`);
    
    // Create x402 client with backend signer
    const client = new x402Client();
    registerExactEvmScheme(client, { signer: backendSigner });
    const fetchWithPayment = wrapFetchWithPayment(fetch, client);

    console.log(`💳 payFetch: Fetching ${url} with payment from Backend EOA (${backendSigner.address})`);
    const response = await fetchWithPayment(url, {
      method: "GET",
    });
    
    if (response.ok) {
      // Debug: Log response headers for inspection
      const headers: Record<string, string> = {};
      response.headers.forEach((value, name) => {
        headers[name] = value;
      });
      
      if (Object.keys(headers).length > 0) {
        console.log("📋 Response Headers:", headers);
      }
      
      const httpClient = new x402HTTPClient(client);
      try {
        const paymentResponse = httpClient.getPaymentSettleResponse((name) => response.headers.get(name));
        console.log("💰 Payment settled:", paymentResponse);
        
        // Update session balance if using session
        if (options?.sessionId && options?.apiCost) {
          await updateSessionBalance(options.sessionId, options.apiCost);
        }
      } catch (headerError) {
        console.log(headerError);
      }
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Error in payFetch:", error);
    throw error;
  }
}

