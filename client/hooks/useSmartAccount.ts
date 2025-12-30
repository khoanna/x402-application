'use client';

import { useEffect, useState } from 'react';
import { useWalletClient, usePublicClient, useAccount, useChainId } from 'wagmi';
import { createSmartAccount } from '../libs/zerodev';
import { Address, parseUnits } from 'viem';
import { toECDSASigner } from '@zerodev/permissions/signers';
import { SessionInfo } from '@/types/session';
import { ENTRYPOINT_ADDRESS_V07, ERC20_ABI, USDC_ADDRESS } from '@/libs/constants';
import { ParamCondition, toCallPolicy } from '@zerodev/permissions/policies';
import { CallPolicyVersion } from '@zerodev/permissions/policies';
import { toPermissionValidator } from '@zerodev/permissions';

// Backend API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';


export function useSmartAccount() {
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const { address: eoa } = useAccount();
    const chainId = useChainId();
    
    const [address, setAddress] = useState<Address | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDeployed, setIsDeployed] = useState(false);
    const [kernelClient, setKernelClient] = useState<any>(null);
    
    // Session state
    const [session, setSession] = useState<SessionInfo | null>(null);
    const [sessionLoading, setSessionLoading] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);

    useEffect(() => {
        async function loadAccount() {
            if (!walletClient || !publicClient) return;
            setIsLoading(true);
            try {
                const { account, kernelClient: client } = await createSmartAccount(walletClient);
                setAddress(account.address);
                setKernelClient(client);

                // Check if deployed
                const code = await publicClient.getBytecode({ address: account.address });
                setIsDeployed(!!code);

                console.log("Smart Account:", account.address, "Deployed:", !!code);
            } catch (err) {
                console.error("Failed to load smart account:", err);
            } finally {
                setIsLoading(false);
            }
        }

        loadAccount();
    }, [walletClient, publicClient]);

    /**
     * Create a new session key for the smart account
     */
    const createSession = async () => {
        if (!address || !eoa || !kernelClient || !publicClient) {
            setSessionError("Smart account not connected");
            return null;
        }

        setSessionLoading(true);
        setSessionError(null);

        try {
            // Step 1: Request backend to generate session key pair
            const createResponse = await fetch(`${API_BASE_URL}/session/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    walletAddress: eoa,
                    smartAccountAddress: address,
                    chainId: chainId
                }),
            });

            if (!createResponse.ok) {
                throw new Error("Failed to create session key");
            }

            const createData = await createResponse.json();
            const { sessionId, sessionKeySigner, spendingLimit, expiresAt } = createData;

            const ecdsaSigner = await toECDSASigner({
                signer: sessionKeySigner,
            });

            // Define permissions: Allow transferring up to TOTAL amount
            const callPolicy = await toCallPolicy({
                policyVersion: CallPolicyVersion.V0_0_4,
                permissions: [
                    {
                        target: USDC_ADDRESS,
                        abi: ERC20_ABI,
                        functionName: 'transfer',
                        args: [
                            { condition: ParamCondition.EQUAL, value: process.env.NEXT_PUBLIC_RECEIVER_ADDRESS as `0x{string}` },
                            { condition: ParamCondition.LESS_THAN_OR_EQUAL, value: parseUnits(spendingLimit, 6) }
                        ]
                    }
                ]
            });

            const permissionValidator = await toPermissionValidator(publicClient, {
                entryPoint: {
                    address: ENTRYPOINT_ADDRESS_V07,
                    version: "0.7"
                },
                kernelVersion: "0.3.1",
                signer: ecdsaSigner,
                policies: [callPolicy]
            }) as any;

            const enableSignature = await kernelClient.account.kernelPluginManager.getPluginEnableSignature(
                kernelClient.account.address,
                permissionValidator
            );

            // Step 3: Send enable signature to backend for storage
            const activateResponse = await fetch(`${API_BASE_URL}/session/activate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId,
                    enableSignature,
                }),
            });

            if (!activateResponse.ok) {
                throw new Error("Failed to activate session");
            }

            // Step 4: Update local session state
            const sessionInfo: SessionInfo = {
                sessionId,
                sessionKeySigner,
                remainingAmount: parseFloat(spendingLimit),
                totalAmount: parseFloat(spendingLimit),
                spendingLimit,
                status: "ACTIVE",
                expiresAt: new Date(expiresAt),
                createdAt: new Date(),
            };

            setSession(sessionInfo);
            console.log("✅ Session created:", sessionInfo);
            return sessionInfo;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create session";
            setSessionError(message);
            console.error("❌ Error creating session:", error);
            return null;
        } finally {
            setSessionLoading(false);
        }
    };

    /**
     * Fetch the current session from backend
     */
    const fetchSession = async () => {
        if (!eoa) return null;

        setSessionLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/session/${eoa}`);
            
            if (!response.ok) {
                const data = await response.json();
                if (!data.hasSession) {
                    setSession(null);
                    return null;
                }
                throw new Error(data.error);
            }

            const data = await response.json();
            if (data.hasSession) {
                const sessionInfo: SessionInfo = {
                    sessionId: data.sessionId,
                    sessionKeySigner: data.sessionKeySigner || data.publicKey,
                    remainingAmount: data.remainingAmount,
                    totalAmount: data.totalAmount,
                    spendingLimit: data.spendingLimit,
                    status: data.status,
                    expiresAt: new Date(data.expiresAt),
                    createdAt: new Date(data.createdAt),
                };
                setSession(sessionInfo);
                return sessionInfo;
            }
            setSession(null);
            return null;
        } catch (error) {
            console.error("Error fetching session:", error);
            setSession(null);
            return null;
        } finally {
            setSessionLoading(false);
        }
    };

    /**
     * Revoke the current session
     */
    const revokeSession = async () => {
        if (!session) {
            setSessionError("No active session to revoke");
            return false;
        }

        setSessionLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/session/revoke`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: session.sessionId }),
            });

            if (!response.ok) {
                throw new Error("Failed to revoke session");
            }

            setSession(null);
            console.log("✅ Session revoked");
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to revoke session";
            setSessionError(message);
            console.error("❌ Error revoking session:", error);
            return false;
        } finally {
            setSessionLoading(false);
        }
    };

    return {
        address,
        isLoading,
        isDeployed,
        kernelClient,
        session,
        sessionLoading,
        sessionError,
        createSession,
        fetchSession,
        revokeSession,
    };
}