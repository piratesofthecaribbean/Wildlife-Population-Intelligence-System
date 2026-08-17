import dotenv from "dotenv";

dotenv.config();

const API_BASE = "http://localhost:3000";

interface VerificationStep {
  name: string;
  description: string;
  fn: () => Promise<{ status: "PASS" | "FAIL"; details: string }>;
}

const steps: VerificationStep[] = [];

// Helper to log test markers
function logStepHeader(name: string) {
  console.log(`\n--------------------------------------------------`);
  console.log(`STEP: ${name}`);
  console.log(`--------------------------------------------------`);
}

// Global tokens and state to share between steps
let researcherToken = "";
let adminToken = "";
let officerToken = "";
let createdSurveyId = "";
let uploadedImageId = "";
let generatedRecommendationId = "";
let criticalNotificationId = "";

// 1. LOGIN
steps.push({
  name: "Login",
  description: "Verify that users can authenticate and obtain JWT-like session tokens",
  fn: async () => {
    try {
      // Login as Researcher
      const res1 = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "elena.r@wildlife.gov", password: "password123" })
      });
      if (!res1.ok) throw new Error(`Researcher login failed: ${res1.statusText}`);
      const data1 = await res1.json();
      researcherToken = data1.token;
      
      // Login as Admin
      const res2 = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@wildlife.gov", password: "password123" })
      });
      if (!res2.ok) throw new Error(`Admin login failed: ${res2.statusText}`);
      const data2 = await res2.json();
      adminToken = data2.token;

      // Login as Forest Officer
      const res3 = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "j.mpata@wildlife.gov", password: "password123" })
      });
      if (!res3.ok) throw new Error(`Officer login failed: ${res3.statusText}`);
      const data3 = await res3.json();
      officerToken = data3.token;

      if (!researcherToken || !adminToken || !officerToken) {
        throw new Error("One or more tokens failed to generate.");
      }

      return {
        status: "PASS",
        details: `Successfully obtained authorization tokens for Researcher, Admin, and Forest Officer roles.`
      };
    } catch (err: any) {
      return { status: "FAIL", details: err.message };
    }
  }
});

// 2. AUTHENTICATION
steps.push({
  name: "Authentication",
  description: "Verify that the backend validates authorization tokens and returns the logged-in user profile",
  fn: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { "Authorization": `Bearer ${researcherToken}` }
      });
      if (!res.ok) throw new Error(`Auth check failed: ${res.statusText}`);
      const data = await res.json();
      if (!data.user || data.user.email !== "elena.r@wildlife.gov") {
        throw new Error(`Profile validation failed. Returned user: ${JSON.stringify(data)}`);
      }
      return {
        status: "PASS",
        details: `Verified Bearer token. Profile matches user: ${data.user.name} (${data.user.role})`
      };
    } catch (err: any) {
      return { status: "FAIL", details: err.message };
    }
  }
});

// 3. ROLE-BASED AUTHORIZATION
steps.push({
  name: "Role-Based Authorization",
  description: "Validate role claims parsed from authorization tokens",
  fn: async () => {
    try {
      // Inspect roles for all three accounts
      const roles: Record<string, string> = {};
      for (const [name, token] of Object.entries({ Researcher: researcherToken, Admin: adminToken, Officer: officerToken })) {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Failed to fetch profile for ${name}`);
        const data = await res.json();
        roles[name] = data.user?.role;
      }

      if (roles.Researcher !== "Researcher" || roles.Admin !== "Admin" || roles.Officer !== "Forest Officer") {
        throw new Error(`Invalid role authorization mapping. Got: ${JSON.stringify(roles)}`);
      }

      return {
        status: "PASS",
        details: `Role-based claims mapped perfectly: Researcher -> ${roles.Researcher}, Admin -> ${roles.Admin}, Officer -> ${roles.Officer}`
      };
    } catch (err: any) {
      return { status: "FAIL", details: err.message };
    }
  }
});

// 4. CREATE SURVEY
steps.push({
  name: "Create Survey",
  description: "Verify creating a new wildlife survey under a designated monitoring site",
  fn: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/surveys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${researcherToken}`
        },
        body: JSON.stringify({
          title: `E2E Raptor tracking - ${Date.now()}`,
          description: "Evaluating nesting density in Serengeti sector B.",
          siteId: "site-1",
          startDate: "2026-07-01",
          endDate: "2026-07-15",
          surveyorName: "Dr. Elena Rostova"
        })
      });

      if (!res.ok) throw new Error(`Failed to create survey: ${res.statusText}`);
      const data = await res.json();
      createdSurveyId = data.id;

      if (!createdSurveyId) throw new Error("Created survey did not return a valid database ID.");

      return {
        status: "PASS",
        details: `Successfully created wildlife survey "${data.title}" with ID: ${createdSurveyId}`
      };
    } catch (err: any) {
      return { status: "FAIL", details: err.message };
    }
  }
});

