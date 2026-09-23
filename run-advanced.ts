import { db } from "./db";
import { sql } from "drizzle-orm";
import fs from "fs";

async function runAdvancedQueries() {
  try {
    const query = fs.readFileSync(
      "./database/advanced_queries.sql",
      "utf-8"
    );

    const statements = query
      .split(";")
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    console.log(`Found ${statements.length} SQL statements.`);

    for (let i = 0; i < statements.length; i++) {
      console.log(`Running query ${i + 1}...`);
      await db.execute(sql.raw(statements[i]));
    }

    console.log("=================================");
    console.log("All SQL queries executed successfully!");
    console.log("=================================");
  } catch (error) {
    console.error("=================================");
    console.error("SQL execution failed:");
    console.error(error);
    console.error("=================================");
  }
}

runAdvancedQueries();