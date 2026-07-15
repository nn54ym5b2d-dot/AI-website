import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

type PrismaGlobal = typeof globalThis & {
  __yuansuPrisma?: PrismaClient;
};

const prismaGlobal = globalThis as PrismaGlobal;

export function getPrisma() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!prismaGlobal.__yuansuPrisma) {
    const adapter = new PrismaPg({ connectionString });
    prismaGlobal.__yuansuPrisma = new PrismaClient({ adapter });
  }

  return prismaGlobal.__yuansuPrisma;
}

export async function disconnectPrisma() {
  if (prismaGlobal.__yuansuPrisma) {
    await prismaGlobal.__yuansuPrisma.$disconnect();
    delete prismaGlobal.__yuansuPrisma;
  }
}