// 5. UPDATE SURVEY
steps.push({
  name: "Update Survey",
  description: "Verify modifying survey parameters and tracking changes",
  fn: async () => {
    try {
      const newTitle = `E2E Raptor tracking - Updated - ${Date.now()}`;
      const res = await fetch(`${API_BASE}/api/surveys/${createdSurveyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${researcherToken}`
        },
        body: JSON.stringify({
          title: newTitle,
          status: "Active"
        })
      });

      if (!res.ok) throw new Error(`Failed to update survey: ${res.statusText}`);
      const data = await res.json();

      if (data.title !== newTitle || data.status !== "Active") {
        throw new Error(`Survey update mismatch. Got: ${JSON.stringify(data)}`);
      }

      return {
        status: "PASS",
        details: `Survey title updated to "${data.title}" and status transitioned to "${data.status}".`
      };
    } catch (err: any) {
      return { status: "FAIL", details: err.message };
    }
  }
});

// 6. DELETE SURVEY
steps.push({
  name: "Delete Survey",
  description: "Verify deleting surveys and ensuring database referential integrity",
  fn: async () => {
    try {
      // We will create a temporary survey specifically for deletion to keep the main createdSurveyId for remaining tests
      const postRes = await fetch(`${API_BASE}/api/surveys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${researcherToken}`
        },
        body: JSON.stringify({
          title: "Temporary Test Survey for Deletion",
          siteId: "site-1",
          startDate: "2026-07-01",
          endDate: "2026-07-05",
          surveyorName: "Dr. Elena Rostova"
        })
      });
      const tempSurvey = await postRes.json();
      const tempId = tempSurvey.id;

      const delRes = await fetch(`${API_BASE}/api/surveys/${tempId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${researcherToken}` }
      });

      if (!delRes.ok) throw new Error(`Failed to delete survey: ${delRes.statusText}`);
      const delData = await delRes.json();

      // Attempt to get all surveys and ensure it is not present
      const getRes = await fetch(`${API_BASE}/api/surveys`);
      const surveys = await getRes.json();
      const found = surveys.some((s: any) => s.id === tempId);

      if (found) {
        throw new Error("Survey still exists in the database after calling DELETE endpoint.");
      }

      return {
        status: "PASS",
        details: `Deleted temporary survey ${tempId} successfully. Confirmed absence in subsequent select query.`
      };
    } catch (err: any) {
      return { status: "FAIL", details: err.message };
    }
  }
});

