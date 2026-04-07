import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";

const db = new Database("./dev.db");
const adapter = new PrismaBetterSqlite3(db);

const tryOptions = [
  { adapter },
  { adapter, datasourceUrl: "file:./dev.db" },
  { adapter, datasources: { db: { url: "file:./dev.db" } } }
];

async function run() {
  for (const opts of tryOptions) {
    try {
      console.log("Trying: ", JSON.stringify(opts));
      const prisma = new PrismaClient(opts as any);
      await prisma.user.count();
      console.log("SUCCESS:", opts);
      break;
    } catch(e) {
      console.error("FAILED", e.message);
    }
  }
}
run();
