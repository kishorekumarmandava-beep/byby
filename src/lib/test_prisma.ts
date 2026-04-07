import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";

process.env.DATABASE_URL = "file:./dev.db";

async function run() {
  try {
    const prisma1 = new PrismaClient();
    console.log("SUCCESS WITHOUT ADAPTER");
  } catch(e) {
    console.error("PRISMA WITHOUT ADAPTER ERROR: ", e.message);
  }

  try {
    const db = new Database("./dev.db");
    const adapter = new PrismaBetterSqlite3(db);
    const prisma2 = new PrismaClient({ adapter });
    await prisma2.user.count();
    console.log("SUCCESS WITH ADAPTER");
  } catch(e) {
    console.error("PRISMA WITH ADAPTER ERROR: ", e.message);
  }
}

run();
