import {
    createKernelAccount,
    createKernelAccountClient,
    addressToEmptyAccount,
    createZeroDevPaymasterClient
} from "@zerodev/sdk";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { createPublicClient, http, WalletClient } from "viem";
import { baseSepolia } from "viem/chains";
import { BASE_SEPOLIA_RPC, ENTRYPOINT_ADDRESS_V07 } from "./constants";

const ZERODEV_PROJECT_ID = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID;

if (!ZERODEV_PROJECT_ID) {
    throw new Error("Missing NEXT_PUBLIC_ZERODEV_PROJECT_ID");
}

const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(BASE_SEPOLIA_RPC),
});

export async function createSmartAccount(walletClient: WalletClient) {
    if (!walletClient.account) throw new Error("Wallet not connected");

    // 1. Create ECDSA Validator (Signer: The EOA)
    const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        signer: walletClient as any, // Cast to any to avoid complex Wagmi/Viem type mismatch
        entryPoint: {
            address: ENTRYPOINT_ADDRESS_V07,
            version: "0.7"
        } as any,
        kernelVersion: "0.3.1",
    });

    // 2. Create Kernel Account (Contract)
    const account = await createKernelAccount(publicClient, {
        plugins: {
            sudo: ecdsaValidator,
        },
        entryPoint: {
            address: ENTRYPOINT_ADDRESS_V07,
            version: "0.7"
        } as any,
        kernelVersion: "0.3.1",
    });

    // 3. Create Kernel Client (To send UserOps)
    const kernelClient = createKernelAccountClient({
        account,
        chain: baseSepolia,
        bundlerTransport: http(`https://rpc.zerodev.app/api/v3/${ZERODEV_PROJECT_ID}/chain/84532`),
        paymaster: {
            getPaymasterData: async (userOp) => {
                const paymasterClient = createZeroDevPaymasterClient({
                    chain: baseSepolia,
                    transport: http(`https://rpc.zerodev.app/api/v3/${ZERODEV_PROJECT_ID}/chain/84532`),
                });
                return paymasterClient.sponsorUserOperation({
                    userOperation: userOp,
                });
            }
        }
    });

    return { account, kernelClient };
}