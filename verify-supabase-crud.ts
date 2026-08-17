import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";

console.log("=========================================");
console.log("SUPABASE BACKEND CONNECTION VERIFICATION");
console.log("=========================================");
console.log("URL:", supabaseUrl);
console.log("Key Prefix:", supabaseKey ? `${supabaseKey.substring(0, 10)}...` : "None");

if (!supabaseUrl || !supabaseKey) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY must be configured.");
  process.exit(1);
}

// Decode key to print role
try {
  const parts = supabaseKey.split(".");
  if (parts.length === 3) {
    const payload = Buffer.from(parts[1], "base64").toString("utf-8");
    console.log("Supabase Key Role Claim:", JSON.parse(payload).role);
  }
} catch (e) {}

const cleanUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, "");
const supabase = createClient(cleanUrl, supabaseKey);

interface TestResult {
  table: string;
  select: "PASS" | "FAIL";
  insert: "PASS" | "FAIL";
  update: "PASS" | "FAIL";
  delete: "PASS" | "FAIL";
  error?: string;
}

const results: TestResult[] = [];

async function runTest() {
  console.log("\nStarting complete backend CRUD verification across all 9 tables...\n");

  // 1. USERS
  await runTableTest({
    table: "users",
    selectQuery: () => supabase.from("users").select("*"),
    insertQuery: () => supabase.from("users").insert([{
      id: "test-u-verify",
      name: "Verification Test User",
      email: `verify-${Date.now()}@wildlife.gov`,
      role: "Researcher"
    }]),
    updateQuery: () => supabase.from("users").update({ name: "Verification Test User Updated" }).eq("id", "test-u-verify"),
    deleteQuery: () => supabase.from("users").delete().eq("id", "test-u-verify")
  });

  // 2. MONITORING SITES
  await runTableTest({
    table: "monitoring_sites",
    selectQuery: () => supabase.from("monitoring_sites").select("*"),
    insertQuery: () => supabase.from("monitoring_sites").insert([{
      id: "test-site-verify",
      name: "Verify North Corner",
      protected_area: "Serengeti National Park",
      latitude: -2.1,
      longitude: 34.6,
      habitat_type: "Savanna",
      habitat_score: 90,
      canopy_cover: 20,
      water_availability: "Medium",
      human_disturbance: "Low",
      avg_temperature: 25.5
    }]),
    updateQuery: () => supabase.from("monitoring_sites").update({ name: "Verify North Corner Updated" }).eq("id", "test-site-verify"),
    deleteQuery: () => supabase.from("monitoring_sites").delete().eq("id", "test-site-verify")
  });

  // 3. SURVEYS
  await runTableTest({
    table: "surveys",
    selectQuery: () => supabase.from("surveys").select("*"),
    insertQuery: () => supabase.from("surveys").insert([{
      id: "test-survey-verify",
      title: "Verify Survey",
      site_id: "site-1",
      start_date: "2026-07-01",
      end_date: "2026-07-30",
      status: "Planned",
      surveyor_name: "Dr. Elena Rostova"
    }]),
    updateQuery: () => supabase.from("surveys").update({ title: "Verify Survey Updated" }).eq("id", "test-survey-verify"),
    deleteQuery: () => supabase.from("surveys").delete().eq("id", "test-survey-verify")
  });

  // 4. SPECIES
  await runTableTest({
    table: "species",
    selectQuery: () => supabase.from("species").select("*"),
    insertQuery: () => supabase.from("species").insert([{
      id: "test-sp-verify",
      common_name: "Verify Panther",
      scientific_name: "Panthera verify",
      conservation_status: "Vulnerable",
      group_name: "Mammal",
      population_estimate: "100-200",
      description: "Verification test species"
    }]),
    updateQuery: () => supabase.from("species").update({ common_name: "Verify Panther Updated" }).eq("id", "test-sp-verify"),
    deleteQuery: () => supabase.from("species").delete().eq("id", "test-sp-verify")
  });

  // 5. WILDLIFE IMAGES
  await runTableTest({
    table: "wildlife_images",
    selectQuery: () => supabase.from("wildlife_images").select("*"),
    insertQuery: () => supabase.from("wildlife_images").insert([{
      id: "test-img-verify",
      survey_id: "survey-1",
      site_id: "site-1",
      file_name: "verify_img.jpg",
      image_uri: "/assets/verify.jpg",
      status: "Pending",
      species_count: 0,
      highest_confidence: 0.0,
      species_richness: 0,
      diversity_index: 0.0,
      habitat_classification: "Savanna",
      habitat_health_score: 80,
      habitat_degradation_level: "None",
      habitat_notes: "Verification notes"
    }]),
    updateQuery: () => supabase.from("wildlife_images").update({ file_name: "verify_img_updated.jpg" }).eq("id", "test-img-verify"),
    deleteQuery: () => supabase.from("wildlife_images").delete().eq("id", "test-img-verify")
  });

  // 6. DETECTIONS
  await runTableTest({
    table: "detections",
    selectQuery: () => supabase.from("detections").select("*"),
    insertQuery: () => supabase.from("detections").insert([{
      id: "test-det-verify",
      image_id: "img-1",
      species_id: "sp-1",
      species_common_name: "African Lion",
      species_scientific_name: "Panthera leo",
      confidence: 0.95,
      box_x: 10,
      box_y: 10,
      box_width: 20,
      box_height: 20
    }]),
    updateQuery: () => supabase.from("detections").update({ confidence: 0.99 }).eq("id", "test-det-verify"),
    deleteQuery: () => supabase.from("detections").delete().eq("id", "test-det-verify")
  });

  // 7. RECOMMENDATIONS
  await runTableTest({
    table: "recommendations",
    selectQuery: () => supabase.from("recommendations").select("*"),
    insertQuery: () => supabase.from("recommendations").insert([{
      id: "test-rec-verify",
      survey_id: "survey-1",
      risk_level: "Stable",
      recommendation_text: "Verification recommendation text",
      habitat_restoration_suggestions: ["Restoration 1"],
      monitoring_suggestions: ["Monitoring 1"]
    }]),
    updateQuery: () => supabase.from("recommendations").update({ recommendation_text: "Verification recommendation text updated" }).eq("id", "test-rec-verify"),
    deleteQuery: () => supabase.from("recommendations").delete().eq("id", "test-rec-verify")
  });

  // 8. NOTIFICATIONS
  await runTableTest({
    table: "notifications",
    selectQuery: () => supabase.from("notifications").select("*"),
    insertQuery: () => supabase.from("notifications").insert([{
      id: "test-notif-verify",
      type: "System Notification",
      title: "Verify Notification",
      message: "Verification message",
      read: false
    }]),
    updateQuery: () => supabase.from("notifications").update({ read: true }).eq("id", "test-notif-verify"),
    deleteQuery: () => supabase.from("notifications").delete().eq("id", "test-notif-verify")
  });

  // 9. AUDIT LOGS
  await runTableTest({
    table: "audit_logs",
    selectQuery: () => supabase.from("audit_logs").select("*"),
    insertQuery: () => supabase.from("audit_logs").insert([{
      id: "test-log-verify",
      user_id: "u-1",
      user_name: "Dr. Elena Rostova",
      user_role: "Researcher",
      action: "VERIFICATION",
      details: "Verification test log entry"
    }]),
    updateQuery: () => supabase.from("audit_logs").update({ details: "Verification test log entry updated" }).eq("id", "test-log-verify"),
    deleteQuery: () => supabase.from("audit_logs").delete().eq("id", "test-log-verify")
  });

  printReport();
}

