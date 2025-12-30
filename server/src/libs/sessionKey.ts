import { type Address } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

export interface SessionConfig {
  privateKey: string;
  sessionKeySigner: Address;
  smartAccountAddress: Address;
  enableSignature: string;
  spendingLimit: string;
  spendingLimitAmount: bigint;
  createdAt: number;
  expiresAt?: number;
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



