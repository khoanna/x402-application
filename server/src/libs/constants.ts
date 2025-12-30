import { arbitrum, base, baseSepolia, mainnet, optimism, polygon, sepolia } from "wagmi/chains";

export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
    [mainnet.id]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    [polygon.id]: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC.e
    [optimism.id]: '0x0b2C639c53a777F49C86b7998987F63c1f3f8F0d', // USDC.e
    [arbitrum.id]: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC.e
    [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    [sepolia.id]: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  };
