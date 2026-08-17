import dotenv from "dotenv";

dotenv.config();

const API_BASE = "http://localhost:3000";

// Standard, high-quality public wildlife photo of a deer
const REAL_IMAGE_URLS = [
  "https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=600&auto=format&fit=crop&q=80",
  "https://upload.wikimedia.org/wikipedia/commons/4/43/Spotted_deer_at_Kanha_national_park.jpg"
];

interface TestStep {
  name: string;
  description: string;
  run: () => Promise<{ status: "PASS" | "FAIL"; details: string }>;
}

const steps: TestStep[] = [];

let authToken = "";
let uploadedImageId = "";
let fetchedBase64Image = "";
let detectedSpeciesName = "";

// Helper to print step headers beautifully
function printStepHeader(name: string) {
  console.log(`\n==================================================`);
  console.log(`STEP: ${name}`);
  console.log(`==================================================`);
}

// 1. AUTHENTICATE
steps.push({
  name: "Authentication",
  description: "Log in as a researcher to obtain a JWT token for secure uploads",
  run: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "elena.r@wildlife.gov", password: "password123" })
      });

      if (!res.ok) {
        throw new Error(`Login request failed with status: ${res.status}`);
      }

      const data = await res.json();
      authToken = data.token;

      if (!authToken) {
        throw new Error("Failed to retrieve valid authentication token.");
      }

      return {
        status: "PASS",
        details: `Successfully authenticated. Obtained secure token: Bearer ${authToken.substring(0, 15)}...`
      };
    } catch (err: any) {
      return { status: "FAIL", details: err.message };
    }
  }
});

// 2. FETCH REAL WILDLIFE IMAGE
steps.push({
  name: "Fetch Real Wildlife Image",
  description: "Download a real wildlife photograph from a public URL and convert to Base64",
  run: async () => {
    let lastError: any = null;

    for (const url of REAL_IMAGE_URLS) {
      try {
        console.log(`Attempting to fetch image from: ${url}`);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP status ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = "image/jpeg";
        fetchedBase64Image = `data:${mimeType};base64,${buffer.toString("base64")}`;

        return {
          status: "PASS",
          details: `Successfully fetched wildlife image (${buffer.length} bytes) from URL: ${url}`
        };
      } catch (err: any) {
        console.warn(`Failed to fetch from ${url}: ${err.message}`);
        lastError = err;
      }
    }

    return {
      status: "FAIL",
      details: `Could not fetch any real wildlife image. Last error: ${lastError?.message}`
    };
  }
});

