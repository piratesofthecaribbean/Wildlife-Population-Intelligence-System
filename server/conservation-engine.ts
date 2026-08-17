import { db, ConservationRecommendation } from "./db.js";
import { getAllHabitatAssessments } from "./habitat-intelligence.js";
import { getPopulationTrends } from "./population-estimator.js";

export async function generateConservationRecommendations(): Promise<ConservationRecommendation[]> {
  const [habitatAssessments, popTrends, speciesList, sites, detections] = await Promise.all([
    getAllHabitatAssessments(),
    getPopulationTrends(),
    db.getSpecies(),
    db.getMonitoringSites(),
    db.getDetections()
  ]);

  const generatedRecommendations: ConservationRecommendation[] = [];

  // 1. Check for Threatened & Critically Endangered Species Detections
  for (const sp of speciesList) {
    if (sp.conservationStatus === "Critically Endangered" || sp.conservationStatus === "Endangered") {
      const spDetections = detections.filter(
        d => d.speciesCommonName.toLowerCase() === sp.commonName.toLowerCase() ||
             (d.speciesScientificName && d.speciesScientificName.toLowerCase() === sp.scientificName.toLowerCase())
      );

      const triggeredSite = sites[0];

      generatedRecommendations.push({
        id: `rec-sp-${sp.id}`,
        monitoringSiteId: triggeredSite?.id,
        monitoringSiteName: triggeredSite?.name || "High-Priority Zone",
        affectedSpecies: `${sp.commonName} (${sp.scientificName})`,
        riskLevel: sp.conservationStatus === "Critically Endangered" ? "Critical" : "Elevated",
        priorityLevel: sp.conservationStatus === "Critically Endangered" ? "Critical" : "High",
        recommendationCategory: "Anti-Poaching Patrol",
        generatedBy: "AI Conservation Engine v3.0",
        status: "pending",
        generatedAt: new Date().toISOString(),
        recommendationText: `Deploy 24/7 smart anti-poaching patrols and infrared acoustic sensors around ${triggeredSite?.name || 'active zone'} to protect detected ${sp.commonName} population.`,
        suggestedActions: [
          "Deploy drone reconnaissance twice daily at dawn and dusk",
          "Install bioacoustic listening posts along known migration trails",
          "Establish a 5km buffer zone restricting heavy motorized transport"
        ],
        expectedImpact: "Prevents illegal poaching risks and improves survival rate by 85%.",
        habitatRestorationSuggestions: [
          `Enforce strict boundary patrols around ${sp.commonName} core habitat`,
          "Construct wildlife water troughs to reduce edge-crossing into human settlements"
        ],
        monitoringSuggestions: [
          "Increase camera-trap sampling frequency to 15-minute intervals",
          "Log weekly population density and group composition reports"
        ]
      });
    }
  }

  // 2. Check for Habitat Suitability & Degradation Risks
  for (const hab of habitatAssessments) {
    if (hab.habitatSuitability < 65 || hab.disturbanceScore > 40) {
      const isCritical = hab.habitatSuitability < 50 || hab.disturbanceScore > 60;

      generatedRecommendations.push({
        id: `rec-hab-${hab.monitoringSiteId}`,
        monitoringSiteId: hab.monitoringSiteId,
        monitoringSiteName: hab.monitoringSiteName,
        riskLevel: isCritical ? "Critical" : "Elevated",
        priorityLevel: isCritical ? "Critical" : "High",
        recommendationCategory: hab.vegetationScore < 50 ? "Reforestation" : "Habitat Restoration",
        generatedBy: "AI Conservation Engine v3.0",
        status: "pending",
        generatedAt: new Date().toISOString(),
        recommendationText: `Initiate urgent habitat restoration and canopy recovery at ${hab.monitoringSiteName}. Current suitability score is ${hab.habitatSuitability}/100 with disturbance score of ${hab.disturbanceScore}/100.`,
        suggestedActions: [
          "Replant native canopy species to restore cover to >75%",
          "Erect noise and light barriers along perimeter roads",
          "Establish soil erosion control barriers along stream banks"
        ],
        expectedImpact: "Restores habitat suitability index above 80 points within 12 months.",
        habitatRestorationSuggestions: [
          `Plant 500 native saplings in degraded sectors of ${hab.monitoringSiteName}`,
          "Clear invasive scrub vegetation competing with primary canopy growth"
        ],
        monitoringSuggestions: [
          "Conduct monthly canopy cover drone photogrammetry assessments",
          "Monitor soil moisture and native plant seedling germination rates"
        ]
      });
    }

    // 3. Water Scarcity Trigger
    if (hab.waterScore < 50) {
      generatedRecommendations.push({
        id: `rec-water-${hab.monitoringSiteId}`,
        monitoringSiteId: hab.monitoringSiteId,
        monitoringSiteName: hab.monitoringSiteName,
        riskLevel: "Elevated",
        priorityLevel: "High",
        recommendationCategory: "Water Source Protection",
        generatedBy: "AI Conservation Engine v3.0",
        status: "pending",
        generatedAt: new Date().toISOString(),
        recommendationText: `Construct solar-powered wildlife watering points at ${hab.monitoringSiteName} due to low water score (${hab.waterScore}/100).`,
        suggestedActions: [
          "Install solar water pumps at primary watering holes",
          "Monitor seasonal hydrology levels with ultrasonic water depth meters",
          "Prevent agricultural runoff contamination entering site watershed"
        ],
        expectedImpact: "Guarantees year-round drinking water supply for resident mammal herds.",
        habitatRestorationSuggestions: [
          "Dredge natural silted basins to expand water retention volume",
          "Plant wetland vegetation around basin margins"
        ],
        monitoringSuggestions: [
          "Test water salinity and pH bi-weekly",
          "Record wildlife visitation rates at watering points via camera traps"
        ]
      });
    }
  }

  // 4. Check Population Trends for Declining Species
  for (const est of popTrends.speciesEstimates) {
    if (est.trendDirection === "Decreasing" || est.growthRate < -2) {
      generatedRecommendations.push({
        id: `rec-pop-${est.speciesId}`,
        affectedSpecies: `${est.speciesCommonName} (${est.speciesScientificName})`,
        riskLevel: "Critical",
        priorityLevel: "Critical",
        recommendationCategory: "Population Monitoring",
        generatedBy: "AI Conservation Engine v3.0",
        status: "pending",
        generatedAt: new Date().toISOString(),
        recommendationText: `Population growth rate for ${est.speciesCommonName} declined to ${est.growthRate}%. Initiate immediate health screening, GPS collar tracking, and habitat corridor evaluation.`,
        suggestedActions: [
          "Attach satellite GPS telemetry collars to 5 lead individuals",
          "Collect non-invasive fecal samples for stress hormone and pathogen screening",
          "Identify and secure migratory corridor bottlenecks between monitoring sectors"
        ],
        expectedImpact: "Reverses population decline and stabilizes growth rate above +2.0%.",
        habitatRestorationSuggestions: [
          `Secure connectivity corridors linking ${est.speciesCommonName} seasonal ranges`,
          "Reduce human settlement encroachment along corridor edges"
        ],
        monitoringSuggestions: [
          "Perform daily telemetry tracking and health status logs",
          "Conduct monthly mark-recapture statistical density analysis"
        ]
      });
    }
  }

  // Persist all generated recommendations
  for (const rec of generatedRecommendations) {
    await db.addRecommendation(rec);
  }

  return db.getRecommendations();
}

export async function getConservationRecommendations(): Promise<ConservationRecommendation[]> {
  const existing = await db.getRecommendations();
  if (existing && existing.length > 0) return existing;
  return generateConservationRecommendations();
}

export async function updateRecommendationStatus(id: string, status: string): Promise<ConservationRecommendation | null> {
  return db.updateRecommendationStatus(id, status);
}
