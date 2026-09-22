# SmartMart Database — Onboarding Guide

This project uses **Postgres (hosted on Neon)** + **Drizzle ORM** for the
SmartMart DBMS project. 

---

## 1. Clone the repo

```bash
git clone <your-repo-url>
cd smartmart
```

## 2. Install dependencies

```bash
npm install
npm install -D drizzle-kit tsx
```

You may see `npm warn allow-scripts` or a few `moderate severity
vulnerabilities` — these come from esbuild's normal install process and
are safe to ignore for this project.

## 3. Get a Neon database connection string

1. Go to [neon.tech](https://neon.tech) and sign up (or ask a teammate to
   add you to the existing project so everyone shares one database).
2. Open the project → copy the **connection string** from the dashboard.
   It looks like:
   ```
   postgresql://user:password@ep-xxxx.neon.tech/dbname?sslmode=require
   ```

## 4. Set up your `.env` file

Open `.env` and paste your connection string:

```
DATABASE_URL=postgresql://user:password@ep-xxxx.neon.tech/dbname?sslmode=require
```

⚠️ Never commit `.env` — make sure it's listed in `.gitignore`.

## 5. Push the schema to your database(Already done)

```bash
npx drizzle-kit push
```

This reads `schema.ts` and creates all 10 tables (with PKs, FKs, enums,
and constraints) directly in your Neon database. You should see a
success message listing the tables created.

## 6. Open Drizzle Studio (visual GUI)

```bash
npx drizzle-kit studio
```

This opens `https://local.drizzle.studio` in your browser — a
spreadsheet-like view of every table where you can add, edit, and
delete rows directly. Use this to populate test data (10+ customers,
10+ products, etc.) instead of writing manual `INSERT` statements.

## 7. (Optional) Run the seed script

Demonstrates CREATE, READ, UPDATE, an aggregate query, and a low-stock
check through the Drizzle client:

```bash
npx tsx seed.ts
```

---

## Project structure

```
smartmart/
├── schema.ts            # Full 10-table schema (source of truth for DB design)
├── drizzle.config.ts    # Tells drizzle-kit how to connect to Neon
├── db.ts                # Reusable database client
├── seed.ts              # Example CRUD + aggregate queries
├── .env                 # Your local DB connection string (not committed)
├── .env.example          # Template for .env
├── package.json
└── database/
    ├── 01_schema.sql          # Same schema in raw SQL (for the report/demo)
    ├── 02_normalization.md    # UNF → 1NF → 2NF → 3NF walkthrough
    ├── 03_er_diagram.md       # Mermaid ER diagram (renders on GitHub)
    └── README.md
```

---

## Team workflow

Everyone should point at the **same** Neon `DATABASE_URL` (share it
securely, e.g. via a private message — not committed to Git) so that
data added by one teammate in Drizzle Studio is visible to everyone
else immediately. Only run `drizzle-kit push` after schema changes are
agreed on as a team, since it alters the shared database.