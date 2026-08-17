import dotenv from "dotenv";
dotenv.config();

import fetch from "node-fetch";

async function runFeatureVerification() {
  console.log("=================================================");
  console.log("   WILDLIFE POPULATION INTELLIGENCE AI TEST SUITE ");
  console.log("=================================================");

  const baseUrl = "http://localhost:3000";
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(` [PASS] ${testName}`);
      passCount++;
    } else {
      console.log(`❌ [FAIL] ${testName}`);
      failCount++;
    }
  }

  try {
    // 1. Authenticate user via registration or login
    console.log("\n--- Phase 1: Authentication ---");
    let token = "";
    
    // Register test user
    const testEmail = `bioacoustic.tester.${Date.now()}@wildlife.gov`;
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. Bioacoustic Tester",
        email: testEmail,
        password: "securePassword123!",
        organization: "Bioacoustic Science Institute",
        department: "Acoustic Intelligence",
        country: "Tanzania",
        role: "Wildlife Researcher"
      })
    });

    if (regRes.ok) {
      const regData: any = await regRes.json();
      token = regData.token;
      assert(true, "User registration succeeds");
      assert(!!token, "Received valid JWT auth token from registration");
    } else {
      // Fallback login
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "elena.r@wildlife.gov", password: "password123!" })
      });
      const loginData: any = await loginRes.json();
      token = loginData.token;
      assert(loginRes.ok, "User login succeeds");
    }

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    // 2. Feature 1: Wildlife Audio Analysis
    console.log("\n--- Phase 2: Audio Analysis & Storage ---");
    // Synthetic audio base64 (small WAV header)
    const dummyAudioBase64 = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

    const audioAnalyzeRes = await fetch(`${baseUrl}/api/audio/analyze`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        surveyId: "survey-1",
        siteId: "site-1",
        fileName: "test_african_lion_roar.wav",
        audioUri: dummyAudioBase64,
        mimeType: "audio/wav"
      })
    });

    assert(audioAnalyzeRes.ok, "POST /api/audio/analyze endpoint returns 200 OK");
    const audioResult: any = await audioAnalyzeRes.json();

    assert(!!audioResult.id, "Saved audio record has valid ID");
    assert(!!audioResult.speciesCommonName, `Identified Common Name: ${audioResult.speciesCommonName}`);
    assert(!!audioResult.speciesScientificName, `Identified Scientific Name: ${audioResult.speciesScientificName}`);
    assert(typeof audioResult.confidence === "number" && audioResult.confidence > 0, `Confidence Score: ${(audioResult.confidence * 100).toFixed(1)}%`);
    assert(Array.isArray(audioResult.waveformData) && audioResult.waveformData.length > 0, "Waveform data array generated for visualizer");

    // 3. Feature 2: IUCN Species Conservation Classification
    console.log("\n--- Phase 3: Conservation Classification ---");
    assert(!!audioResult.iucnStatus, `IUCN Status assigned: ${audioResult.iucnStatus}`);
    assert(!!audioResult.threatLevel, `Threat Level evaluated: ${audioResult.threatLevel}`);
    assert(!!audioResult.populationTrend, `Population Trend determined: ${audioResult.populationTrend}`);

    // 4. Feature 3: Confidence Score & Quality Level
    console.log("\n--- Phase 4: Model Confidence Rating ---");
    assert(["Very High", "High", "Medium", "Low"].includes(audioResult.predictionQuality), `Prediction Quality Rating: ${audioResult.predictionQuality}`);

    // 5. Feature 4: AI Explanation & Acoustic Notes
    console.log("\n--- Phase 5: AI Explanation Engine ---");
    assert(!!audioResult.aiExplanation, "AI Explanation object is present");
    assert(!!audioResult.aiExplanation?.whySelected, "aiExplanation.whySelected is populated");
    assert(!!audioResult.aiExplanation?.distinctFeatures, "aiExplanation.distinctFeatures is populated");
    assert(!!audioResult.aiExplanation?.behavior, "aiExplanation.behavior is populated");
    assert(!!audioResult.aiExplanation?.similarSpecies, "aiExplanation.similarSpecies is populated");
    assert(!!audioResult.aiExplanation?.reasonForConfidence, "aiExplanation.reasonForConfidence is populated");

    // 6. Fetch Audio History List
    console.log("\n--- Phase 6: Audio History Retrieval ---");
    const getAudioRes = await fetch(`${baseUrl}/api/audio`, { headers });
    assert(getAudioRes.ok, "GET /api/audio endpoint returns 200 OK");
    const audioList: any = await getAudioRes.json();
    assert(Array.isArray(audioList) && audioList.length > 0, `Retrieved ${audioList.length} audio history records from PostgreSQL`);

    // 7. Feature 5: Dashboard Analytics
    console.log("\n--- Phase 7: Dashboard Analytics Integration ---");
    const dashRes = await fetch(`${baseUrl}/api/analytics/dashboard`, { headers });
    assert(dashRes.ok, "GET /api/analytics/dashboard returns 200 OK");
    const dashData: any = await dashRes.json();

    assert(typeof dashData.kpis.totalAudioAnalyses === "number", `Dashboard tracks total audio analyses: ${dashData.kpis.totalAudioAnalyses}`);
    assert(typeof dashData.kpis.threatenedSpeciesCount === "number", `Dashboard tracks threatened species: ${dashData.kpis.threatenedSpeciesCount}`);
    assert(!!dashData.confidenceMetrics, "Dashboard includes confidence score metrics");

  } catch (err: any) {
    console.error("Test error:", err);
    assert(false, `Unexpected exception: ${err.message}`);
  }

  console.log("\n=================================================");
  console.log(`   TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("=================================================");

  if (failCount === 0) {
    console.log("\n🎉 ALL AI POPULATION INTELLIGENCE FEATURES PASSED VERIFICATION!");
    process.exit(0);
  } else {
    console.error("\n❌ VERIFICATION FAILED");
    process.exit(1);
  }
}

runFeatureVerification();
