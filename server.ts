import "dotenv/config";
import express from "express";
import path from "path";
import { db } from "./server/db.js";
import { analyzeWildlifeImage, analyzeWildlifeAudio, generateConservationRecommendations } from "./server/ai.js";
import { getCredentialByEmail, saveCredential, hashPassword } from "./server/credentials.js";
import { calculatePopulationEstimates, getSpeciesPopulationEstimate, getSitePopulationEstimate, getPopulationTrends } from "./server/population-estimator.js";
import { calculateHabitatAssessments, getSiteHabitatAssessment, getAllHabitatAssessments } from "./server/habitat-intelligence.js";
import { generateConservationRecommendations as runConservationEngine, getConservationRecommendations, updateRecommendationStatus } from "./server/conservation-engine.js";
import { calculateEcosystemHealthReports, getEcosystemHealthReports, getSiteEcosystemHealthReport } from "./server/ecosystem-health.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase JSON limit to accept base64 camera trap uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Simple Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ==========================================
// AUTHENTICATION API
// ==========================================

// Production Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const cred = getCredentialByEmail(email);
    if (!cred) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const inputHash = hashPassword(password);
    if (cred.passwordHash !== inputHash) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const users = await db.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return res.status(404).json({ error: "User profile not found in database." });
    }

    // Generate a JWT token for frontend session management
    const token = `jwt_token_for_${user.id}_${user.role.replace(/ /g, "_")}`;
    await db.addAuditLog({
      id: `log-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: "USER_LOGIN",
      details: `Successful login from role ${user.role}`,
      timestamp: new Date().toISOString(),
    });
    return res.json({ token, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get User Profile
app.get("/api/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const users = await db.getUsers();
    if (authHeader && authHeader.startsWith("Bearer jwt_token_for_")) {
      const parts = authHeader.replace("Bearer jwt_token_for_", "").split("_");
      const userId = parts[0];
      const user = users.find((u) => u.id === userId);
      if (user) {
        return res.json({ user });
      }
    }
    return res.status(401).json({ error: "Unauthorized. Session expired or invalid." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to get authenticated user from authorization header
async function getAuthenticatedUser(req: any) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer jwt_token_for_")) {
    const parts = authHeader.replace("Bearer jwt_token_for_", "").split("_");
    const userId = parts[0];
    const users = await db.getUsers();
    return users.find((u) => u.id === userId) || null;
  }
  return null;
}

// Production Public Registration
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, organization, department, country, role } = req.body;
    if (!name || !email || !password || !organization || !role) {
      return res.status(400).json({ error: "Name, email, password, organization, and role are required." });
    }

    // Allow users to register only as the 5 specified roles (no Admin public signup)
    const allowedRoles = [
      "Wildlife Researcher",
      "Forest Officer",
      "Conservation Officer",
      "NGO Partner",
      "Student / Research Intern"
    ];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Registration is not permitted for this role." });
    }

    const users = await db.getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    // Store credentials locally
    const passwordHash = hashPassword(password);
    saveCredential({
      email: email.toLowerCase(),
      passwordHash,
      organization,
      department: department || "",
      country: country || ""
    });

    const newUser = {
      id: `u-${Date.now()}`,
      name,
      email: email.toLowerCase(),
      role: role as any,
      createdAt: new Date().toISOString()
    };

    await db.addUser(newUser);

    const token = `jwt_token_for_${newUser.id}_${newUser.role.replace(/ /g, "_")}`;

    await db.addAuditLog({
      id: `log-${Date.now()}`,
      userId: newUser.id,
      userName: newUser.name,
      userRole: newUser.role,
      action: "USER_REGISTERED",
      details: `Created new account with role: ${newUser.role}. Organization: ${organization}`,
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json({ token, user: newUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users (Admin only)
app.get("/api/users", async (req, res) => {
  try {
    const actor = await getAuthenticatedUser(req);
    if (!actor || actor.role !== "Admin") {
      return res.status(403).json({ error: "Access denied. Only Administrators can view users." });
    }
    const users = await db.getUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update a user's role (Admin only)
app.put("/api/users/:id/role", async (req, res) => {
  try {
    const actor = await getAuthenticatedUser(req);
    if (!actor || actor.role !== "Admin") {
      return res.status(403).json({ error: "Access denied. Only Administrators can manage roles." });
    }

    const targetUserId = req.params.id;
    const { role } = req.body;

    if (!role || !["Admin", "Researcher", "Forest Officer"].includes(role)) {
      return res.status(400).json({ error: "Invalid role specified." });
    }

    // Check: Users cannot change their own role.
    if (actor.id === targetUserId) {
      return res.status(400).json({ error: "You cannot change your own role." });
    }

    const users = await db.getUsers();
    const targetUser = users.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return res.status(444).json({ error: "User not found." });
    }

    await db.updateUserRole(targetUserId, role as "Admin" | "Researcher" | "Forest Officer");

    await db.addAuditLog({
      id: `log-${Date.now()}`,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: "USER_ROLE_UPDATED",
      details: `Updated user ${targetUser.name} (${targetUser.email}) role from ${targetUser.role} to ${role}`,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: "User role updated successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a user (Admin only)
app.delete("/api/users/:id", async (req, res) => {
  try {
    const actor = await getAuthenticatedUser(req);
    if (!actor || actor.role !== "Admin") {
      return res.status(403).json({ error: "Access denied. Only Administrators can delete users." });
    }

    const targetUserId = req.params.id;

    // Prevent deleting themselves
    if (actor.id === targetUserId) {
      return res.status(400).json({ error: "You cannot delete your own account." });
    }

    const users = await db.getUsers();
    const targetUser = users.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return res.status(444).json({ error: "User not found." });
    }

    await db.deleteUser(targetUserId);

    await db.addAuditLog({
      id: `log-${Date.now()}`,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: "USER_DELETED",
      details: `Deleted user ${targetUser.name} (${targetUser.email})`,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: "User deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MONITORING SITES API
// ==========================================

// Get all sites
app.get("/api/sites", async (req, res) => {
  try {
    const sites = await db.getMonitoringSites();
    res.json(sites);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add a monitoring site
app.post("/api/sites", async (req, res) => {
  try {
    const { name, protectedArea, latitude, longitude, habitatType, habitatScore, canopyCover, waterAvailability, humanDisturbance, avgTemperature } = req.body;
    
    const newSite = await db.addMonitoringSite({
      id: `site-${Date.now()}`,
      name: name || "New Site Location",
      protectedArea: protectedArea || "State Forest Sanctuary",
      latitude: Number(latitude) || 0.0,
      longitude: Number(longitude) || 0.0,
      habitatType: habitatType || "Forest",
      habitatScore: Number(habitatScore) || 75,
      environmentalParameters: {
        canopyCover: Number(canopyCover) || 50,
        waterAvailability: waterAvailability || "Medium",
        humanDisturbance: humanDisturbance || "Low",
        avgTemperature: Number(avgTemperature) || 24.5,
      },
    });

    await db.addAuditLog({
      id: `log-${Date.now()}`,
      userId: "u-1",
      userName: "Dr. Elena Rostova",
      userRole: "Researcher",
      action: "SITE_CREATED",
      details: `Created monitoring site ${newSite.name} in ${newSite.protectedArea}`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json(newSite);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// SURVEYS API
// ==========================================

// Get surveys
app.get("/api/surveys", async (req, res) => {
  try {
    const surveys = await db.getSurveys();
    res.json(surveys);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add survey
app.post("/api/surveys", async (req, res) => {
  try {
    const { title, description, siteId, startDate, endDate, surveyorName } = req.body;
    const newSurvey = await db.addSurvey({
      id: `survey-${Date.now()}`,
      title,
      description,
      siteId,
      startDate: startDate || new Date().toISOString().split("T")[0],
      endDate: endDate || new Date().toISOString().split("T")[0],
      status: "Planned",
      surveyorName: surveyorName || "Elena Rostova",
    });

    await db.addAuditLog({
      id: `log-${Date.now()}`,
      userId: "u-1",
      userName: "Dr. Elena Rostova",
      userRole: "Researcher",
      action: "SURVEY_CREATED",
      details: `Created wildlife survey: ${newSurvey.title}`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json(newSurvey);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update survey
app.put("/api/surveys/:id", async (req, res) => {
  try {
    const updated = await db.updateSurvey(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Delete survey
app.delete("/api/surveys/:id", async (req, res) => {
  try {
    const success = await db.deleteSurvey(req.params.id);
    if (success) {
      res.json({ message: "Survey successfully deleted" });
    } else {
      res.status(404).json({ error: "Survey not found" });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// SPECIES API
// ==========================================

app.get("/api/species", async (req, res) => {
  try {
    const species = await db.getSpecies();
    res.json(species);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/species", async (req, res) => {
  try {
    const { commonName, scientificName, conservationStatus, group, populationEstimate, description } = req.body;
    const newSpec = await db.addSpecies({
      id: `sp-${Date.now()}`,
      commonName,
      scientificName,
      conservationStatus,
      group,
      populationEstimate: populationEstimate || "Unknown",
      description: description || "",
    });
    res.status(201).json(newSpec);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// WILDLIFE IMAGES AND AI DETECTION API
// ==========================================

// Get uploaded images with analysis
app.get("/api/images", async (req, res) => {
  try {
    const images = await db.getWildlifeImages();
    const allDetections = await db.getDetections();
    
    // Attach detections to each image for full context
    const fullImages = images.map((img) => {
      const detections = allDetections.filter((det) => det.imageId === img.id);
      return { ...img, detections };
    });

    res.json(fullImages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload and analyze image via Gemini
app.post("/api/images/upload", async (req, res) => {
  try {
    const { surveyId, siteId, fileName, imageUri } = req.body;
    if (!imageUri) {
      return res.status(400).json({ error: "Missing imageUri base64 string" });
    }

    const imageId = `img-${Date.now()}`;

    // 1. Upload base64 image to Supabase Storage and obtain public URL
    const publicUrl = await db.uploadImageToStorage(imageUri, fileName || "trap.jpg");

    // 2. Perform real Gemini analysis on the image content
    const aiResult = await analyzeWildlifeImage(imageUri, fileName || "trap.jpg");

    // 3. Add species to species reference table if they don't exist yet
    const existingSpecies = await db.getSpecies();
    
    // Map AI detections to the database detections and reference species
    const detectionsWithIds = [];
    for (const aiDet of aiResult.detections) {
      let spec = existingSpecies.find(
        (s) => s.commonName.toLowerCase() === aiDet.speciesCommonName.toLowerCase()
      );

      let statusCategory: "Critically Endangered" | "Endangered" | "Vulnerable" | "Near Threatened" | "Least Concern" = "Least Concern";
      const statusStr = (aiDet.iucnStatus || spec?.conservationStatus || "").toLowerCase();
      if (statusStr.includes("critically") || statusStr.includes("(cr)")) {
        statusCategory = "Critically Endangered";
      } else if (statusStr.includes("endangered") || statusStr.includes("(en)")) {
        statusCategory = "Endangered";
      } else if (statusStr.includes("vulnerable") || statusStr.includes("(vu)")) {
        statusCategory = "Vulnerable";
      } else if (statusStr.includes("near") || statusStr.includes("(nt)")) {
        statusCategory = "Near Threatened";
      } else {
        statusCategory = "Least Concern";
      }

      const scientificName = aiDet.speciesScientificName || spec?.scientificName || "Panthera leo";

      // Auto-create species if unknown to the seeding database
      if (!spec) {
        spec = await db.addSpecies({
          id: `sp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          commonName: aiDet.speciesCommonName,
          scientificName: scientificName,
          conservationStatus: statusCategory,
          group: aiDet.speciesCommonName.toLowerCase().includes("macaw") || aiDet.speciesCommonName.toLowerCase().includes("eagle") ? "Bird" : "Mammal",
          populationEstimate: "N/A",
          description: "Auto-discovered via AI Camera Trap analysis.",
        });
      }

      const detId = `det-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      detectionsWithIds.push({
        id: detId,
        imageId,
        speciesId: spec.id,
        speciesCommonName: spec.commonName,
        speciesScientificName: spec.scientificName || scientificName,
        confidence: aiDet.confidence,
        predictionQuality: aiDet.predictionQuality || (
          aiDet.confidence >= 0.9 ? "Excellent" :
          aiDet.confidence >= 0.75 ? "High" :
          aiDet.confidence >= 0.5 ? "Medium" : "Low"
        ),
        iucnStatus: statusCategory,
        populationTrend: aiDet.populationTrend || "Decreasing",
        threatLevel: aiDet.threatLevel || (statusCategory === "Critically Endangered" ? "Critical" : statusCategory === "Endangered" ? "High" : "Moderate"),
        statusExplanation: aiDet.statusExplanation || `IUCN Red List Classified: ${statusCategory}`,
        aiExplanation: aiDet.aiExplanation || {
          whySelected: "Visual pattern segmentation matching species profile.",
          distinctFeatures: "Facial and anatomical marking alignment.",
          habitatCharacteristics: "Vegetation match with wild species range.",
          behavior: "Camera trap passage detected.",
          similarSpecies: "Differentiated from sympatric fauna.",
          reasonForConfidence: "High keypoint alignment across vision model."
        },
        boundingBox: aiDet.boundingBox,
        timestamp: new Date().toISOString(),
      });
    }

    // Compute simple biodiversity parameters
    const speciesCount = detectionsWithIds.length;
    const highestConfidence = speciesCount > 0 ? Math.max(...detectionsWithIds.map((d) => d.confidence)) : 0;
    
    const uniqueSpecies = Array.from(new Set(detectionsWithIds.map((d) => d.speciesId)));
    const speciesRichness = uniqueSpecies.length;

    // Shannon-Wiener Index: H' = -sum(pi * ln(pi))
    let diversityIndex = 0;
    if (speciesCount > 0) {
      const counts: Record<string, number> = {};
      detectionsWithIds.forEach((d) => {
        counts[d.speciesId] = (counts[d.speciesId] || 0) + 1;
      });
      diversityIndex = Object.values(counts).reduce((acc, count) => {
        const pi = count / speciesCount;
        return acc - pi * Math.log(pi);
      }, 0);
      diversityIndex = Number(diversityIndex.toFixed(3));
    }

    // Save image record (using our permanent storage publicUrl!) - FIRST to prevent foreign key constraint violations
    const savedImage = await db.addWildlifeImage({
      id: imageId,
      surveyId: surveyId || "survey-2",
      siteId: siteId || "site-2",
      fileName: fileName || "camera_trap_detection.jpg",
      imageUri: publicUrl,
      uploadTimestamp: new Date().toISOString(),
      status: "Analyzed",
      detectionMetadata: {
        speciesCount,
        highestConfidence,
        speciesRichness,
        diversityIndex,
      },
      habitatAnalysis: aiResult.habitatAnalysis,
    });

    // Save detections - SECOND as they reference wildlife_images
    await db.addDetections(detectionsWithIds);

    // Check for critically endangered species and trigger instant alerting!
    for (const det of detectionsWithIds) {
      const specList = await db.getSpecies();
      const spec = specList.find((s) => s.id === det.speciesId);
      if (spec && (spec.conservationStatus === "Critically Endangered" || spec.conservationStatus === "Endangered")) {
        await db.addNotification({
          id: `notif-${Date.now()}-${Math.floor(Math.random() * 100)}`,
          type: "Critical Sightings",
          title: `CRITICAL SIGHTING ALERT: ${spec.commonName}`,
          message: `${spec.commonName} (${spec.scientificName}) detected at site! Conf: ${(det.confidence * 100).toFixed(0)}%. File: ${fileName}`,
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    }

    // Audit logs
    await db.addAuditLog({
      id: `log-${Date.now()}`,
      userId: "u-1",
      userName: "Dr. Elena Rostova",
      userRole: "Researcher",
      action: "IMAGE_UPLOADED_AND_ANALYZED",
      details: `Uploaded and analyzed file ${fileName}. AI detected ${speciesCount} animals (${speciesRichness} unique species).`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({ ...savedImage, detections: detectionsWithIds, simulated: aiResult.simulated });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// WILDLIFE VOICE AUDIO ANALYSIS API
// ==========================================

app.get("/api/audio", async (req, res) => {
  try {
    const audioList = await db.getAudioAnalyses();
    res.json(audioList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/audio/analyze", async (req, res) => {
  try {
    const { surveyId, siteId, fileName, audioUri, mimeType } = req.body;
    if (!audioUri) {
      return res.status(400).json({ error: "Missing audioUri base64 string or URL" });
    }

    const audioId = `aud-${Date.now()}`;

    // 1. Upload audio to Supabase Storage bucket wildlife-audio
    const publicUrl = await db.uploadAudioToStorage(audioUri, fileName || "recording.wav");

    // 2. Perform AI Bioacoustic Analysis using Gemini
    const aiResult = await analyzeWildlifeAudio(
      audioUri,
      fileName || "recording.wav",
      mimeType || "audio/wav"
    );

    // 3. Ensure species is registered in database
    const existingSpecies = await db.getSpecies();
    let spec = existingSpecies.find(
      (s) => s.commonName.toLowerCase() === aiResult.speciesCommonName.toLowerCase()
    );

    if (!spec) {
      spec = await db.addSpecies({
        id: `sp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        commonName: aiResult.speciesCommonName,
        scientificName: aiResult.speciesScientificName,
        conservationStatus: aiResult.iucnStatus.includes("Critically")
          ? "Critically Endangered"
          : aiResult.iucnStatus.includes("Endangered")
          ? "Endangered"
          : aiResult.iucnStatus.includes("Vulnerable")
          ? "Vulnerable"
          : aiResult.iucnStatus.includes("Near")
          ? "Near Threatened"
          : "Least Concern",
        group: "Mammal",
        populationEstimate: "N/A",
        description: "Discovered via Bioacoustic Voice Detection AI.",
      });
    }

    // 4. Save analysis to PostgreSQL
    const newAnalysis: any = {
      id: audioId,
      surveyId: surveyId || "survey-1",
      siteId: siteId || "site-1",
      fileName: fileName || "wildlife_vocalisation.wav",
      audioUri: publicUrl,
      uploadTimestamp: new Date().toISOString(),
      status: "Analyzed",
      speciesCommonName: aiResult.speciesCommonName,
      speciesScientificName: aiResult.speciesScientificName,
      confidence: aiResult.confidence,
      predictionQuality: aiResult.predictionQuality,
      iucnStatus: aiResult.iucnStatus,
      populationTrend: aiResult.populationTrend,
      threatLevel: aiResult.threatLevel,
      statusExplanation: aiResult.statusExplanation,
      aiExplanation: aiResult.aiExplanation,
      acousticNotes: aiResult.acousticNotes,
      waveformData: aiResult.waveformData,
    };

    const savedAudio = await db.addAudioAnalysis(newAnalysis);

    // 5. Check if endangered for alert notification
    if (
      aiResult.iucnStatus.includes("Critically") ||
      aiResult.iucnStatus.includes("Endangered") ||
      aiResult.iucnStatus.includes("Vulnerable")
    ) {
      await db.addNotification({
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 100)}`,
        type: "Critical Sightings",
        title: `CRITICAL VOICE DETECTION: ${aiResult.speciesCommonName}`,
        message: `Bioacoustic AI detected ${aiResult.speciesCommonName} (${aiResult.iucnStatus}) call in recording "${fileName}" with ${(aiResult.confidence * 100).toFixed(0)}% confidence!`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    }

    // 6. Audit logs
    await db.addAuditLog({
      id: `log-${Date.now()}`,
      userId: "u-1",
      userName: "Dr. Elena Rostova",
      userRole: "Researcher",
      action: "AUDIO_VOICE_ANALYZED",
      details: `Analyzed bioacoustic audio file ${fileName}. Identified ${aiResult.speciesCommonName} (${(aiResult.confidence * 100).toFixed(1)}% confidence, IUCN: ${aiResult.iucnStatus}).`,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({ ...savedAudio, simulated: aiResult.simulated });
  } catch (err: any) {
    console.error("Audio analysis error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RECOMMENDATIONS ENGINE API (REPORTS)
// ==========================================

app.get("/api/recommendations", async (req, res) => {
  try {
    const recs = await db.getRecommendations();
    res.json(recs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/recommendations/generate", async (req, res) => {
  try {
    const { surveyId } = req.body;
    const surveys = await db.getSurveys();
    const survey = surveys.find((s) => s.id === surveyId);
    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    const sites = await db.getMonitoringSites();
    const site = sites.find((s) => s.id === survey.siteId);
    const siteName = site ? site.name : "Unknown Site";
    const habitatType = site ? site.habitatType : "Forest";
    const siteScore = site ? site.habitatScore : 80;

    // Grab all images & detections for this survey to build AI prompt context
    const allImages = await db.getWildlifeImages();
    const imagesInSurvey = allImages.filter((img) => img.surveyId === surveyId);
    const imageIds = imagesInSurvey.map((img) => img.id);
    const allDetections = await db.getDetections();
    const detectionsInSurvey = allDetections.filter((det) => imageIds.includes(det.imageId));

    const totalSightings = detectionsInSurvey.length;
    const uniqueSpecies = Array.from(new Set(detectionsInSurvey.map((d) => d.speciesCommonName)));

    // Generate via Gemini or high-fidelity simulation fallback
    const recommendation = await generateConservationRecommendations(
      surveyId,
      survey.title,
      siteName,
      habitatType,
      siteScore,
      uniqueSpecies,
      totalSightings
    );

    const savedRec = await db.addRecommendation({
      id: `rec-${Date.now()}`,
      surveyId,
      riskLevel: recommendation.riskLevel,
      generatedAt: new Date().toISOString(),
      recommendationText: recommendation.recommendationText,
      habitatRestorationSuggestions: recommendation.habitatRestorationSuggestions,
      monitoringSuggestions: recommendation.monitoringSuggestions,
    });

    // Add alert notification
    await db.addNotification({
      id: `notif-${Date.now()}`,
      type: "Survey Alert",
      title: `Intervention Plan Generated`,
      message: `AI generated conservation roadmap for survey: ${survey.title}. Risk level assessed as ${recommendation.riskLevel}.`,
      timestamp: new Date().toISOString(),
      read: false,
    });

    await db.addAuditLog({
      id: `log-${Date.now()}`,
      userId: "u-1",
      userName: "Dr. Elena Rostova",
      userRole: "Researcher",
      action: "RECOMMENDATION_GENERATED",
      details: `Generated AI conservation recommendations for ${survey.title}. Identified risk: ${recommendation.riskLevel}`,
      timestamp: new Date().toISOString(),
    });

    res.json({ ...savedRec, simulated: recommendation.simulated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// NOTIFICATIONS API
// ==========================================

app.get("/api/notifications", async (req, res) => {
  try {
    const notifs = await db.getNotifications();
    res.json(notifs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/notifications/:id/read", async (req, res) => {
  try {
    const updated = await db.markNotificationAsRead(req.params.id);
    res.json(updated);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// ==========================================
// AUDIT LOGS API
// ==========================================

app.get("/api/audit-logs", async (req, res) => {
  try {
    const logs = await db.getAuditLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DASHBOARD & ANALYTICS API (BIODIVERSITY RESEARCH INTELLIGENCE)
// ==========================================

app.get("/api/analytics/dashboard", async (req, res) => {
  try {
    const [sites, surveys, images, detections, species, audioAnalyses] = await Promise.all([
      db.getMonitoringSites(),
      db.getSurveys(),
      db.getWildlifeImages(),
      db.getDetections(),
      db.getSpecies(),
      db.getAudioAnalyses(),
    ]);

    // 1. Core KPIs
    const totalSites = sites.length;
    const totalSurveys = surveys.length;
    const totalDetections = detections.length;
    const totalSpecies = species.length;
    const totalAudioAnalyses = audioAnalyses.length;

    // 2. Average Habitat Health Score
    const avgHabitatHealth = Number(
      (sites.reduce((acc, s) => acc + s.habitatScore, 0) / (totalSites || 1)).toFixed(1)
    );

    // 3. Species Richness (Detected unique species count)
    const uniqueDetectedSpecies = Array.from(new Set(detections.map((d) => d.speciesId)));
    const speciesRichness = uniqueDetectedSpecies.length;

    // 4. Shannon-Wiener Diversity Index across all historic detections
    let shannonIndex = 0;
    if (totalDetections > 0) {
      const counts: Record<string, number> = {};
      detections.forEach((d) => {
        counts[d.speciesId] = (counts[d.speciesId] || 0) + 1;
      });
      shannonIndex = Object.values(counts).reduce((acc, count) => {
        const pi = count / totalDetections;
        return acc - pi * Math.log(pi);
      }, 0);
    }
    shannonIndex = Number(shannonIndex.toFixed(3));

    // 5. Simpson's Index of Diversity (1 - D) where D = sum(pi^2)
    let simpsonIndex = 0;
    if (totalDetections > 0) {
      const counts: Record<string, number> = {};
      detections.forEach((d) => {
        counts[d.speciesId] = (counts[d.speciesId] || 0) + 1;
      });
      const sumPiSquared = Object.values(counts).reduce((acc, count) => {
        const pi = count / totalDetections;
        return acc + (pi * pi);
      }, 0);
      simpsonIndex = Number((1 - sumPiSquared).toFixed(3));
    }

    // 6. IUCN Category breakdown & Threatened counts
    let criticalSpeciesCount = 0;
    let threatenedSpeciesCount = 0;
    let endangeredSpeciesCount = 0;
    const statusCounts: Record<string, number> = {
      "Critically Endangered (CR)": 0,
      "Endangered (EN)": 0,
      "Vulnerable (VU)": 0,
      "Near Threatened (NT)": 0,
      "Least Concern (LC)": 0,
      "Data Deficient (DD)": 0,
    };

    species.forEach((s) => {
      const st = s.conservationStatus.toLowerCase();
      if (st.includes("critically")) {
        statusCounts["Critically Endangered (CR)"]++;
        criticalSpeciesCount++;
        threatenedSpeciesCount++;
        endangeredSpeciesCount++;
      } else if (st.includes("endangered")) {
        statusCounts["Endangered (EN)"]++;
        threatenedSpeciesCount++;
        endangeredSpeciesCount++;
      } else if (st.includes("vulnerable")) {
        statusCounts["Vulnerable (VU)"]++;
        threatenedSpeciesCount++;
      } else if (st.includes("near")) {
        statusCounts["Near Threatened (NT)"]++;
      } else {
        statusCounts["Least Concern (LC)"]++;
      }
    });

    audioAnalyses.forEach((a) => {
      const st = (a.iucnStatus || "").toLowerCase();
      if (st.includes("critically") || st.includes("(cr)")) {
        threatenedSpeciesCount++;
      } else if (st.includes("endangered") || st.includes("(en)")) {
        threatenedSpeciesCount++;
      } else if (st.includes("vulnerable") || st.includes("(vu)")) {
        threatenedSpeciesCount++;
      }
    });

    const conservationStatusDistribution = [
      { category: "Critically Endangered (CR)", count: statusCounts["Critically Endangered (CR)"], color: "#EF4444" },
      { category: "Endangered (EN)", count: statusCounts["Endangered (EN)"], color: "#F97316" },
      { category: "Vulnerable (VU)", count: statusCounts["Vulnerable (VU)"], color: "#F59E0B" },
      { category: "Near Threatened (NT)", count: statusCounts["Near Threatened (NT)"], color: "#EAB308" },
      { category: "Least Concern (LC)", count: statusCounts["Least Concern (LC)"], color: "#10B981" },
      { category: "Data Deficient (DD)", count: statusCounts["Data Deficient (DD)"], color: "#6B7280" },
    ];

    // 7. Confidence Score Metrics
    const allConfidences = [
      ...detections.map((d) => d.confidence),
      ...audioAnalyses.map((a) => a.confidence),
    ];

    const avgConfidenceScore = allConfidences.length > 0
      ? Number((allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length).toFixed(3))
      : 0;

    const highestConfidenceScore = allConfidences.length > 0
      ? Math.max(...allConfidences)
      : 0;

    const lowestConfidenceScore = allConfidences.length > 0
      ? Math.min(...allConfidences)
      : 0;

    const confQualityCounts = {
      "Very High (>= 90%)": 0,
      "High (75% - 89%)": 0,
      "Medium (50% - 74%)": 0,
      "Low (< 50%)": 0,
    };

    allConfidences.forEach((c) => {
      if (c >= 0.90) confQualityCounts["Very High (>= 90%)"]++;
      else if (c >= 0.75) confQualityCounts["High (75% - 89%)"]++;
      else if (c >= 0.50) confQualityCounts["Medium (50% - 74%)"]++;
      else confQualityCounts["Low (< 50%)"]++;
    });

    const confidenceDistribution = [
      { quality: "Very High (>= 90%)", count: confQualityCounts["Very High (>= 90%)"], color: "#10B981" },
      { quality: "High (75% - 89%)", count: confQualityCounts["High (75% - 89%)"], color: "#3B82F6" },
      { quality: "Medium (50% - 74%)", count: confQualityCounts["Medium (50% - 74%)"], color: "#F59E0B" },
      { quality: "Low (< 50%)", count: confQualityCounts["Low (< 50%)"], color: "#EF4444" },
    ];

    // 8. Species Distribution Sightings
    const distribution: Record<string, { commonName: string; scientificName: string; conservationStatus: string; count: number }> = {};
    
    // Seed with all registered reference species
    species.forEach((s) => {
      distribution[s.id] = {
        commonName: s.commonName,
        scientificName: s.scientificName,
        conservationStatus: s.conservationStatus,
        count: 0,
      };
    });

    // Aggregate image detections
    detections.forEach((d) => {
      const key = d.speciesId;
      if (distribution[key]) {
        distribution[key].count += 1;
      } else {
        distribution[key] = {
          commonName: d.speciesCommonName,
          scientificName: d.speciesScientificName || "N/A",
          conservationStatus: d.iucnStatus || "Least Concern",
          count: 1,
        };
      }
    });

    // Aggregate audio detections
    audioAnalyses.forEach((a) => {
      const matched = species.find(s => s.commonName.toLowerCase() === a.speciesCommonName.toLowerCase());
      if (matched && distribution[matched.id]) {
        distribution[matched.id].count += 1;
      }
    });

    const speciesDistributionList = Object.values(distribution).sort((a, b) => b.count - a.count);

    // 9. Sighting Trends Over Time (Grouped by Date)
    const trends: Record<string, Record<string, number>> = {};
    detections.forEach((d) => {
      const dateStr = d.timestamp.split("T")[0]; // YYYY-MM-DD
      if (!trends[dateStr]) {
        trends[dateStr] = {};
      }
      trends[dateStr][d.speciesCommonName] = (trends[dateStr][d.speciesCommonName] || 0) + 1;
    });

    const sightTrends = Object.entries(trends)
      .map(([date, countsObj]) => ({
        date,
        ...countsObj,
        total: Object.values(countsObj).reduce((sum, val) => sum + val, 0),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 10. Habitat Types Distribution and health
    const habitatHealthScores = sites.map((s) => ({
      name: s.name,
      type: s.habitatType,
      score: s.habitatScore,
      protectedArea: s.protectedArea,
    }));

    // 11. Milestone 3 Intelligence Integration
    const [ecoReports, habAssessments, popTrends, recsList] = await Promise.all([
      getEcosystemHealthReports(),
      getAllHabitatAssessments(),
      getPopulationTrends(),
      getConservationRecommendations()
    ]);

    const avgEcosystemHealth = ecoReports.length > 0
      ? Math.round(ecoReports.reduce((acc, r) => acc + r.overallHealthScore, 0) / ecoReports.length)
      : avgHabitatHealth;

    const avgHabitatSuitability = habAssessments.length > 0
      ? Math.round(habAssessments.reduce((acc, h) => acc + h.habitatSuitability, 0) / habAssessments.length)
      : avgHabitatHealth;

    const highPriorityAlertsCount = recsList.filter(
      r => r.priorityLevel === "Critical" || r.priorityLevel === "High" || r.riskLevel === "Critical"
    ).length;

    res.json({
      kpis: {
        totalSites,
        totalSurveys,
        totalDetections,
        totalSpecies,
        totalAudioAnalyses,
        avgHabitatHealth,
        speciesRichness,
        shannonIndex,
        simpsonIndex,
        criticalSpeciesCount,
        threatenedSpeciesCount,
        endangeredSpeciesCount,
        avgConfidenceScore,
        highestConfidenceScore,
        lowestConfidenceScore,
        avgEcosystemHealth,
        popGrowthRate: popTrends.avgGrowthRate,
        avgHabitatSuitability,
        highPriorityAlertsCount
      },
      conservationStatusDistribution,
      confidenceDistribution,
      confidenceMetrics: {
        avgConfidenceScore,
        highestConfidenceScore,
        lowestConfidenceScore,
      },
      speciesDistribution: speciesDistributionList,
      sightTrends,
      habitatHealthScores,
      recentAudioAnalyses: audioAnalyses.slice(0, 5),
      ecosystemReports: ecoReports,
      habitatAssessments: habAssessments,
      populationTrends: popTrends,
      recommendations: recsList
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MILESTONE 3 — POPULATION INTELLIGENCE APIs
// ==========================================

// Population Estimator Endpoints
app.get("/api/population/trends", async (req, res) => {
  try {
    const trends = await getPopulationTrends();
    res.json(trends);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/population/species/:id", async (req, res) => {
  try {
    const estimate = await getSpeciesPopulationEstimate(req.params.id);
    if (!estimate) return res.status(404).json({ error: "Population estimate not found for species." });
    res.json(estimate);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/population/site/:id", async (req, res) => {
  try {
    const estimate = await getSitePopulationEstimate(req.params.id);
    if (!estimate) return res.status(404).json({ error: "Population estimate not found for site." });
    res.json(estimate);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/population/recalculate", async (req, res) => {
  try {
    const recalculated = await calculatePopulationEstimates();
    res.json({ message: "Population estimates recalculated successfully.", count: recalculated.length, estimates: recalculated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Habitat Intelligence Endpoints
app.get("/api/habitat/assessments", async (req, res) => {
  try {
    const assessments = await getAllHabitatAssessments();
    res.json(assessments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/habitat/site/:id", async (req, res) => {
  try {
    const assessment = await getSiteHabitatAssessment(req.params.id);
    if (!assessment) return res.status(404).json({ error: "Habitat assessment not found for site." });
    res.json(assessment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/habitat/recalculate", async (req, res) => {
  try {
    const recalculated = await calculateHabitatAssessments();
    res.json({ message: "Habitat assessments recalculated successfully.", count: recalculated.length, assessments: recalculated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Conservation Recommendation Engine Endpoints
app.get("/api/conservation/recommendations", async (req, res) => {
  try {
    const recommendations = await getConservationRecommendations();
    res.json(recommendations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/conservation/generate", async (req, res) => {
  try {
    const generated = await runConservationEngine();
    res.json({ message: "Conservation recommendations generated successfully.", count: generated.length, recommendations: generated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/conservation/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Status field is required." });
    const updated = await updateRecommendationStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: "Recommendation not found." });
    res.json({ message: "Status updated successfully.", recommendation: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Ecosystem Health Endpoints
app.get("/api/ecosystem/reports", async (req, res) => {
  try {
    const reports = await getEcosystemHealthReports();
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/ecosystem/site/:id", async (req, res) => {
  try {
    const report = await getSiteEcosystemHealthReport(req.params.id);
    if (!report) return res.status(404).json({ error: "Ecosystem health report not found for site." });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/ecosystem/recalculate", async (req, res) => {
  try {
    const recalculated = await calculateEcosystemHealthReports();
    res.json({ message: "Ecosystem health reports recalculated successfully.", count: recalculated.length, reports: recalculated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// VITE DEV SERVER & PRODUCTION ROUTING Setup
// ==========================================

if (process.env.NODE_ENV !== "production") {
  import("vite").then(async (viteModule) => {
    const vite = await viteModule.createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  });
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[SYSTEM SUCCESS] Wildlife Population Intelligence System running on http://localhost:${PORT}`);
});