async function runTableTest(params: {
  table: string;
  selectQuery: () => any;
  insertQuery: () => any;
  updateQuery: () => any;
  deleteQuery: () => any;
}) {
  console.log(`Testing table: [${params.table}]`);
  const result: TestResult = {
    table: params.table,
    select: "FAIL",
    insert: "FAIL",
    update: "FAIL",
    delete: "FAIL"
  };

  try {
    // 1. SELECT TEST
    const selectRes = await params.selectQuery();
    if (selectRes.error) {
      throw new Error(`SELECT Error: ${selectRes.error.message} (Code: ${selectRes.error.code})`);
    }
    result.select = "PASS";

    // Clean up any residual record from previous failed test if present
    await params.deleteQuery();

    // 2. INSERT TEST
    const insertRes = await params.insertQuery();
    if (insertRes.error) {
      throw new Error(`INSERT Error: ${insertRes.error.message} (Code: ${insertRes.error.code})`);
    }
    result.insert = "PASS";

    // 3. UPDATE TEST
    const updateRes = await params.updateQuery();
    if (updateRes.error) {
      throw new Error(`UPDATE Error: ${updateRes.error.message} (Code: ${updateRes.error.code})`);
    }
    result.update = "PASS";

    // 4. DELETE TEST
    const deleteRes = await params.deleteQuery();
    if (deleteRes.error) {
      throw new Error(`DELETE Error: ${deleteRes.error.message} (Code: ${deleteRes.error.code})`);
    }
    result.delete = "PASS";

    console.log(`  -> SELECT: PASS | INSERT: PASS | UPDATE: PASS | DELETE: PASS`);
  } catch (err: any) {
    console.error(`  -> ❌ FAILED: ${err.message}`);
    result.error = err.message;
  }

  results.push(result);
}

function printReport() {
  console.log("\n=========================================");
  console.log("       VERIFICATION REPORT REPORT");
  console.log("=========================================\n");

  console.log("| Table | SELECT | INSERT | UPDATE | DELETE | Status |");
  console.log("|-------|--------|--------|--------|--------|--------|");
  
  let allPass = true;
  for (const r of results) {
    const passed = r.select === "PASS" && r.insert === "PASS" && r.update === "PASS" && r.delete === "PASS";
    if (!passed) allPass = false;
    const status = passed ? "🟢 PASS" : "🔴 FAIL";
    console.log(`| ${r.table.padEnd(20)} | ${r.select.padEnd(6)} | ${r.insert.padEnd(6)} | ${r.update.padEnd(6)} | ${r.delete.padEnd(6)} | ${status} |`);
    if (r.error) {
      console.log(`   └─ Error: ${r.error}`);
    }
  }

  console.log("\n=========================================");
  if (allPass) {
    console.log("🟢 OVERALL STATUS: ALL CRUD OPERATIONS PASSED");
  } else {
    console.log("🔴 OVERALL STATUS: SOME OPERATIONS FAILED");
  }
  console.log("=========================================\n");
}

runTest();
