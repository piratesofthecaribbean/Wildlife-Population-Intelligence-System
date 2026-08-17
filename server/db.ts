import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// TypeScript Interfaces for the Wildlife Population Intelligence System
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
  habitatScore: number; // 0 to 100
  environmentalParameters: {
    canopyCover: number; // %
    waterAvailability: "High" | "Medium" | "Low";
    humanDisturbance: "None" | "Low" | "Medium" | "High";
    avgTemperature: number; // Celsius
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
}

export interface AIExplanation {
  whySelected: string;
  distinctFeatures: string;
  habitatCharacteristics: string;
  behavior: string;
  similarSpecies: string;
  reasonForConfidence: string;
}

export interface Detection {
  id: string;
  imageId: string;
  speciesId: string;
  speciesCommonName: string;
  speciesScientificName: string;
  confidence: number; // 0 to 1
  predictionQuality?: "Very High" | "High" | "Medium" | "Low";
  iucnStatus?: string;
  populationTrend?: string;
  threatLevel?: string;
  statusExplanation?: string;
  aiExplanation?: AIExplanation;
  boundingBox: {
    x: number; // 0-100
    y: number; // 0-100
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
  predictionQuality: "Very High" | "High" | "Medium" | "Low";
  iucnStatus: string;
  populationTrend: string;
  threatLevel: string;
  statusExplanation: string;
  aiExplanation: AIExplanation;
  acousticNotes: string;
  waveformData: number[];
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

// Check environment variables
const supabaseUrl = process.env.SUPABASE_URL;

let activeMode: "Service Role" | "Publishable Key" | null = null;
let supabaseKey = "";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.SUPABASE_KEY;

if (serviceRoleKey && serviceRoleKey.trim() !== "" && serviceRoleKey !== "MY_SUPABASE_KEY") {
  activeMode = "Service Role";
  supabaseKey = serviceRoleKey;
} else if (publishableKey && publishableKey.trim() !== "" && publishableKey !== "MY_SUPABASE_KEY") {
  activeMode = "Publishable Key";
  supabaseKey = publishableKey;
}

// Log active authentication mode
if (activeMode) {
  console.log(`[AUTH MODE] Active Authentication Mode: ${activeMode}`);
} else {
  console.log("[AUTH MODE] Active Authentication Mode: None (Fallback to Local Engine)");
}

const isSupabaseConfigured =
  supabaseUrl &&
  supabaseUrl !== "MY_SUPABASE_URL" &&
  supabaseUrl.trim() !== "" &&
  supabaseKey !== "";

let supabase: any = null;

if (isSupabaseConfigured) {
  try {
    const cleanUrl = supabaseUrl!.replace(/\/rest\/v1\/?$/, "");
    supabase = createClient(cleanUrl, supabaseKey, {
      global: {
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(3000),
          });
        },
      },
    });
    console.log("[DB SUCCESS] Initialized Supabase PostgreSQL Client for:", cleanUrl);
  } catch (err: any) {
    console.error("[DB ERROR] Failed to initialize Supabase client:", err.message);
  }
} else {
  console.warn(
    "[DB NOTICE] Supabase connection parameters are unconfigured or using defaults. " +
    "Operating with resilient local database state."
  );
}

function mapRoleToDb(role: string): "Admin" | "Researcher" | "Forest Officer" {
  if (role === "Admin") return "Admin";
  if (role === "Forest Officer" || role === "Conservation Officer") {
    return "Forest Officer";
  }
  return "Researcher";
}

function parseDbUser(u: any): User {
  let name = u.name || "";
  let role = u.role;
  if (name.includes("|")) {
    const parts = name.split("|");
    name = parts[0];
    role = parts[1];
  }
  return {
    id: u.id,
    name,
    email: u.email,
    role: role as any,
    createdAt: u.created_at || u.createdAt
  };
}

// Resilient Supabase & Local DB Engine
export class SupabaseDbEngine {

  private localUsers: User[] = [
    { id: "u-1", name: "Dr. Elena Rostova", email: "elena.r@wildlife.gov", role: "Researcher", createdAt: new Date().toISOString() },
    { id: "u-2", name: "Joseph Mpata", email: "j.mpata@wildlife.gov", role: "Forest Officer", createdAt: new Date().toISOString() },
    { id: "u-3", name: "Dr. Samuel Vance", email: "admin@wildlife.gov", role: "Admin", createdAt: new Date().toISOString() }
  ];

  private localSites: MonitoringSite[] = [
    {
      id: "site-1",
      name: "Serengeti Sector A",
      protectedArea: "Serengeti National Park",
      latitude: -2.33,
      longitude: 34.83,
      habitatType: "Savanna",
      habitatScore: 88,
      environmentalParameters: { canopyCover: 35, waterAvailability: "High", humanDisturbance: "Low", avgTemperature: 27 }
    },
    {
      id: "site-2",
      name: "Bwindi Impenetrable North",
      protectedArea: "Bwindi Impenetrable NP",
      latitude: -1.05,
      longitude: 29.61,
      habitatType: "Forest",
      habitatScore: 92,
      environmentalParameters: { canopyCover: 85, waterAvailability: "High", humanDisturbance: "None", avgTemperature: 21 }
    }
  ];

