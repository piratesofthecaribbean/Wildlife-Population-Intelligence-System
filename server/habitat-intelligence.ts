import { db, HabitatAssessment, MonitoringSite } from "./db.js";

export async function calculateHabitatAssessments(): Promise<HabitatAssessment[]> {
  const [sites, detections, audioAnalyses] = await Promise.all([
    db.getMonitoringSites(),
    db.getDetections(),
    db.getAudioAnalyses()
  ]);

  const assessments: HabitatAssessment[] = [];

  for (const site of sites) {
    const siteDetections = detections;
    const siteAudio = audioAnalyses.filter(a => a.siteId === site.id);

    // Environmental metrics based on site attributes
    const env = site.environmentalParameters || { canopyCover: 72, waterAvailability: "Medium", humanDisturbance: "Low" };
    const canopyCover = Math.min(100, Math.max(20, env.canopyCover ?? 72));

    // Water score from water availability string
    let waterScore = 70;
    if (env.waterAvailability === "High") waterScore = 92;
    if (env.waterAvailability === "Medium") waterScore = 65;
    if (env.waterAvailability === "Low") waterScore = 35;

    // Disturbance score from human disturbance string
    let disturbanceScore = 20;
    if (env.humanDisturbance === "None") disturbanceScore = 5;
    if (env.humanDisturbance === "Low") disturbanceScore = 20;
    if (env.humanDisturbance === "Medium") disturbanceScore = 48;
    if (env.humanDisturbance === "High") disturbanceScore = 82;

    // Vegetation score calculation
    const vegetationScore = Math.min(100, Math.round(canopyCover * 0.8 + (100 - disturbanceScore) * 0.2));

    // Biodiversity score based on unique detected species count
    const uniqueSpecies = new Set([
      ...siteDetections.map(d => (d.speciesCommonName || "").toLowerCase()),
      ...siteAudio.map(a => (a.speciesCommonName || "").toLowerCase())
    ]).size;

    const biodiversityScore = Math.min(100, Math.round(Math.min(uniqueSpecies, 12) * 7.5 + 10));

    // Habitat Suitability Index (0-100)
    // Weighted formula: 25% Vegetation + 20% Canopy + 25% Water + 20% (100 - Disturbance) + 10% Biodiversity
    const habitatSuitability = Math.min(
      100,
      Math.max(
        10,
        Math.round(
          0.25 * vegetationScore +
          0.20 * canopyCover +
          0.25 * waterScore +
          0.20 * (100 - disturbanceScore) +
          0.10 * biodiversityScore
        )
      )
    );

    // Habitat Classification
    let habitatClassification = site.habitatType || "Dense Forest";
    if (canopyCover > 80 && waterScore > 75) habitatClassification = "Dense Forest";
    else if (canopyCover > 60 && waterScore > 60) habitatClassification = "Tropical Forest";
    else if (canopyCover < 40 && waterScore > 70) habitatClassification = "Wetland";
    else if (canopyCover < 35 && disturbanceScore > 60) habitatClassification = "Degraded Habitat";
    else if (canopyCover < 45) habitatClassification = "Grassland";

    assessments.push({
      id: `hab-${site.id}`,
      monitoringSiteId: site.id,
      monitoringSiteName: site.name,
      vegetationScore,
      canopyCover,
      waterScore,
      disturbanceScore,
      habitatSuitability,
      biodiversityScore,
      habitatClassification,
      assessedAt: new Date().toISOString()
    });
  }

  await db.addHabitatAssessments(assessments);
  return assessments;
}

export async function getSiteHabitatAssessment(siteId: string): Promise<HabitatAssessment | null> {
  const all = await db.getHabitatAssessments();
  const found = all.find(h => h.monitoringSiteId === siteId);
  if (found) return found;

  const recalculated = await calculateHabitatAssessments();
  return recalculated.find(h => h.monitoringSiteId === siteId) || null;
}

export async function getAllHabitatAssessments(): Promise<HabitatAssessment[]> {
  const existing = await db.getHabitatAssessments();
  if (existing && existing.length > 0) return existing;
  return calculateHabitatAssessments();
}
