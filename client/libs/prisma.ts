import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
    return new PrismaClient({
        datasourceUrl: process.env.DATABASE_URL,
    });
};

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// Append pgbouncer params if needed (though the singleton init usually handles just the URL)
// If we faced issues, we could tweak the URL here, but for now we trust .env.local + init-db experience.
// Actually, for runtime with connection pooler, we usually want pgbouncer=true if specifically using the transaction pooler.
// But since the singleton is long-lived, let's see.

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;