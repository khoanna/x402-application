

export interface SessionInfo {
    sessionId: string;
    sessionKeySigner: string;
    remainingAmount: number;
    totalAmount: number;
    spendingLimit: string;
    status: string;
    expiresAt: Date;
    createdAt: Date;
}