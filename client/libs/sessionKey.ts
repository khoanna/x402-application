import {
  toPermissionValidator,
  toCallPolicy,
  toSpendingLimitsPolicy,
} from "@zerodev/permissions";
import { toEcdsaSigner } from "@zerodev/ecdsa-validator";
import { createPublicClient, http, parseUnits, type PublicClient, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { USDC_ADDRESS, BASE_SEPOLIA_RPC, ENTRYPOINT_ADDRESS_V07 } from "./constants";
import type { PrivateKeyAccount } from "viem/accounts";
export interface SessionConfig {
  privateKey: string;
  sessionKeySigner: PrivateKeyAccount;
  smartAccountAddress: Address;
  enableSignature: string;
  spendingLimit: string;
  spendingLimitAmount: bigint;
  createdAt: number;
  expiresAt?: number;
}

/**
 * Generate a random session key pair
 * Returns { privateKey, publicKey }
 */
export function generateSessionKeyPair(): { privateKey: string; publicKey: Address } {
  const account = privateKeyToAccount("0x" + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(""));
  return {
    privateKey: account.key,
    publicKey: account.address,
  };
}

/**
 * Create a permission validator for session key with USDC spending limits
 */
export async function createSessionPermissionValidator(
  sessionPublicKey: Address,
  spendingLimitAmount: bigint,
  facilitatorPayToAddress: Address,
  publicClient: PublicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(BASE_SEPOLIA_RPC),
  })
) {
  // Create policies for the session key
  const policies = [
    // Allow calling transfer on USDC contract to the facilitator
    toCallPolicy({
      permissions: [
        {
          target: USDC_ADDRESS as Address,
          abi: [
            {
              type: "function",
              name: "transfer",
              inputs: [
                { name: "to", type: "address" },
                { name: "amount", type: "uint256" },
              ],
              outputs: [{ name: "", type: "bool" }],
              stateMutability: "nonpayable",
            },
          ],
          functionName: "transfer",
          // Lock first argument (to) to facilitator address
          args: [
            {
              condition: "EQUAL" as const,
              value: facilitatorPayToAddress,
            },
            null, // amount can be anything
          ],
        },
      ],
    }),
    // Add spending limit policy
    toSpendingLimitsPolicy([
      {
        token: USDC_ADDRESS as Address,
        limit: spendingLimitAmount,
        period: 86400, // 24 hours
      },
    ]),
  ];

  // Create ECDSA signer from session private key
  const sessionSigner = toEcdsaSigner({
    signer: privateKeyToAccount(sessionPublicKey as `0x${string}`),
  });

  // Create permission validator
  const permissionValidator = await toPermissionValidator(publicClient, {
    signer: sessionSigner,
    policies,
    entryPoint: {
      address: ENTRYPOINT_ADDRESS_V07,
      version: "0.7",
    } as any,
    kernelVersion: "0.3.1",
  });

  return permissionValidator;
}

/**
 * Serialize session config for storage
 */
export function serializeSession(config: SessionConfig): string {
  return JSON.stringify(config);
}

/**
 * Deserialize session config from storage
 */
export function deserializeSession(data: string): SessionConfig {
  return JSON.parse(data);
}

/**
 * Create signer from session private key (for backend use)
 */
export function createSessionSigner(sessionPrivateKey: string) {
  return privateKeyToAccount(sessionPrivateKey as `0x${string}`);
}