  private localSurveys: Survey[] = [
    {
      id: "survey-1",
      title: "Dry Season Apex Predator Census 2026",
      description: "Comprehensive camera trap and bioacoustic survey",
      siteId: "site-1",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      status: "Active",
      surveyorName: "Dr. Elena Rostova"
    }
  ];

  private localSpecies: Species[] = [
    { id: "sp-1", commonName: "African Lion", scientificName: "Panthera leo", conservationStatus: "Vulnerable", group: "Mammal", populationEstimate: "23,000", description: "Apex predator of sub-Saharan Africa." },
    { id: "sp-2", commonName: "African Bush Elephant", scientificName: "Loxodonta africana", conservationStatus: "Endangered", group: "Mammal", populationEstimate: "415,000", description: "Largest terrestrial land mammal." },
    { id: "sp-3", commonName: "Black Rhinoceros", scientificName: "Diceros bicornis", conservationStatus: "Critically Endangered", group: "Mammal", populationEstimate: "6,487", description: "Hooked-lip rhinoceros species." },
    { id: "sp-4", commonName: "Bengal Tiger", scientificName: "Panthera tigris tigris", conservationStatus: "Endangered", group: "Mammal", populationEstimate: "3,500", description: "Solitary apex predator of Indian forests." },
    { id: "sp-5", commonName: "Jaguar", scientificName: "Panthera onca", conservationStatus: "Near Threatened", group: "Mammal", populationEstimate: "173,000", description: "Largest felid in the Americas." },
    { id: "sp-6", commonName: "Scarlet Macaw", scientificName: "Ara macao", conservationStatus: "Least Concern", group: "Bird", populationEstimate: "50,000+", description: "Neotropical parrot inhabiting primary rainforest canopy." },
    { id: "sp-7", commonName: "Bald Eagle", scientificName: "Haliaeetus leucocephalus", conservationStatus: "Least Concern", group: "Bird", populationEstimate: "316,000", description: "North American raptor of coniferous riparian habitats." },
    { id: "sp-8", commonName: "Spotted Deer", scientificName: "Axis axis", conservationStatus: "Least Concern", group: "Mammal", populationEstimate: "Stable", description: "Chital deer species native to South Asia." }
  ];

  private localImages: WildlifeImage[] = [];
  private localDetections: Detection[] = [];
  private localAudioAnalyses: AudioAnalysis[] = [];
  private localRecommendations: ConservationRecommendation[] = [];
  private localPopulationEstimates: PopulationEstimate[] = [];
  private localHabitatAssessments: HabitatAssessment[] = [];
  private localEcosystemHealthReports: EcosystemHealthReport[] = [];
  private localNotifications: Notification[] = [
    { id: "notif-1", type: "Critical Sightings", title: "Black Rhino Sighting", message: "Critically endangered species detected at Serengeti Sector A.", timestamp: new Date().toISOString(), read: false }
  ];
  private localAuditLogs: AuditLog[] = [
    { id: "log-1", userId: "u-1", userName: "Dr. Elena Rostova", userRole: "Researcher", action: "SYSTEM_INIT", details: "System initialized successfully.", timestamp: new Date().toISOString() }
  ];

  private supabaseDisabled = false;

  private isSupabaseAvailable(): boolean {
    return !!supabase && !this.supabaseDisabled;
  }

  private handleSupabaseError(err: any, opName: string) {
    console.warn(`[DB WARNING] Supabase ${opName} failed, using local store:`, err.message);
    if (err.name === "AbortError" || err.message?.includes("fetch failed") || err.message?.includes("ENOTFOUND")) {
      this.supabaseDisabled = true;
      console.warn("[DB ENGINE] Remote Supabase network connection offline. Instant local database engine activated for future queries.");
    }
  }

