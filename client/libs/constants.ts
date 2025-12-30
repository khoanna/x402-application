import { Address } from 'viem';

// ZeroDev Session Key Validator (Pre-deployed)
export const SESSION_KEY_VALIDATOR_ADDRESS: Address =
    (process.env.NEXT_PUBLIC_SESSION_KEY_VALIDATOR_ADDRESS ||
        '0x6A6F069E2a08c2468e7724Ab3250CdBFBA14D4FF') as Address;

// USDC Contract on Base Sepolia (Pre-deployed)
export const USDC_ADDRESS: Address =
    (process.env.NEXT_PUBLIC_USDC_ADDRESS ||
        '0x036CbD53842c5426634e7929541eC2318f3dCF7e') as Address;

// EntryPoint for ERC-4337
export const ENTRYPOINT_ADDRESS_V07: Address =
    '0x0000000071727de22e5e9d8baf0edac6f37da032' as Address;

// Network Configuration
export const BASE_SEPOLIA_RPC = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org';

export const ERC20_ABI = [
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