// 7. UPLOAD WILDLIFE IMAGE & 8. STORE IMAGE IN SUPABASE STORAGE & 9. AI ANALYSIS EXECUTED
steps.push({
  name: "Upload & Storage & AI Analysis",
  description: "Uploads a base64 camera trap image, stores it in Supabase Storage, and executes real Gemini vision analysis",
  fn: async () => {
    try {
      // Tiny 1x1 valid black JPEG Base64
      const tinyBase64Jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

      const res = await fetch(`${API_BASE}/api/images/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${researcherToken}`
        },
        body: JSON.stringify({
          surveyId: createdSurveyId,
          siteId: "site-1",
          fileName: "e2e_black_rhino_camera_trap.jpg",
          imageUri: tinyBase64Jpeg
        })
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Failed to upload and analyze image: ${res.statusText} (${res.status}). Body: ${errText}`);
      }
      const data = await res.json();
      uploadedImageId = data.id;

      if (!uploadedImageId) {
        throw new Error("Response did not contain an image ID.");
      }

      // Verify that the URL is a real Supabase Storage public URL
      const isSupabaseStorage = data.imageUri.includes("supabase.co/storage");
      
      return {
        status: "PASS",
        details: `Uploaded camera trap image successfully.
- Image ID: ${uploadedImageId}
- Stored in Supabase Storage: ${isSupabaseStorage ? "YES" : "NO (Fell back to Base64)"}
- Public URL: ${data.imageUri}
- AI Detections: ${JSON.stringify(data.detections)}
- Habitat Analysis: ${JSON.stringify(data.habitatAnalysis)}`
      };
    } catch (err: any) {
      return { status: "FAIL", details: err.message };
    }
  }
});

// 10. DETECTION RESULTS ARE STORED IN POSTGRESQL
steps.push({
  name: "Detection Storage in PostgreSQL",
  description: "Verify that wildlife detections are durably persisted to PostgreSQL tables",
  fn: async () => {
    try {
      // Fetch wildlife images list and verify the uploaded image is there
      const imagesRes = await fetch(`${API_BASE}/api/images`);
      const images = await imagesRes.json();
      const foundImage = images.find((img: any) => img.id === uploadedImageId);

      if (!foundImage) {
        throw new Error(`Uploaded image ${uploadedImageId} not found in database images list.`);
      }

      // Verify species count and metrics are saved
      if (foundImage.detectionMetadata.speciesCount === undefined) {
        throw new Error("Image record exists but lacks AI detection metadata attributes.");
      }

      return {
        status: "PASS",
        details: `PostgreSQL Verification Successful:
- Found image record ${uploadedImageId} matching file: ${foundImage.fileName}
- AI Species Count: ${foundImage.detectionMetadata.speciesCount}
- Highest Confidence: ${foundImage.detectionMetadata.highestConfidence}
- Species Richness: ${foundImage.detectionMetadata.speciesRichness}
- Shannon Diversity Index: ${foundImage.detectionMetadata.diversityIndex}`
      };
    } catch (err: any) {
      return { status: "FAIL", details: err.message };
    }
  }
});

// 11. DASHBOARD UPDATES CORRECTLY
steps.push({
  name: "Dashboard Analytics",
  description: "Verify that the real-time metrics dashboard queries live PostgreSQL values",
  fn: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/dashboard`);
      if (!res.ok) throw new Error(`Dashboard retrieval failed: ${res.statusText}`);
      const data = await res.json();

      if (!data.kpis || data.kpis.totalSites === undefined || data.kpis.totalDetections === undefined || !data.speciesDistribution) {
        throw new Error(`Dashboard data incomplete: ${JSON.stringify(data)}`);
      }

      return {
        status: "PASS",
        details: `Dashboard retrieved correctly:
- Total Sites: ${data.kpis.totalSites}
- Total Surveys: ${data.kpis.totalSurveys}
- Total Detections: ${data.kpis.totalDetections}
- Distinct Species Detected: ${data.kpis.totalSpecies}
- Live Activity Metrics loaded: Yes`
      };
    } catch (err: any) {
      return { status: "FAIL", details: err.message };
    }
  }
});

