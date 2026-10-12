import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { databaseOptions } from "./database-options";

const globalDb = globalThis as unknown as { erutyDb?: PrismaClient };
export const db =
  globalDb.erutyDb ??
  new PrismaClient({
    adapter: new PrismaPg({
      ...databaseOptions(process.env.DATABASE_URL, process.env.DATABASE_CA_CERT),
      connectionTimeoutMillis: 5000,
      max: 1,
      idleTimeoutMillis: 10000,
    }),
  });
if (process.env.NODE_ENV !== "production") globalDb.erutyDb = db;
