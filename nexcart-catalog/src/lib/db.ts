import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  catalogDb: PrismaClient | undefined;
};

export const db =
  globalForPrisma.catalogDb ??
  new PrismaClient({
    log: ["error"],
  });

globalForPrisma.catalogDb = db;
