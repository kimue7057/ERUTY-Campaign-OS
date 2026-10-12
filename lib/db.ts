import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalDb = globalThis as unknown as { erutyDb?: PrismaClient };
export const db = globalDb.erutyDb ?? new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 }),
});
if (process.env.NODE_ENV !== "production") globalDb.erutyDb = db;
