import { db, EcosystemHealthReport } from "./db.js";
import { getAllHabitatAssessments } from "./habitat-intelligence.js";
import { getPopulationTrends } from "./population-estimator.js";

export async function calculateEcosystemHealthReports(): Promise<EcosystemHealthReport[]> {
  const [habitatAssessments, popTrends, sites] = await Promise.all([
    getAllHabitatAssessments(),
    getPopulationTrends(),
    db.getMonitoringSites()
  ]);

  const reports: EcosystemHealthReport[] = [];

  for (const site of sites) {
    const habitat = habitatAssessments.find(h => h.monitoringSiteId === site.id);
    const sitePopEst = popTrends.siteEstimates.find(e => e.monitoringSiteId === site.id);

    const diversityScore = habitat?.biodiversityScore ?? 75;
    const habitatScore = habitat?.habitatSuitability ?? 70;
    const waterScore = habitat?.waterScore ?? 65;
    const disturbanceScore = habitat?.disturbanceScore ?? 25;

    // Population stability score derived from site population growth rate
    const growth = sitePopEst?.growthRate ?? 2.0;
    let populationStabilityScore = 75;
    if (growth > 3.0) populationStabilityScore = 92;
    else if (growth > 0) populationStabilityScore = 80;
    else if (growth > -3) populationStabilityScore = 55;
    else populationStabilityScore = 30;

    // Weighted Ecosystem Health Index Formula:
    // 25% Diversity + 25% Habitat + 20% Population Stability + 15% Water + 15% (100 - Disturbance)
    const overallHealthScore = Math.min(
      100,
      Math.max(
        10,
        Math.round(
          0.25 * diversityScore +
          0.25 * habitatScore +
          0.20 * populationStabilityScore +
          0.15 * waterScore +
          0.15 * (100 - disturbanceScore)
        )
      )
    );

    let healthCategory: "Excellent" | "Good" | "Moderate" | "Poor" | "Critical" = "Moderate";
    if (overallHealthScore >= 85) healthCategory = "Excellent";
    else if (overallHealthScore >= 70) healthCategory = "Good";
    else if (overallHealthScore >= 50) healthCategory = "Moderate";
    else if (overallHealthScore >= 30) healthCategory = "Poor";
    else healthCategory = "Critical";

    reports.push({
      id: `eco-${site.id}`,
      monitoringSiteId: site.id,
      monitoringSiteName: site.name,
      overallHealthScore,
      diversityScore,
      habitatScore,
      populationStabilityScore,
      waterScore,
      disturbanceScore,
      healthCategory,
      generatedAt: new Date().toISOString()
    });
  }

  await db.addEcosystemHealthReports(reports);
  return reports;
}

export async function getEcosystemHealthReports(): Promise<EcosystemHealthReport[]> {
  const existing = await db.getEcosystemHealthReports();
  if (existing && existing.length > 0) return existing;
  return calculateEcosystemHealthReports();
}

export async function getSiteEcosystemHealthReport(siteId: string): Promise<EcosystemHealthReport | null> {
  const all = await getEcosystemHealthReports();
  return all.find(e => e.monitoringSiteId === siteId) || null;
}
