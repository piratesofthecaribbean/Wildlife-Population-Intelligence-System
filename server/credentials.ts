import fs from "fs";
import path from "path";
import crypto from "crypto";

const CREDENTIALS_FILE = path.join(process.cwd(), "data", "credentials.json");

export interface Credential {
  email: string;
  passwordHash: string;
  organization: string;
  department?: string;
  country?: string;
}

const DEFAULT_SEED_CREDENTIALS: Record<string, Credential> = {
  "elena.r@wildlife.gov": {
    email: "elena.r@wildlife.gov",
    passwordHash: hashPassword("password123"),
    organization: "Wildlife Research Institute",
    department: "Biodiversity Informatics",
    country: "Kenya"
  },
  "j.mpata@wildlife.gov": {
    email: "j.mpata@wildlife.gov",
    passwordHash: hashPassword("password123"),
    organization: "Forest Guard Agency",
    department: "Law Enforcement",
    country: "Tanzania"
  },
  "admin@wildlife.gov": {
    email: "admin@wildlife.gov",
    passwordHash: hashPassword("password123"),
    organization: "Global Conservation Coalition",
    department: "Systems IT",
    country: "Switzerland"
  }
};

function loadCredentials(): Record<string, Credential> {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const raw = fs.readFileSync(CREDENTIALS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      let updated = false;
      for (const [key, val] of Object.entries(DEFAULT_SEED_CREDENTIALS)) {
        if (!parsed[key]) {
          parsed[key] = val;
          updated = true;
        }
      }
      if (updated) {
        saveCredentials(parsed);
      }
      return parsed;
    }
  } catch (err: any) {
    console.error("Error reading credentials file:", err.message);
  }
  
  // Seed default credentials if file doesn't exist
  saveCredentials(DEFAULT_SEED_CREDENTIALS);
  return { ...DEFAULT_SEED_CREDENTIALS };
}

function saveCredentials(creds: Record<string, Credential>) {
  try {
    console.log("[CREDENTIALS] Saving to:", CREDENTIALS_FILE);
    const dir = path.dirname(CREDENTIALS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), "utf-8");
  } catch (err: any) {
    console.error("Error writing credentials file:", err.message);
  }
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function getCredentialByEmail(email: string): Credential | null {
  const creds = loadCredentials();
  const found = creds[email.toLowerCase()] || null;
  console.log(`[CREDENTIALS] Query: "${email}" -> Found:`, found ? "YES" : "NO");
  return found;
}

export function saveCredential(cred: Credential): void {
  const creds = loadCredentials();
  creds[cred.email.toLowerCase()] = cred;
  saveCredentials(creds);
}
