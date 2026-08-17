export interface User {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Researcher" | "Forest Officer" | "Wildlife Researcher" | "Conservation Officer" | "NGO Partner" | "Student / Research Intern";
  createdAt: string;
}

export interface MonitoringSite {
  id: string;
  name: string;
  protectedArea: string;
  latitude: number;
  longitude: number;
  habitatType: "Forest" | "Savanna" | "Wetland" | "Desert" | "Grassland";
  habitatScore: number;
  environmentalParameters: {
    canopyCover: number;
    waterAvailability: "High" | "Medium" | "Low";
    humanDisturbance: "None" | "Low" | "Medium" | "High";
    avgTemperature: number;
  };
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  siteId: string;
  startDate: string;
  endDate: string;
  status: "Active" | "Completed" | "Planned";
  surveyorName: string;
}

export interface AIExplanation {
  whySelected: string;
  distinctFeatures: string;
  habitatCharacteristics: string;
  behavior: string;
  similarSpecies: string;
  reasonForConfidence: string;
}

export type IUCNStatusCategory =
  | "Extinct (EX)"
  | "Extinct in the Wild (EW)"
  | "Critically Endangered (CR)"
  | "Endangered (EN)"
  | "Vulnerable (VU)"
  | "Near Threatened (NT)"
  | "Least Concern (LC)"
  | "Data Deficient (DD)";

export interface Detection {
  id: string;
  imageId: string;
  speciesId: string;
  speciesCommonName: string;
  speciesScientificName: string;
  confidence: number;
  predictionQuality?: "Excellent" | "Very High" | "High" | "Medium" | "Low";
  iucnStatus?: IUCNStatusCategory | string;
  populationTrend?: "Decreasing" | "Increasing" | "Stable" | "Unknown";
  threatLevel?: "Critical" | "High" | "Moderate" | "Low";
  statusExplanation?: string;
  aiExplanation?: AIExplanation;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  timestamp: string;
}

export interface AudioAnalysis {
  id: string;
  surveyId: string;
  siteId: string;
  fileName: string;
  audioUri: string;
  uploadTimestamp: string;
  status: "Pending" | "Analyzed" | "Failed";
  speciesCommonName: string;
  speciesScientificName: string;
  confidence: number;
  predictionQuality: "Excellent" | "Very High" | "High" | "Medium" | "Low";
  iucnStatus: IUCNStatusCategory | string;
  populationTrend: "Decreasing" | "Increasing" | "Stable" | "Unknown";
  threatLevel: "Critical" | "High" | "Moderate" | "Low";
  statusExplanation: string;
  aiExplanation: AIExplanation;
  acousticNotes: string;
  waveformData: number[];
}

export interface WildlifeImage {
  id: string;
  surveyId: string;
  siteId: string;
  fileName: string;
  imageUri: string;
  uploadTimestamp: string;
  status: "Pending" | "Analyzed" | "Failed";
  detectionMetadata?: {
    speciesCount: number;
    highestConfidence: number;
    speciesRichness: number;
    diversityIndex: number;
  };
  habitatAnalysis?: {
    classification: string;
    healthScore: number;
    degradationLevel: "None" | "Low" | "Medium" | "High";
    notes: string;
  };
  detections?: Detection[];
}

export interface Species {
  id: string;
  commonName: string;
  scientificName: string;
  conservationStatus: "Critically Endangered" | "Endangered" | "Vulnerable" | "Near Threatened" | "Least Concern";
  group: "Mammal" | "Bird" | "Reptile" | "Amphibian";
  populationEstimate: string;
  description: string;
}

export interface PopulationEstimate {
  id: string;
  speciesId?: string;
  speciesCommonName?: string;
  speciesScientificName?: string;
  monitoringSiteId?: string;
  monitoringSiteName?: string;
  estimatedPopulation: number;
  estimationConfidence: number;
  trendDirection: "Increasing" | "Decreasing" | "Stable";
  growthRate: number;
  observationCount: number;
  calculatedAt: string;
}

export interface HabitatAssessment {
  id: string;
  monitoringSiteId: string;
  monitoringSiteName?: string;
  vegetationScore: number;
  canopyCover: number;
  waterScore: number;
  disturbanceScore: number;
  habitatSuitability: number;
  biodiversityScore: number;
  habitatClassification: "Dense Forest" | "Tropical Forest" | "Grassland" | "Wetland" | "Woodland" | "Savannah" | "Scrubland" | "Degraded Habitat" | "Mixed Habitat" | string;
  assessedAt: string;
}

export interface EcosystemHealthReport {
  id: string;
  monitoringSiteId: string;
  monitoringSiteName?: string;
  overallHealthScore: number;
  diversityScore: number;
  habitatScore: number;
  populationStabilityScore: number;
  waterScore: number;
  disturbanceScore: number;
  healthCategory: "Excellent" | "Good" | "Moderate" | "Poor" | "Critical";
  generatedAt: string;
}

export interface ConservationRecommendation {
  id: string;
  surveyId?: string;
  monitoringSiteId?: string;
  monitoringSiteName?: string;
  affectedSpecies?: string;
  riskLevel: "Critical" | "Elevated" | "Stable" | "Favorable";
  priorityLevel?: "Critical" | "High" | "Medium" | "Low";
  recommendationCategory?: "Habitat Restoration" | "Anti-Poaching Patrol" | "Water Source Protection" | "Reforestation" | "Population Monitoring" | "Human-Wildlife Conflict Mitigation" | "Breeding Program Assessment" | "Corridor Protection" | string;
  generatedBy?: string;
  status?: "pending" | "approved" | "in_progress" | "completed" | "archived" | string;
  generatedAt: string;
  recommendationText: string;
  suggestedActions?: string[];
  expectedImpact?: string;
  habitatRestorationSuggestions: string[];
  monitoringSuggestions: string[];
}

export interface Notification {
  id: string;
  type: "Critical Sightings" | "Habitat Warning" | "Survey Alert" | "System Notification";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface DashboardKPIs {
  totalSites: number;
  totalSurveys: number;
  totalDetections: number;
  totalAudioAnalyses: number;
  totalSpecies: number;
  avgHabitatHealth: number;
  speciesRichness: number;
  shannonIndex: number;
  simpsonIndex: number;
  criticalSpeciesCount: number;
  threatenedSpeciesCount: number;
  endangeredSpeciesCount: number;
  avgConfidenceScore: number;
  highestConfidenceScore: number;
  lowestConfidenceScore: number;
  avgEcosystemHealth?: number;
  popGrowthRate?: number;
  avgHabitatSuitability?: number;
  highPriorityAlertsCount?: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  speciesDistribution: {
    commonName: string;
    scientificName: string;
    conservationStatus: string;
    count: number;
  }[];
  conservationStatusDistribution: {
    category: string;
    shortCode: string;
    count: number;
    color: string;
  }[];
  confidenceDistribution: {
    quality: string;
    range: string;
    count: number;
  }[];
  sightTrends: any[];
  habitatHealthScores: {
    name: string;
    type: string;
    score: number;
    protectedArea: string;
  }[];
  recentAudioAnalyses: AudioAnalysis[];
}
