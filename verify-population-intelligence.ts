import { calculatePopulationEstimates, getPopulationTrends, getSpeciesPopulationEstimate } from "./server/population-estimator.js";
import { calculateHabitatAssessments, getAllHabitatAssessments } from "./server/habitat-intelligence.js";
import { generateConservationRecommendations, getConservationRecommendations, updateRecommendationStatus } from "./server/conservation-engine.js";
import { calculateEcosystemHealthReports, getEcosystemHealthReports } from "./server/ecosystem-health.js";
import { db } from "./server/db.js";

async function runVerificationSuite() {
  console.log("\n========================================================");
  console.log("   WILDLIFE POPULATION INTELLIGENCE VERIFICATION SUITE   ");
  console.log("========================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ [PASS] ${testName}`);
      if (detail) console.log(`      ↳ ${detail}`);
    } else {
      console.log(`  ✗ [FAIL] ${testName}`);
      if (detail) console.log(`      ↳ ERROR: ${detail}`);
    }
  }

  try {
    // 1. Population Estimator Engine Tests
    console.log("--- MODULE 1: POPULATION ESTIMATION ENGINE ---");
    const popEstimates = await calculatePopulationEstimates();
    assert(Array.isArray(popEstimates) && popEstimates.length > 0, "Population Calculation", `Generated ${popEstimates.length} species & site population estimates`);

    const trends = await getPopulationTrends();
    assert(trends.totalEstimatedPopulation > 0, "Population Trends Aggregation", `Total population: ${trends.totalEstimatedPopulation}, Avg growth rate: ${trends.avgGrowthRate}%`);
    assert(Array.isArray(trends.monthlyTimeline) && trends.monthlyTimeline.length > 0, "Monthly Timeline Projection", `Generated ${trends.monthlyTimeline.length} timeline months`);

    const speciesList = await db.getSpecies();
    if (speciesList.length > 0) {
      const spEst = await getSpeciesPopulationEstimate(speciesList[0].id);
      assert(spEst !== null && spEst.estimatedPopulation > 0, "Single Species Population Retrieval", `${spEst?.speciesCommonName}: ${spEst?.estimatedPopulation} individuals, confidence ${spEst?.estimationConfidence}%`);
    }

    // 2. Habitat Intelligence Tests
    console.log("\n--- MODULE 2: HABITAT INTELLIGENCE ENGINE ---");
    const habAssessments = await calculateHabitatAssessments();
    assert(Array.isArray(habAssessments) && habAssessments.length > 0, "Habitat Assessments Calculation", `Evaluated ${habAssessments.length} monitoring sites`);

    const sampleHab = habAssessments[0];
    assert(sampleHab.habitatSuitability >= 0 && sampleHab.habitatSuitability <= 100, "Habitat Suitability Index Bounds", `${sampleHab.monitoringSiteName} suitability: ${sampleHab.habitatSuitability}/100`);
    assert(typeof sampleHab.habitatClassification === "string" && sampleHab.habitatClassification.length > 0, "Habitat Classification", `Classification: ${sampleHab.habitatClassification}`);

    // 3. Conservation Recommendation Engine Tests
    console.log("\n--- MODULE 3: CONSERVATION RECOMMENDATION ENGINE ---");
    const recs = await generateConservationRecommendations();
    assert(Array.isArray(recs) && recs.length > 0, "Recommendation Generation", `Generated ${recs.length} actionable conservation recommendations`);

    const criticalRec = recs.find(r => r.priorityLevel === "Critical" || r.riskLevel === "Critical");
    assert(criticalRec !== undefined, "Critical Recommendation Rules Trigger", `Found critical recommendation: "${criticalRec?.recommendationCategory}"`);

    if (recs.length > 0) {
      const targetId = recs[0].id;
      const updated = await updateRecommendationStatus(targetId, "approved");
      assert(updated !== null && updated.status === "approved", "Recommendation Status Workflow Update", `Updated status to 'approved' for ${targetId}`);
    }

    // 4. Ecosystem Health Analytics Tests
    console.log("\n--- MODULE 4: ECOSYSTEM HEALTH ANALYTICS ---");
    const ecoReports = await calculateEcosystemHealthReports();
    assert(Array.isArray(ecoReports) && ecoReports.length > 0, "Ecosystem Health Calculation", `Generated ${ecoReports.length} ecosystem health reports`);

    const sampleEco = ecoReports[0];
    assert(sampleEco.overallHealthScore >= 0 && sampleEco.overallHealthScore <= 100, "Ecosystem Health Index Bounds", `${sampleEco.monitoringSiteName} health score: ${sampleEco.overallHealthScore}/100 (${sampleEco.healthCategory})`);
    assert(["Excellent", "Good", "Moderate", "Poor", "Critical"].includes(sampleEco.healthCategory), "Health Category Bounds Check", `Category: ${sampleEco.healthCategory}`);

    // Summary
    console.log("\n========================================================");
    console.log(`   VERIFICATION RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)   `);
    console.log("========================================================\n");

    if (passedTests === totalTests) {
      console.log("SUCCESS: All Milestone 3 backend engines and algorithms verified! PASS\n");
      process.exit(0);
    } else {
      console.error("FAIL: Some verification tests failed.\n");
      process.exit(1);
    }
  } catch (err: any) {
    console.error("\nFATAL UNHANDLED ERROR IN VERIFICATION SUITE:", err);
    process.exit(1);
  }
}

runVerificationSuite();