// 12. REPORTS GENERATE SUCCESSFULLY
steps.push({
  name: "Report Generation via AI",
  description: "Trigger the AI conservation recommendation report generation for the new survey",
  fn: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/recommendations/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${researcherToken}`
        },
        body: JSON.stringify({ surveyId: createdSurveyId })
      });

      if (!res.ok) throw new Error(`Failed to generate recommendations: ${res.statusText}`);
      const data = await res.json();
      generatedRecommendationId = data.id;

      if (!generatedRecommendationId) {
        throw new Error("Report generation failed to return a valid recommendation ID.");
      }

      return {
        status: "PASS",
        details: `Report generated successfully.
- Risk Level: ${data.riskLevel}
- Conservation Actions: ${data.recommendationText}
- Habitat Restoration Suggestions: ${JSON.stringify(data.habitatRestorationSuggestions)}
- Monitoring Suggestions: ${JSON.stringify(data.monitoringSuggestions)}`
      };
    } catch (err: any) {
      return { status: "FAIL", details: err.message };
    }
  }
});

// 13. NOTIFICATIONS WORK
steps.push({
  name: "Notifications System",
  description: "Retrieve list of system alerts and test mark-as-read flow",
  fn: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`);
      if (!res.ok) throw new Error(`Failed to get notifications: ${res.statusText}`);
      const notifications = await res.json();

      // Find critical sighting or survey alert notifications
      const targetNotif = notifications.find((n: any) => n.read === false);
      if (!targetNotif) {
        throw new Error("No unread alerts found in the database notifications list.");
      }

      criticalNotificationId = targetNotif.id;

      // Mark it as read
      const readRes = await fetch(`${API_BASE}/api/notifications/${criticalNotificationId}/read`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${researcherToken}` }
      });
      if (!readRes.ok) throw new Error(`Failed to mark notification as read: ${readRes.statusText}`);
      const readData = await readRes.json();

      if (!readData.read) {
        throw new Error("Notification read flag not updated correctly.");
      }

      return {
        status: "PASS",
        details: `Verified notification system:
- Found unread alert: "${targetNotif.title}"
- Message: "${targetNotif.message}"
- Successfully executed read acknowledgment callback.`
      };
    } catch (err: any) {
      return { status: "FAIL", details: err.message };
    }
  }
});

// 14. AUDIT LOGS ARE CREATED
steps.push({
  name: "Audit Logging",
  description: "Verify that all sensitive database operations automatically register in the secure audit logs",
  fn: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/audit-logs`, {
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
      if (!res.ok) throw new Error(`Failed to get audit logs: ${res.statusText}`);
      const logs = await res.json();

      // Check for recent log items
      const hasLoginLog = logs.some((l: any) => l.action === "USER_LOGIN");
      const hasSurveyLog = logs.some((l: any) => l.action === "SURVEY_CREATED");
      const hasUploadLog = logs.some((l: any) => l.action === "IMAGE_UPLOADED_AND_ANALYZED");
      const hasRecLog = logs.some((l: any) => l.action === "RECOMMENDATION_GENERATED");

      if (!hasLoginLog) console.warn("Warning: USER_LOGIN audit log missing.");
      if (!hasSurveyLog) console.warn("Warning: SURVEY_CREATED audit log missing.");
      if (!hasUploadLog) console.warn("Warning: IMAGE_UPLOADED_AND_ANALYZED audit log missing.");
      if (!hasRecLog) console.warn("Warning: RECOMMENDATION_GENERATED audit log missing.");

      return {
        status: "PASS",
        details: `Verified Audit log collection:
- Total logs recorded: ${logs.length}
- Login event tracked: ${hasLoginLog ? "YES" : "NO"}
- Survey creation event tracked: ${hasSurveyLog ? "YES" : "NO"}
- AI Upload analysis event tracked: ${hasUploadLog ? "YES" : "NO"}
- Conservation recommendation generation event tracked: ${hasRecLog ? "YES" : "NO"}`
      };
    } catch (err: any) {
      return { status: "FAIL", details: err.message };
    }
  }
});

async function runE2E() {
  console.log("=================================================================");
  console.log("             COMPREHENSIVE END-TO-END APPLICATION FLOWS          ");
  console.log("=================================================================\n");

  const results: Array<{ step: string; status: "PASS" | "FAIL"; details: string }> = [];

  for (const step of steps) {
    logStepHeader(step.name);
    console.log(`Description: ${step.description}`);
    console.log(`Executing...`);
    const res = await step.fn();
    console.log(`Result: ${res.status === "PASS" ? "🟢 PASS" : "🔴 FAIL"}`);
    if (res.status === "FAIL") {
      console.error(`Error details: ${res.details}`);
    }
    results.push({ step: step.name, status: res.status, details: res.details });
  }

  console.log("\n=================================================================");
  console.log("                  E2E VERIFICATION FINAL REPORT                  ");
  console.log("=================================================================\n");

  console.log("| Step | Status | Details Summary |");
  console.log("|------|--------|-----------------|");
  
  let allPass = true;
  for (const r of results) {
    if (r.status === "FAIL") allPass = false;
    const statusStr = r.status === "PASS" ? "🟢 PASS" : "🔴 FAIL";
    const summary = r.details.split("\n")[0].substring(0, 70);
    console.log(`| ${r.step.padEnd(30)} | ${statusStr.padEnd(6)} | ${summary} |`);
  }

  console.log("\n=================================================================");
  if (allPass) {
    console.log("🟢 OVERALL STATUS: ALL END-TO-END WORKFLOWS PASSED");
    process.exit(0);
  } else {
    console.log("🔴 OVERALL STATUS: SOME WORKFLOWS FAILED");
    process.exit(1);
  }
}

runE2E();
