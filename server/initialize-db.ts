import fs from "fs";
import path from "path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const rawUrl = process.env.SUPABASE_URL || "https://wgtdojniahdyzjndrfcd.supabase.co";
const match = rawUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
const projectId = match ? match[1] : "wgtdojniahdyzjndrfcd";

const host = `db.${projectId}.supabase.co`;
const user = "postgres";
const database = "postgres";

async function run() {
  const password = process.env.DB_PASSWORD || process.argv[2];
  if (!password) {
    console.error("ERROR: DB_PASSWORD environment variable or command-line argument is required.");
    console.error("Usage: npx tsx server/initialize-db.ts <your_database_password>");
    process.exit(1);
  }

  const sqlPath = path.join(process.cwd(), "supabase-schema.sql");
  if (!fs.existsSync(sqlPath)) {
    console.error(`ERROR: Schema file not found at ${sqlPath}`);
    process.exit(1);
  }

  console.log("Reading schema SQL file...");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  const client = new pg.Client({
    host,
    port: 5432,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting directly to Supabase PostgreSQL database...");
    await client.connect();
    console.log("Connected successfully.");

    console.log("Applying schema migrations and seed data...");
    // Execute the SQL file
    await client.query(sql);
    console.log("Schema applied successfully.");

    console.log("Ensuring storage bucket 'wildlife-images' exists...");
    // Supabase storage bucket is represented as a row in the storage.buckets table.
    // Inserting directly via Postgres bypasses all API permission restrictions.
    await client.query(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES ('wildlife-images', 'wildlife-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log("Storage bucket 'wildlife-images' is verified/created.");

    // Enable public access policies for storage objects in this bucket if they don't exist
    try {
      await client.query(`
        DO $$
        BEGIN
          -- Insert SELECT policy if not exists
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Access for wildlife-images'
          ) THEN
            CREATE POLICY "Public Access for wildlife-images" ON storage.objects
            FOR SELECT TO public USING (bucket_id = 'wildlife-images');
          END IF;

          -- Insert INSERT policy if not exists
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Upload for wildlife-images'
          ) THEN
            CREATE POLICY "Public Upload for wildlife-images" ON storage.objects
            FOR INSERT TO public WITH CHECK (bucket_id = 'wildlife-images');
          END IF;
        END $$;
      `);
      console.log("Storage bucket policies applied successfully.");
    } catch (policyErr: any) {
      console.log("Note: Policy application returned (might already exist or be managed differently):", policyErr.message);
    }

    console.log("\n[SUCCESS] Supabase database and storage bucket initialized successfully!");
    
  } catch (err: any) {
    console.error("\n[FATAL ERROR] Failed during initialization:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