  // USERS
  public async getUsers(): Promise<User[]> {
    if (this.isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase.from("users").select("*");
        if (!error && data) {
          const fetched = data.map((u: any) => parseDbUser(u));
          for (const loc of this.localUsers) {
            if (!fetched.some((f: User) => f.id === loc.id || f.email.toLowerCase() === loc.email.toLowerCase())) {
              fetched.push(loc);
            }
          }
          return fetched;
        }
      } catch (err: any) {
        this.handleSupabaseError(err, "getUsers");
      }
    }
    return this.localUsers;
  }

  public async addUser(user: User): Promise<User> {
    if (!this.localUsers.some(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase())) {
      this.localUsers.push(user);
    }
    if (this.isSupabaseAvailable()) {
      try {
        const dbRole = mapRoleToDb(user.role);
        const dbName = `${user.name}|${user.role}`;
        await supabase.from("users").insert([{
          id: user.id,
          name: dbName,
          email: user.email,
          role: dbRole,
          created_at: user.createdAt || new Date().toISOString()
        }]);
      } catch (err: any) {
        this.handleSupabaseError(err, "addUser");
      }
    }
    return user;
  }

  public async updateUserRole(id: string, role: any): Promise<void> {
    const loc = this.localUsers.find(u => u.id === id);
    if (loc) {
      loc.role = role;
    }
    if (this.isSupabaseAvailable()) {
      try {
        const { data } = await supabase.from("users").select("*").eq("id", id).single();
        let baseName = data?.name || loc?.name || "";
        if (baseName.includes("|")) baseName = baseName.split("|")[0];
        const dbRole = mapRoleToDb(role);
        const dbName = `${baseName}|${role}`;
        await supabase.from("users").update({ name: dbName, role: dbRole }).eq("id", id);
      } catch (err: any) {
        this.handleSupabaseError(err, "updateUserRole");
      }
    }
  }

  public async deleteUser(id: string): Promise<void> {
    this.localUsers = this.localUsers.filter(u => u.id !== id);
    if (this.isSupabaseAvailable()) {
      try {
        await supabase.from("users").delete().eq("id", id);
      } catch (err: any) {
        this.handleSupabaseError(err, "deleteUser");
      }
    }
  }

  // MONITORING SITES
  public async getMonitoringSites(): Promise<MonitoringSite[]> {
    if (this.isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase.from("monitoring_sites").select("*");
        if (!error && data) {
          const fetched = data.map((s: any) => ({
            id: s.id,
            name: s.name,
            protectedArea: s.protected_area,
            latitude: Number(s.latitude),
            longitude: Number(s.longitude),
            habitatType: s.habitat_type,
            habitatScore: s.habitat_score,
            environmentalParameters: {
              canopyCover: s.canopy_cover,
              waterAvailability: s.water_availability,
              humanDisturbance: s.human_disturbance,
              avgTemperature: s.avg_temperature
            }
          }));
          for (const loc of this.localSites) {
            if (!fetched.some((f: MonitoringSite) => f.id === loc.id)) {
              fetched.push(loc);
            }
          }
          return fetched;
        }
      } catch (err: any) {
        this.handleSupabaseError(err, "getMonitoringSites");
      }
    }
    return this.localSites;
  }

  public async addMonitoringSite(site: MonitoringSite): Promise<MonitoringSite> {
    if (!this.localSites.some(s => s.id === site.id)) {
      this.localSites.push(site);
    }
    if (supabase) {
      try {
        await supabase.from("monitoring_sites").insert([{
          id: site.id,
          name: site.name,
          protected_area: site.protectedArea,
          latitude: site.latitude,
          longitude: site.longitude,
          habitat_type: site.habitatType,
          habitat_score: site.habitatScore,
          canopy_cover: site.environmentalParameters.canopyCover,
          water_availability: site.environmentalParameters.waterAvailability,
          human_disturbance: site.environmentalParameters.humanDisturbance,
          avg_temperature: site.environmentalParameters.avgTemperature
        }]);
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase addMonitoringSite failed:", err.message);
      }
    }
    return site;
  }

  // SURVEYS
  public async getSurveys(): Promise<Survey[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from("surveys").select("*");
        if (!error && data) {
          const fetched = data.map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            siteId: s.site_id,
            startDate: s.start_date,
            endDate: s.end_date,
            status: s.status,
            surveyorName: s.surveyor_name
          }));
          for (const loc of this.localSurveys) {
            if (!fetched.some((f: Survey) => f.id === loc.id)) {
              fetched.push(loc);
            }
          }
          return fetched;
        }
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase getSurveys failed, using local store:", err.message);
      }
    }
    return this.localSurveys;
  }

  public async addSurvey(survey: Survey): Promise<Survey> {
    if (!this.localSurveys.some(s => s.id === survey.id)) {
      this.localSurveys.push(survey);
    }
    if (supabase) {
      try {
        await supabase.from("surveys").insert([{
          id: survey.id,
          title: survey.title,
          description: survey.description,
          site_id: survey.siteId,
          start_date: survey.startDate,
          end_date: survey.endDate,
          status: survey.status,
          surveyor_name: survey.surveyorName
        }]);
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase addSurvey failed:", err.message);
      }
    }
    return survey;
  }

  public async updateSurvey(id: string, updates: Partial<Survey>): Promise<Survey> {
    const s = this.localSurveys.find(item => item.id === id);
    if (s) {
      if (updates.title !== undefined) s.title = updates.title;
      if (updates.description !== undefined) s.description = updates.description;
      if (updates.siteId !== undefined) s.siteId = updates.siteId;
      if (updates.startDate !== undefined) s.startDate = updates.startDate;
      if (updates.endDate !== undefined) s.endDate = updates.endDate;
      if (updates.status !== undefined) s.status = updates.status;
      if (updates.surveyorName !== undefined) s.surveyorName = updates.surveyorName;
    }

    if (supabase) {
      try {
        const payload: any = {};
        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.siteId !== undefined) payload.site_id = updates.siteId;
        if (updates.startDate !== undefined) payload.start_date = updates.startDate;
        if (updates.endDate !== undefined) payload.end_date = updates.endDate;
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.surveyorName !== undefined) payload.surveyor_name = updates.surveyorName;
        await supabase.from("surveys").update(payload).eq("id", id);
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase updateSurvey failed:", err.message);
      }
    }

    if (!s) {
      throw new Error(`Survey with ID ${id} not found.`);
    }
    return s;
  }

  public async deleteSurvey(id: string): Promise<boolean> {
    this.localSurveys = this.localSurveys.filter(s => s.id !== id);
    if (supabase) {
      try {
        await supabase.from("surveys").delete().eq("id", id);
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase deleteSurvey failed:", err.message);
      }
    }
    return true;
  }

  // SPECIES
  public async getSpecies(): Promise<Species[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from("species").select("*");
        if (!error && data) {
          const fetched = data.map((s: any) => ({
            id: s.id,
            commonName: s.common_name,
            scientificName: s.scientific_name,
            conservationStatus: s.conservation_status,
            group: s.group_name,
            populationEstimate: s.population_estimate,
            description: s.description
          }));
          for (const loc of this.localSpecies) {
            if (!fetched.some((f: Species) => f.id === loc.id)) {
              fetched.push(loc);
            }
          }
          return fetched;
        }
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase getSpecies failed, using local store:", err.message);
      }
    }
    return this.localSpecies;
  }

  public async addSpecies(spec: Species): Promise<Species> {
    if (!this.localSpecies.some(s => s.id === spec.id)) {
      this.localSpecies.push(spec);
    }
    if (supabase) {
      try {
        await supabase.from("species").insert([{
          id: spec.id,
          common_name: spec.commonName,
          scientific_name: spec.scientificName,
          conservation_status: spec.conservationStatus,
          group_name: spec.group,
          population_estimate: spec.populationEstimate,
          description: spec.description
        }]);
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase addSpecies failed:", err.message);
      }
    }
    return spec;
  }

  // STORAGE UPLOADS
  public async uploadAudioToStorage(base64Audio: string, fileName: string): Promise<string> {
    if (supabase) {
      try {
        const cleanBase64 = base64Audio.includes(";base64,")
          ? base64Audio.split(";base64,")[1]
          : base64Audio;

        const binaryString = atob(cleanBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const ext = fileName.split(".").pop() || "wav";
        const filePath = `recordings/${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;

        let mime = "audio/wav";
        if (ext === "mp3") mime = "audio/mpeg";
        else if (ext === "ogg") mime = "audio/ogg";
        else if (ext === "flac") mime = "audio/flac";

        const { error } = await supabase.storage
          .from("wildlife-audio")
          .upload(filePath, bytes, {
            contentType: mime,
            upsert: true
          });

        if (!error) {
          const { data: publicUrlData } = supabase.storage
            .from("wildlife-audio")
            .getPublicUrl(filePath);
          if (publicUrlData?.publicUrl) {
            return publicUrlData.publicUrl;
          }
        }
      } catch (err: any) {
        console.warn("[STORAGE WARNING] Supabase Audio Storage upload failed, keeping base64/URI:", err.message);
      }
    }
    return base64Audio;
  }

  public async uploadImageToStorage(base64Image: string, fileName: string): Promise<string> {
    if (supabase) {
      try {
        const cleanBase64 = base64Image.includes(";base64,")
          ? base64Image.split(";base64,")[1]
          : base64Image;

        const binaryString = atob(cleanBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const ext = fileName.split(".").pop() || "jpg";
        const filePath = `camera-traps/${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;

        const { error } = await supabase.storage
          .from("wildlife-images")
          .upload(filePath, bytes, {
            contentType: `image/${ext === "png" ? "png" : "jpeg"}`,
            upsert: true
          });

        if (!error) {
          const { data: publicUrlData } = supabase.storage
            .from("wildlife-images")
            .getPublicUrl(filePath);
          if (publicUrlData?.publicUrl) {
            return publicUrlData.publicUrl;
          }
        }
      } catch (err: any) {
        console.warn("[STORAGE WARNING] Supabase Storage upload failed, keeping base64/URI:", err.message);
      }
    }
    return base64Image;
  }

  // WILDLIFE IMAGES
  public async getWildlifeImages(): Promise<WildlifeImage[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from("wildlife_images").select("*");
        if (!error && data) {
          const fetched = data.map((img: any) => ({
            id: img.id,
            surveyId: img.survey_id,
            siteId: img.site_id,
            fileName: img.file_name,
            imageUri: img.image_uri,
            uploadTimestamp: img.upload_timestamp,
            status: img.status,
            detectionMetadata: {
              speciesCount: img.species_count,
              highestConfidence: img.highest_confidence,
              speciesRichness: img.species_richness,
              diversityIndex: img.diversity_index
            },
            habitatAnalysis: {
              classification: img.habitat_classification || "Undetermined",
              healthScore: img.habitat_health_score || 50,
              degradationLevel: img.habitat_degradation_level || "Low",
              notes: img.habitat_notes || ""
            }
          }));
          for (const loc of this.localImages) {
            if (!fetched.some((f: WildlifeImage) => f.id === loc.id)) {
              fetched.push(loc);
            }
          }
          return fetched;
        }
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase getWildlifeImages failed, using local store:", err.message);
      }
    }
    return this.localImages;
  }

  public async addWildlifeImage(image: WildlifeImage): Promise<WildlifeImage> {
    if (!this.localImages.some(i => i.id === image.id)) {
      this.localImages.unshift(image);
    }
    if (supabase) {
      try {
        await supabase.from("wildlife_images").insert([{
          id: image.id,
          survey_id: image.surveyId,
          site_id: image.siteId,
          file_name: image.fileName,
          image_uri: image.imageUri,
          upload_timestamp: image.uploadTimestamp || new Date().toISOString(),
          status: image.status,
          species_count: image.detectionMetadata?.speciesCount || 0,
          highest_confidence: image.detectionMetadata?.highestConfidence || 0,
          species_richness: image.detectionMetadata?.speciesRichness || 0,
          diversity_index: image.detectionMetadata?.diversityIndex || 0,
          habitat_classification: image.habitatAnalysis?.classification,
          habitat_health_score: image.habitatAnalysis?.healthScore,
          habitat_degradation_level: image.habitatAnalysis?.degradationLevel,
          habitat_notes: image.habitatAnalysis?.notes
        }]);
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase addWildlifeImage failed:", err.message);
      }
    }
    return image;
  }

  public async updateWildlifeImage(id: string, updates: Partial<WildlifeImage>): Promise<WildlifeImage> {
    const img = this.localImages.find(i => i.id === id);
    if (img) {
      if (updates.status) img.status = updates.status;
      if (updates.detectionMetadata) img.detectionMetadata = updates.detectionMetadata;
      if (updates.habitatAnalysis) img.habitatAnalysis = updates.habitatAnalysis;
    }
    if (supabase) {
      try {
        const payload: any = {};
        if (updates.status) payload.status = updates.status;
        if (updates.detectionMetadata) {
          payload.species_count = updates.detectionMetadata.speciesCount;
          payload.highest_confidence = updates.detectionMetadata.highestConfidence;
          payload.species_richness = updates.detectionMetadata.speciesRichness;
          payload.diversity_index = updates.detectionMetadata.diversityIndex;
        }
        if (updates.habitatAnalysis) {
          payload.habitat_classification = updates.habitatAnalysis.classification;
          payload.habitat_health_score = updates.habitatAnalysis.healthScore;
          payload.habitat_degradation_level = updates.habitatAnalysis.degradationLevel;
          payload.habitat_notes = updates.habitatAnalysis.notes;
        }
        await supabase.from("wildlife_images").update(payload).eq("id", id);
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase updateWildlifeImage failed:", err.message);
      }
    }
    return img || {
      id,
      surveyId: "",
      siteId: "",
      fileName: "",
      imageUri: "",
      uploadTimestamp: new Date().toISOString(),
      status: "Analyzed"
    };
  }

  // DETECTIONS
  public async getDetections(): Promise<Detection[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from("detections").select("*");
        if (!error && data) {
          const fetched = data.map((d: any) => ({
            id: d.id,
            imageId: d.image_id,
            speciesId: d.species_id,
            speciesCommonName: d.species_common_name,
            speciesScientificName: d.species_scientific_name,
            confidence: Number(d.confidence),
            predictionQuality: d.prediction_quality,
            iucnStatus: d.iucn_status,
            populationTrend: d.population_trend,
            threatLevel: d.threat_level,
            statusExplanation: d.status_explanation,
            aiExplanation: d.ai_explanation || {},
            boundingBox: {
              x: Number(d.bbox_x || 0),
              y: Number(d.bbox_y || 0),
              width: Number(d.bbox_width || 0),
              height: Number(d.bbox_height || 0)
            },
            timestamp: d.timestamp
          }));
          for (const loc of this.localDetections) {
            if (!fetched.some((f: Detection) => f.id === loc.id)) {
              fetched.push(loc);
            }
          }
          return fetched;
        }
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase getDetections failed, using local store:", err.message);
      }
    }
    return this.localDetections;
  }

  public async addDetection(det: Detection): Promise<Detection> {
    if (!this.localDetections.some(d => d.id === det.id)) {
      this.localDetections.unshift(det);
    }
    if (supabase) {
      try {
        await supabase.from("detections").insert([{
          id: det.id,
          image_id: det.imageId,
          species_id: det.speciesId,
          species_common_name: det.speciesCommonName,
          species_scientific_name: det.speciesScientificName,
          confidence: det.confidence,
          prediction_quality: det.predictionQuality,
          iucn_status: det.iucnStatus,
          population_trend: det.populationTrend,
          threat_level: det.threatLevel,
          status_explanation: det.statusExplanation,
          ai_explanation: det.aiExplanation,
          bbox_x: det.boundingBox.x,
          bbox_y: det.boundingBox.y,
          bbox_width: det.boundingBox.width,
          bbox_height: det.boundingBox.height,
          timestamp: det.timestamp || new Date().toISOString()
        }]);
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase addDetection failed:", err.message);
      }
    }
    return det;
  }

  public async addDetections(dets: Detection[]): Promise<Detection[]> {
    for (const det of dets) {
      await this.addDetection(det);
    }
    return dets;
  }

  // AUDIO ANALYSES
  public async getAudioAnalyses(): Promise<AudioAnalysis[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from("audio_analyses").select("*");
        if (!error && data) {
          const fetched = data.map((a: any) => ({
            id: a.id,
            surveyId: a.survey_id,
            siteId: a.site_id,
            fileName: a.file_name,
            audioUri: a.audio_uri,
            uploadTimestamp: a.upload_timestamp,
            status: a.status,
            speciesCommonName: a.species_common_name,
            speciesScientificName: a.species_scientific_name,
            confidence: Number(a.confidence),
            predictionQuality: a.prediction_quality,
            iucnStatus: a.iucn_status,
            populationTrend: a.population_trend,
            threatLevel: a.threat_level,
            statusExplanation: a.status_explanation,
            aiExplanation: a.ai_explanation || {},
            acousticNotes: a.acoustic_notes,
            waveformData: a.waveform_data || []
          }));
          for (const loc of this.localAudioAnalyses) {
            if (!fetched.some((f: AudioAnalysis) => f.id === loc.id)) {
              fetched.push(loc);
            }
          }
          return fetched;
        }
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase getAudioAnalyses failed, using local store:", err.message);
      }
    }
    return this.localAudioAnalyses;
  }

  public async addAudioAnalysis(analysis: AudioAnalysis): Promise<AudioAnalysis> {
    if (!this.localAudioAnalyses.some(a => a.id === analysis.id)) {
      this.localAudioAnalyses.unshift(analysis);
    }
    if (supabase) {
      try {
        await supabase.from("audio_analyses").insert([{
          id: analysis.id,
          survey_id: analysis.surveyId,
          site_id: analysis.siteId,
          file_name: analysis.fileName,
          audio_uri: analysis.audioUri,
          upload_timestamp: analysis.uploadTimestamp || new Date().toISOString(),
          status: analysis.status,
          species_common_name: analysis.speciesCommonName,
          species_scientific_name: analysis.speciesScientificName,
          confidence: analysis.confidence,
          prediction_quality: analysis.predictionQuality,
          iucn_status: analysis.iucnStatus,
          population_trend: analysis.populationTrend,
          threat_level: analysis.threatLevel,
          status_explanation: analysis.statusExplanation,
          ai_explanation: analysis.aiExplanation,
          acoustic_notes: analysis.acousticNotes,
          waveform_data: analysis.waveformData
        }]);
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase addAudioAnalysis failed:", err.message);
      }
    }
    return analysis;
  }

  // RECOMMENDATIONS
  public async getRecommendations(): Promise<ConservationRecommendation[]> {
    if (this.isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase.from("recommendations").select("*");
        if (!error && data) {
          const fetched = data.map((r: any) => ({
            id: r.id,
            surveyId: r.survey_id,
            monitoringSiteId: r.monitoring_site_id,
            monitoringSiteName: r.monitoring_site_name,
            affectedSpecies: r.affected_species,
            riskLevel: r.risk_level,
            priorityLevel: r.priority_level || "High",
            recommendationCategory: r.recommendation_category || "Habitat Restoration",
            generatedBy: r.generated_by || "ai_engine",
            status: r.status || "pending",
            generatedAt: r.generated_at,
            recommendationText: r.recommendation_text,
            suggestedActions: r.suggested_actions || [],
            expectedImpact: r.expected_impact || "",
            habitatRestorationSuggestions: r.habitat_restoration_suggestions || [],
            monitoringSuggestions: r.monitoring_suggestions || []
          }));
          for (const loc of this.localRecommendations) {
            if (!fetched.some((f: ConservationRecommendation) => f.id === loc.id)) {
              fetched.push(loc);
            }
          }
          return fetched;
        }
      } catch (err: any) {
        this.handleSupabaseError(err, "getRecommendations");
      }
    }
    return this.localRecommendations;
  }

  public async addRecommendation(rec: ConservationRecommendation): Promise<ConservationRecommendation> {
    if (!this.localRecommendations.some(r => r.id === rec.id)) {
      this.localRecommendations.unshift(rec);
    }
    if (this.isSupabaseAvailable()) {
      try {
        await supabase.from("recommendations").insert([{
          id: rec.id,
          survey_id: rec.surveyId,
          monitoring_site_id: rec.monitoringSiteId,
          monitoring_site_name: rec.monitoringSiteName,
          affected_species: rec.affectedSpecies,
          risk_level: rec.riskLevel,
          priority_level: rec.priorityLevel || "High",
          recommendation_category: rec.recommendationCategory || "Habitat Restoration",
          generated_by: rec.generatedBy || "ai_engine",
          status: rec.status || "pending",
          generated_at: rec.generatedAt || new Date().toISOString(),
          recommendation_text: rec.recommendationText,
          suggested_actions: rec.suggestedActions || [],
          expected_impact: rec.expectedImpact || "",
          habitat_restoration_suggestions: rec.habitatRestorationSuggestions,
          monitoring_suggestions: rec.monitoringSuggestions
        }]);
      } catch (err: any) {
        this.handleSupabaseError(err, "addRecommendation");
      }
    }
    return rec;
  }

  public async updateRecommendationStatus(id: string, status: string): Promise<ConservationRecommendation | null> {
    let loc = this.localRecommendations.find(r => r.id === id);
    if (!loc) {
      const all = await this.getRecommendations();
      const found = all.find(r => r.id === id);
      if (found) {
        loc = { ...found };
        this.localRecommendations.push(loc);
      }
    }
    if (loc) {
      loc.status = status;
    }
    if (this.isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase.from("recommendations").update({ status }).eq("id", id).select().single();
        if (!error && data) {
          loc = {
            id: data.id,
            surveyId: data.survey_id,
            monitoringSiteId: data.monitoring_site_id,
            monitoringSiteName: data.monitoring_site_name,
            affectedSpecies: data.affected_species,
            riskLevel: data.risk_level,
            priorityLevel: data.priority_level || "High",
            recommendationCategory: data.recommendation_category || "Habitat Restoration",
            generatedBy: data.generated_by || "ai_engine",
            status: data.status || status,
            generatedAt: data.generated_at,
            recommendationText: data.recommendation_text,
            suggestedActions: data.suggested_actions || [],
            expectedImpact: data.expected_impact || "",
            habitatRestorationSuggestions: data.habitat_restoration_suggestions || [],
            monitoringSuggestions: data.monitoring_suggestions || []
          };
        }
      } catch (err: any) {
        this.handleSupabaseError(err, "updateRecommendationStatus");
      }
    }
    return loc || null;
  }

  // POPULATION ESTIMATES
  public async getPopulationEstimates(): Promise<PopulationEstimate[]> {
    if (this.isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase.from("population_estimates").select("*");
        if (!error && data) {
          const fetched = data.map((p: any) => ({
            id: p.id,
            speciesId: p.species_id,
            speciesCommonName: p.species_common_name,
            speciesScientificName: p.species_scientific_name,
            monitoringSiteId: p.monitoring_site_id,
            monitoringSiteName: p.monitoring_site_name,
            estimatedPopulation: Number(p.estimated_population || 0),
            estimationConfidence: Number(p.estimation_confidence || 0),
            trendDirection: p.trend_direction || "Stable",
            growthRate: Number(p.growth_rate || 0),
            observationCount: Number(p.observation_count || 0),
            calculatedAt: p.calculated_at || p.created_at || new Date().toISOString()
          }));
          for (const loc of this.localPopulationEstimates) {
            if (!fetched.some((f: PopulationEstimate) => f.id === loc.id)) {
              fetched.push(loc);
            }
          }
          return fetched;
        }
      } catch (err: any) {
        this.handleSupabaseError(err, "getPopulationEstimates");
      }
    }
    return this.localPopulationEstimates;
  }

  public async addPopulationEstimates(estimates: PopulationEstimate[]): Promise<PopulationEstimate[]> {
    for (const est of estimates) {
      const idx = this.localPopulationEstimates.findIndex(p => p.id === est.id);
      if (idx >= 0) {
        this.localPopulationEstimates[idx] = est;
      } else {
        this.localPopulationEstimates.push(est);
      }
    }
    if (this.isSupabaseAvailable()) {
      try {
        const rows = estimates.map(e => ({
          id: e.id,
          species_id: e.speciesId,
          species_common_name: e.speciesCommonName,
          species_scientific_name: e.speciesScientificName,
          monitoring_site_id: e.monitoringSiteId,
          monitoring_site_name: e.monitoringSiteName,
          estimated_population: e.estimatedPopulation,
          estimation_confidence: e.estimationConfidence,
          trend_direction: e.trendDirection,
          growth_rate: e.growthRate,
          observation_count: e.observationCount,
          calculated_at: e.calculatedAt || new Date().toISOString()
        }));
        await supabase.from("population_estimates").upsert(rows);
      } catch (err: any) {
        this.handleSupabaseError(err, "addPopulationEstimates");
      }
    }
    return estimates;
  }

  // HABITAT ASSESSMENTS
  public async getHabitatAssessments(): Promise<HabitatAssessment[]> {
    if (this.isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase.from("habitat_assessments").select("*");
        if (!error && data) {
          const fetched = data.map((h: any) => ({
            id: h.id,
            monitoringSiteId: h.monitoring_site_id,
            monitoringSiteName: h.monitoring_site_name,
            vegetationScore: Number(h.vegetation_score || 0),
            canopyCover: Number(h.canopy_cover || 0),
            waterScore: Number(h.water_score || 0),
            disturbanceScore: Number(h.disturbance_score || 0),
            habitatSuitability: Number(h.habitat_suitability || 0),
            biodiversityScore: Number(h.biodiversity_score || 0),
            habitatClassification: h.habitat_classification || "Mixed Habitat",
            assessedAt: h.assessed_at || new Date().toISOString()
          }));
          for (const loc of this.localHabitatAssessments) {
            if (!fetched.some((f: HabitatAssessment) => f.id === loc.id)) {
              fetched.push(loc);
            }
          }
          return fetched;
        }
      } catch (err: any) {
        this.handleSupabaseError(err, "getHabitatAssessments");
      }
    }
    return this.localHabitatAssessments;
  }

  public async addHabitatAssessments(assessments: HabitatAssessment[]): Promise<HabitatAssessment[]> {
    for (const ass of assessments) {
      const idx = this.localHabitatAssessments.findIndex(h => h.id === ass.id);
      if (idx >= 0) {
        this.localHabitatAssessments[idx] = ass;
      } else {
        this.localHabitatAssessments.push(ass);
      }
    }
    if (this.isSupabaseAvailable()) {
      try {
        const rows = assessments.map(h => ({
          id: h.id,
          monitoring_site_id: h.monitoringSiteId,
          monitoring_site_name: h.monitoringSiteName,
          vegetation_score: h.vegetationScore,
          canopy_cover: h.canopyCover,
          water_score: h.waterScore,
          disturbance_score: h.disturbanceScore,
          habitat_suitability: h.habitatSuitability,
          biodiversity_score: h.biodiversityScore,
          habitat_classification: h.habitatClassification,
          assessed_at: h.assessedAt || new Date().toISOString()
        }));
        await supabase.from("habitat_assessments").upsert(rows);
      } catch (err: any) {
        this.handleSupabaseError(err, "addHabitatAssessments");
      }
    }
    return assessments;
  }

  // ECOSYSTEM HEALTH REPORTS
  public async getEcosystemHealthReports(): Promise<EcosystemHealthReport[]> {
    if (this.isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase.from("ecosystem_health_reports").select("*");
        if (!error && data) {
          const fetched = data.map((e: any) => ({
            id: e.id,
            monitoringSiteId: e.monitoring_site_id,
            monitoringSiteName: e.monitoring_site_name,
            overallHealthScore: Number(e.overall_health_score || 0),
            diversityScore: Number(e.diversity_score || 0),
            habitatScore: Number(e.habitat_score || 0),
            populationStabilityScore: Number(e.population_stability_score || 0),
            waterScore: Number(e.water_score || 0),
            disturbanceScore: Number(e.disturbance_score || 0),
            healthCategory: e.health_category || "Moderate",
            generatedAt: e.generated_at || new Date().toISOString()
          }));
          for (const loc of this.localEcosystemHealthReports) {
            if (!fetched.some((f: EcosystemHealthReport) => f.id === loc.id)) {
              fetched.push(loc);
            }
          }
          return fetched;
        }
      } catch (err: any) {
        this.handleSupabaseError(err, "getEcosystemHealthReports");
      }
    }
    return this.localEcosystemHealthReports;
  }

  public async addEcosystemHealthReports(reports: EcosystemHealthReport[]): Promise<EcosystemHealthReport[]> {
    for (const rep of reports) {
      const idx = this.localEcosystemHealthReports.findIndex(e => e.id === rep.id);
      if (idx >= 0) {
        this.localEcosystemHealthReports[idx] = rep;
      } else {
        this.localEcosystemHealthReports.push(rep);
      }
    }
    if (this.isSupabaseAvailable()) {
      try {
        const rows = reports.map(e => ({
          id: e.id,
          monitoring_site_id: e.monitoringSiteId,
          monitoring_site_name: e.monitoringSiteName,
          overall_health_score: e.overallHealthScore,
          diversity_score: e.diversityScore,
          habitat_score: e.habitatScore,
          population_stability_score: e.populationStabilityScore,
          water_score: e.waterScore,
          disturbance_score: e.disturbanceScore,
          health_category: e.healthCategory,
          generated_at: e.generatedAt || new Date().toISOString()
        }));
        await supabase.from("ecosystem_health_reports").upsert(rows);
      } catch (err: any) {
        this.handleSupabaseError(err, "addEcosystemHealthReports");
      }
    }
    return reports;
  }

  // NOTIFICATIONS
  public async getNotifications(): Promise<Notification[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from("notifications").select("*").order("timestamp", { ascending: false });
        if (!error && data) {
          const fetched = data.map((n: any) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            timestamp: n.timestamp,
            read: n.read
          }));
          for (const loc of this.localNotifications) {
            if (!fetched.some((f: Notification) => f.id === loc.id)) {
              fetched.push(loc);
            }
          }
          return fetched;
        }
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase getNotifications failed, using local store:", err.message);
      }
    }
    return this.localNotifications;
  }

  public async addNotification(notif: Notification): Promise<Notification> {
    if (!this.localNotifications.some(n => n.id === notif.id)) {
      this.localNotifications.unshift(notif);
    }
    if (supabase) {
      try {
        await supabase.from("notifications").insert([{
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          timestamp: notif.timestamp || new Date().toISOString(),
          read: notif.read
        }]);
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase addNotification failed:", err.message);
      }
    }
    return notif;
  }

  public async markNotificationAsRead(id: string): Promise<Notification> {
    const loc = this.localNotifications.find(n => n.id === id);
    if (loc) {
      loc.read = true;
    }
    if (supabase) {
      try {
        await supabase.from("notifications").update({ read: true }).eq("id", id);
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase markNotificationAsRead failed:", err.message);
      }
    }
    if (!loc) {
      throw new Error(`Notification with ID ${id} not found.`);
    }
    return loc;
  }

  // AUDIT LOGS
  public async getAuditLogs(): Promise<AuditLog[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from("audit_logs").select("*").order("timestamp", { ascending: false });
        if (!error && data) {
          const fetched = data.map((l: any) => ({
            id: l.id,
            userId: l.user_id,
            userName: l.user_name,
            userRole: l.user_role,
            action: l.action,
            details: l.details,
            timestamp: l.timestamp
          }));
          for (const loc of this.localAuditLogs) {
            if (!fetched.some((f: AuditLog) => f.id === loc.id)) {
              fetched.push(loc);
            }
          }
          return fetched;
        }
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase getAuditLogs failed, using local store:", err.message);
      }
    }
    return this.localAuditLogs;
  }

  public async addAuditLog(log: AuditLog): Promise<AuditLog> {
    if (!this.localAuditLogs.some(l => l.id === log.id)) {
      this.localAuditLogs.unshift(log);
    }
    if (supabase) {
      try {
        await supabase.from("audit_logs").insert([{
          id: log.id,
          user_id: log.userId,
          user_name: log.userName,
          user_role: log.userRole,
          action: log.action,
          details: log.details,
          timestamp: log.timestamp || new Date().toISOString()
        }]);
      } catch (err: any) {
        console.warn("[DB WARNING] Supabase addAuditLog failed:", err.message);
      }
    }
    return log;
  }
}

export const db = new SupabaseDbEngine();