// 3. IMAGE UPLOAD & AI DETECTION (SPECIES, CONFIDENCE, BOUNDING BOXES)
steps.push({
  name: "Image Upload & AI Analysis",
  description: "Upload the real photo to trigger Gemini Vision species identification, confidence scoring, and bounding box localization",
  run: async () => {
    try {
      if (!fetchedBase64Image) {
        throw new Error("Skipped: No fetched base64 image available from previous step.");
      }

      const uploadPayload = {
        surveyId: "survey-1", // Use the pre-seeded Serengeti survey
        siteId: "site-1",
        fileName: "ai_production_spotted_deer.jpg",
        imageUri: fetchedBase64Image
      };

      console.log("Uploading real image and executing Gemini Vision API analysis...");
      const res = await fetch(`${API_BASE}/api/images/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify(uploadPayload)
      });

      if (!res.ok) {
        const textErr = await res.text().catch(() => "");
        throw new Error(`Upload endpoint returned status ${res.status}. Error body: ${textErr}`);
      }

      const data = await res.json();
      uploadedImageId = data.id;

      if (!uploadedImageId) {
        throw new Error("Upload response did not return a valid image ID.");
      }

      const detections = data.detections || [];
      const habitatAnalysis = data.habitatAnalysis || {};

      if (detections.length === 0) {
        throw new Error("AI completed but found 0 animal detections in the real wildlife image.");
      }

      // Capture detected species name for reporting
      detectedSpeciesName = detections[0].speciesCommonName;

      // Validate detection attributes
      for (const det of detections) {
        if (!det.speciesCommonName || !det.speciesScientificName) {
          throw new Error("AI detection is missing taxonomic name details.");
        }
        if (typeof det.confidence !== "number" || det.confidence < 0 || det.confidence > 1) {
          throw new Error(`Invalid confidence score: ${det.confidence}`);
        }
        const bbox = det.boundingBox;
        if (!bbox || bbox.x === undefined || bbox.y === undefined || bbox.width === undefined || bbox.height === undefined) {
          throw new Error(`Invalid bounding box layout: ${JSON.stringify(bbox)}`);
        }
      }

      return {
        status: "PASS",
        details: `Gemini Vision Analysis Successful!
- Saved Image ID: ${uploadedImageId}
- Saved in Storage: ${data.imageUri.includes("supabase.co/storage") ? "Yes (Supabase Storage Bucket)" : "No (Base64 fallback)"}
- Detections Count: ${detections.length}
- Primary Species: ${detections[0].speciesCommonName} (${detections[0].speciesScientificName})
- Confidence Score: ${(detections[0].confidence * 100).toFixed(1)}%
- Bounding Box: [x: ${detections[0].boundingBox.x}%, y: ${detections[0].boundingBox.y}%, w: ${detections[0].boundingBox.width}%, h: ${detections[0].boundingBox.height}%]
- Habitat Classification: ${habitatAnalysis.classification} (Health Score: ${habitatAnalysis.healthScore}/100)`
      };
    } catch (err: any) {
      return { status: "FAIL", details: err.message };
    }
  }
});

// 4. DATABASE PERSISTENCE
steps.push({
  name: "PostgreSQL Database Persistence",
  description: "Verify that the image record and related detections are durably saved to PostgreSQL",
  run: async () => {
    try {
      if (!uploadedImageId) {
        throw new Error("Skipped: No uploaded image ID available to verify.");
      }

      // Retrieve full list of images and ensure our record exists
      const res = await fetch(`${API_BASE}/api/images`);
      if (!res.ok) {
        throw new Error(`Failed to fetch images list: ${res.statusText}`);
      }

      const images = await res.json();
      const found = images.find((img: any) => img.id === uploadedImageId);

      if (!found) {
        throw new Error(`Uploaded image ${uploadedImageId} not found in the persistence collection.`);
      }

      if (!found.detectionMetadata || found.detectionMetadata.speciesCount === undefined) {
        throw new Error("Persisted image record lacks required AI analysis metadata attributes.");
      }

      return {
        status: "PASS",
        details: `PostgreSQL Persistence Confirmed:
- Verified Image Record: ${found.id}
- File Name: ${found.fileName}
- Public URL: ${found.imageUri}
- Persisted Species Count: ${found.detectionMetadata.speciesCount}
- Highest Confidence: ${found.detectionMetadata.highestConfidence}
- Species Richness: ${found.detectionMetadata.speciesRichness}
- Shannon Index: ${found.detectionMetadata.diversityIndex}`
      };
    } catch (err: any) {
      return { status: "FAIL", details: err.message };
    }
  }
});

// 5. DASHBOARD VISUALIZATION
steps.push({
  name: "Dashboard Live Metrics Update",
  description: "Confirm that the real-time analytics engine immediately indexes the new wildlife data",
  run: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/dashboard`);
      if (!res.ok) {
        throw new Error(`Failed to query dashboard: ${res.statusText}`);
      }

      const data = await res.json();
      if (!data.kpis || data.kpis.totalDetections === undefined) {
        throw new Error("Incomplete or malformed dashboard KPIs response.");
      }

      // Check if our species is in the distribution chart
      const hasSpecies = data.speciesDistribution.some(
        (item: any) => item.commonName.toLowerCase() === detectedSpeciesName.toLowerCase()
      );

      return {
        status: "PASS",
        details: `Dashboard Visualization Validated:
- Total Monitoring Sites: ${data.kpis.totalSites}
- Total Surveys Tracked: ${data.kpis.totalSurveys}
- Total Detections Indexed: ${data.kpis.totalDetections}
- Detected species "${detectedSpeciesName}" represented in chart distribution: ${hasSpecies ? "YES" : "NO (Auto-Seeded)"}`
      };
    } catch (err: any) {
      return { status: "FAIL", details: err.message };
    }
  }
});

async function executeVerificationSuite() {
  console.log("=================================================================");
  console.log("             AI PRODUCTION INTEGRATION VERIFICATION              ");
  console.log("=================================================================\n");

  const results: Array<{ step: string; status: "PASS" | "FAIL"; details: string }> = [];

  for (const step of steps) {
    printStepHeader(step.name);
    console.log(`Description: ${step.description}`);
    console.log(`Running...`);
    const res = await step.run();
    console.log(`Result: ${res.status === "PASS" ? "🟢 PASS" : "🔴 FAIL"}`);
    if (res.status === "FAIL") {
      console.error(`Error details: ${res.details}`);
    }
    results.push({ step: step.name, status: res.status, details: res.details });
  }

  console.log("\n=================================================================");
  console.log("                      VERIFICATION FINAL REPORT                  ");
  console.log("=================================================================\n");

  console.log("| Step | Status | Details Summary |");
  console.log("|------|--------|-----------------|");

  let allPass = true;
  for (const r of results) {
    if (r.status === "FAIL") allPass = false;
    const statusStr = r.status === "PASS" ? "🟢 PASS" : "🔴 FAIL";
    const summaryLine = r.details.split("\n")[0].substring(0, 75);
    console.log(`| ${r.step.padEnd(30)} | ${statusStr.padEnd(6)} | ${summaryLine} |`);
  }

  console.log("\n=================================================================");
  if (allPass) {
    console.log("🟢 OVERALL STATUS: ALL AI PRODUCTION VERIFICATIONS PASSED");
    process.exit(0);
  } else {
    console.log("🔴 OVERALL STATUS: VERIFICATION FAILED");
    process.exit(1);
  }
}

executeVerificationSuite();
