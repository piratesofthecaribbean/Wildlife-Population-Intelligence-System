import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const rawUrl = process.env.SUPABASE_URL || "";
// Normalize URL to not end with /rest/v1/
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";

console.log("Using URL:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log("Testing connection...");
    const { data: users, error } = await supabase.from("users").select("*").limit(1);
    if (error) {
      console.log("Error selecting from users table:", error);
    } else {
      console.log("Success! Users table exists and returned:", users);
    }
  } catch (err) {
    console.error("Uncaught error:", err);
  }
}

run();
