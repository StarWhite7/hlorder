import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (globalThis.process?.env?.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
