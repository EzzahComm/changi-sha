import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/app/generated/prisma/client'

// Runtime queries go through the transaction-mode pooler (DATABASE_URL, :6543).
// Migrations use DIRECT_URL and are configured in prisma.config.ts instead.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
