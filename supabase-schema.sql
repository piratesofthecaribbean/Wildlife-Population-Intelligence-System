-- Supabase PostgreSQL normalized schema for the Wildlife Population Intelligence System
-- This script creates all tables, establishes foreign keys with cascade deletion,
-- configures indexes for efficient querying, and seeds initial data.

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Researcher', 'Forest Officer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. MONITORING SITES TABLE
CREATE TABLE IF NOT EXISTS monitoring_sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  protected_area TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  habitat_type TEXT NOT NULL CHECK (habitat_type IN ('Forest', 'Savanna', 'Wetland', 'Desert', 'Grassland')),
  habitat_score INTEGER NOT NULL CHECK (habitat_score >= 0 AND habitat_score <= 100),
  canopy_cover INTEGER NOT NULL CHECK (canopy_cover >= 0 AND canopy_cover <= 100),
  water_availability TEXT NOT NULL CHECK (water_availability IN ('High', 'Medium', 'Low')),
  human_disturbance TEXT NOT NULL CHECK (human_disturbance IN ('None', 'Low', 'Medium', 'High')),
  avg_temperature DOUBLE PRECISION NOT NULL
);

-- 3. WILDLIFE SURVEYS TABLE
CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  site_id TEXT REFERENCES monitoring_sites(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Active', 'Completed', 'Planned')),
  surveyor_name TEXT NOT NULL
);

-- 4. SPECIES REFERENCE TABLE
CREATE TABLE IF NOT EXISTS species (
  id TEXT PRIMARY KEY,
  common_name TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  conservation_status TEXT NOT NULL CHECK (conservation_status IN ('Critically Endangered', 'Endangered', 'Vulnerable', 'Near Threatened', 'Least Concern')),
  group_name TEXT NOT NULL CHECK (group_name IN ('Mammal', 'Bird', 'Reptile', 'Amphibian')),
  population_estimate TEXT NOT NULL,
  description TEXT
);

-- 5. WILDLIFE IMAGES TABLE
CREATE TABLE IF NOT EXISTS wildlife_images (
  id TEXT PRIMARY KEY,
  survey_id TEXT REFERENCES surveys(id) ON DELETE CASCADE,
  site_id TEXT REFERENCES monitoring_sites(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  image_uri TEXT NOT NULL,
  upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Analyzed', 'Failed')),
  species_count INTEGER NOT NULL DEFAULT 0,
  highest_confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  species_richness INTEGER NOT NULL DEFAULT 0,
  diversity_index DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  habitat_classification TEXT,
  habitat_health_score INTEGER CHECK (habitat_health_score >= 0 AND habitat_health_score <= 100),
  habitat_degradation_level TEXT CHECK (habitat_degradation_level IN ('None', 'Low', 'Medium', 'High')),
  habitat_notes TEXT
);

-- 6. AI DETECTIONS TABLE (BOUNDING BOXES & IUCN CLASSIFICATION)
CREATE TABLE IF NOT EXISTS detections (
  id TEXT PRIMARY KEY,
  image_id TEXT REFERENCES wildlife_images(id) ON DELETE CASCADE,
  species_id TEXT REFERENCES species(id) ON DELETE CASCADE,
  species_common_name TEXT NOT NULL,
  species_scientific_name TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  box_x DOUBLE PRECISION NOT NULL, -- percentage offset from left (0-100)
  box_y DOUBLE PRECISION NOT NULL, -- percentage offset from top (0-100)
  box_width DOUBLE PRECISION NOT NULL, -- width as percentage (0-100)
  box_height DOUBLE PRECISION NOT NULL, -- height as percentage (0-100)
  prediction_quality TEXT DEFAULT 'High',
  iucn_status TEXT DEFAULT 'Least Concern',
  population_trend TEXT DEFAULT 'Stable',
  threat_level TEXT DEFAULT 'Low',
  status_explanation TEXT DEFAULT '',
  ai_explanation JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6B. WILDLIFE VOICE AUDIO ANALYSES TABLE
CREATE TABLE IF NOT EXISTS audio_analyses (
  id TEXT PRIMARY KEY,
  survey_id TEXT REFERENCES surveys(id) ON DELETE CASCADE,
  site_id TEXT REFERENCES monitoring_sites(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  audio_uri TEXT NOT NULL,
  upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Analyzed', 'Failed')),
  species_common_name TEXT NOT NULL,
  species_scientific_name TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  prediction_quality TEXT NOT NULL CHECK (prediction_quality IN ('Very High', 'High', 'Medium', 'Low')),
  iucn_status TEXT NOT NULL,
  population_trend TEXT NOT NULL,
  threat_level TEXT NOT NULL,
  status_explanation TEXT NOT NULL,
  ai_explanation JSONB NOT NULL DEFAULT '{}'::jsonb,
  acoustic_notes TEXT NOT NULL,
  waveform_data JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- 7. CONSERVATION RECOMMENDATIONS (REPORTS) TABLE
CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  survey_id TEXT REFERENCES surveys(id) ON DELETE CASCADE,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Critical', 'Elevated', 'Stable', 'Favorable')),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  recommendation_text TEXT NOT NULL,
  habitat_restoration_suggestions TEXT[] NOT NULL DEFAULT '{}',
  monitoring_suggestions TEXT[] NOT NULL DEFAULT '{}'
);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('Critical Sightings', 'Habitat Warning', 'Survey Alert', 'System Notification')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  read BOOLEAN NOT NULL DEFAULT FALSE
);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CREATE INDEXES FOR OPTIMAL QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_surveys_site_id ON surveys(site_id);
CREATE INDEX IF NOT EXISTS idx_wildlife_images_survey_id ON wildlife_images(survey_id);
CREATE INDEX IF NOT EXISTS idx_wildlife_images_site_id ON wildlife_images(site_id);
CREATE INDEX IF NOT EXISTS idx_detections_image_id ON detections(image_id);
CREATE INDEX IF NOT EXISTS idx_detections_species_id ON detections(species_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_survey_id ON recommendations(survey_id);

-- SEED DATA

-- Seed Users
INSERT INTO users (id, name, email, role, created_at) VALUES
('u-1', 'Dr. Elena Rostova', 'elena.r@wildlife.gov', 'Researcher', '2026-01-10 08:00:00+00'),
('u-2', 'Chief Warden John Mpata', 'j.mpata@wildlife.gov', 'Forest Officer', '2026-01-12 09:30:00+00'),
('u-3', 'System Administrator', 'admin@wildlife.gov', 'Admin', '2026-01-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Seed Monitoring Sites
INSERT INTO monitoring_sites (id, name, protected_area, latitude, longitude, habitat_type, habitat_score, canopy_cover, water_availability, human_disturbance, avg_temperature) VALUES
('site-1', 'Serengeti Corridor North', 'Serengeti National Park', -2.1543, 34.6852, 'Savanna', 84, 15, 'Medium', 'Low', 26.5),
('site-2', 'Amazon Basin Sector IV', 'Jau National Park', -1.9567, -61.5034, 'Forest', 92, 85, 'High', 'None', 24.2),
('site-3', 'Yellowstone River Bend', 'Yellowstone National Park', 44.4280, -110.5885, 'Grassland', 78, 35, 'High', 'Medium', 12.8),
('site-4', 'Sundarbans Delta Edge', 'Sundarbans Reserve Forest', 21.9497, 89.1833, 'Wetland', 75, 60, 'High', 'Medium', 27.8)
ON CONFLICT (id) DO NOTHING;

-- Seed Surveys
INSERT INTO surveys (id, title, description, site_id, start_date, end_date, status, surveyor_name) VALUES
('survey-1', 'Big Cats Population Census', 'Annual tracking of apex predators and their primary prey across the North Corridor.', 'site-1', '2026-05-01', '2026-06-30', 'Completed', 'Dr. Elena Rostova'),
('survey-2', 'Rainforest Canopy Biodiversity Study', 'Assessing avian and primate population densities in primary forest canopy cover.', 'site-2', '2026-06-15', '2026-08-15', 'Active', 'Dr. Elena Rostova'),
('survey-3', 'Sunderbans Tiger Habitat Survey', 'Monitoring tiger movement trails and assessing mangrove degradation levels.', 'site-4', '2026-08-01', '2026-09-30', 'Planned', 'Warden John Mpata')
ON CONFLICT (id) DO NOTHING;

-- Seed Species
INSERT INTO species (id, common_name, scientific_name, conservation_status, group_name, population_estimate, description) VALUES
('sp-1', 'African Lion', 'Panthera leo', 'Vulnerable', 'Mammal', '20,000 - 30,000', 'Apex predator of the African savanna. Key indicator of ecosystem food web health.'),
('sp-2', 'Bengal Tiger', 'Panthera tigris tigris', 'Endangered', 'Mammal', '3,500 - 4,000', 'Keystone species in mangrove forests and dry deciduous woodlands.'),
('sp-3', 'Jaguar', 'Panthera onca', 'Near Threatened', 'Mammal', '15,000', 'Solitary, opportunistic hunter of the tropical rain forests.'),
('sp-4', 'Bald Eagle', 'Haliaeetus leucocephalus', 'Least Concern', 'Bird', '300,000', 'North American bird of prey, high-fidelity indicator of river ecosystem and fish stock health.'),
('sp-5', 'Scarlet Macaw', 'Ara macao', 'Least Concern', 'Bird', '50,000', 'Large, colorful neotropical parrot, highly sensitive to primary canopy loss.'),
('sp-6', 'Black Rhinoceros', 'Diceros bicornis', 'Critically Endangered', 'Mammal', '6,000', 'Browsing rhino species native to eastern and southern Africa. Faces extreme poaching risk.')
ON CONFLICT (id) DO NOTHING;

-- Seed Wildlife Images
INSERT INTO wildlife_images (id, survey_id, site_id, file_name, image_uri, upload_timestamp, status, species_count, highest_confidence, species_richness, diversity_index, habitat_classification, habitat_health_score, habitat_degradation_level, habitat_notes) VALUES
('img-1', 'survey-1', 'site-1', 'savanna_lions.jpg', '/assets/lion_mock.jpg', '2026-06-10 14:22:15+00', 'Analyzed', 3, 0.96, 1, 0.0, 'Open Woodland Savanna', 82, 'Low', 'Excellent dry-season grass cover. High animal activity detected near water hole.'),
('img-2', 'survey-2', 'site-2', 'amazon_macaw.jpg', '/assets/macaw_mock.jpg', '2026-06-25 11:05:40+00', 'Analyzed', 2, 0.94, 1, 0.0, 'Primary Rainforest Canopy', 95, 'None', 'Intact high-canopy vegetation. Zero noise or human encroachment indicators.'),
('img-3', 'survey-1', 'site-1', 'black_rhino_night.jpg', '/assets/rhino_mock.jpg', '2026-06-28 22:45:10+00', 'Analyzed', 1, 0.98, 1, 0.0, 'Savanna Scrubland', 85, 'None', 'Night vision infrared detection confirms movement of endangered megafauna.')
ON CONFLICT (id) DO NOTHING;

-- Seed AI Detections
INSERT INTO detections (id, image_id, species_id, species_common_name, species_scientific_name, confidence, box_x, box_y, box_width, box_height, timestamp) VALUES
('det-1', 'img-1', 'sp-1', 'African Lion', 'Panthera leo', 0.96, 10.0, 15.0, 35.0, 60.0, '2026-06-10 14:22:15+00'),
('det-2', 'img-1', 'sp-1', 'African Lion', 'Panthera leo', 0.92, 45.0, 20.0, 30.0, 50.0, '2026-06-10 14:22:15+00'),
('det-3', 'img-1', 'sp-1', 'African Lion', 'Panthera leo', 0.88, 75.0, 35.0, 20.0, 40.0, '2026-06-10 14:22:15+00'),
('det-4', 'img-2', 'sp-5', 'Scarlet Macaw', 'Ara macao', 0.94, 25.0, 10.0, 25.0, 45.0, '2026-06-25 11:05:40+00'),
('det-5', 'img-2', 'sp-5', 'Scarlet Macaw', 'Ara macao', 0.91, 55.0, 12.0, 25.0, 45.0, '2026-06-25 11:05:40+00'),
('det-6', 'img-3', 'sp-6', 'Black Rhinoceros', 'Diceros bicornis', 0.98, 20.0, 25.0, 65.0, 55.0, '2026-06-28 22:45:10+00')
ON CONFLICT (id) DO NOTHING;

-- Seed Recommendations
INSERT INTO recommendations (id, survey_id, risk_level, generated_at, recommendation_text, habitat_restoration_suggestions, monitoring_suggestions) VALUES
('rec-1', 'survey-1', 'Stable', '2026-07-01 09:00:00+00', 'Predator-prey index remains stable in Serengeti Corridor North. Lion pride size is solid. However, grass cover is showing early signs of over-grazing by large migratory herds.', ARRAY['Monitor water hold sedimentation and carry out desiltation before heavy rains.', 'Implement controlled rotation burn programs to stimulate native perennial grass species.'], ARRAY['Increase camera trap frequency on western exit routes to map migratory pride movements.', 'Deploy collars on the lead lioness of pride A to track pack hunting efficiency during dry season.']),
('rec-2', 'survey-2', 'Favorable', '2026-07-03 10:30:00+00', 'Excellent canopy structure in Amazon Basin Sector IV. Avian richness is exceptional. Macaw populations are nesting securely. No immediate ecological risks identified.', ARRAY['Maintain current strict anti-logging patrol buffer boundaries.'], ARRAY['Implement acoustic bio-sound sensors to monitor night primate vocalisations.', 'Conduct seasonal ground canopy density comparisons via satellite index data.'])
ON CONFLICT (id) DO NOTHING;

-- Seed Notifications
INSERT INTO notifications (id, type, title, message, timestamp, read) VALUES
('notif-1', 'Critical Sightings', 'Critically Endangered Sighting', 'Black Rhinoceros detected at site: Serengeti Corridor North on camera trap img-3.', '2026-06-28 22:46:00+00', false),
('notif-2', 'Habitat Warning', 'Water Availability Alert', 'Sundarbans Delta Edge is showing historically low fresh water ingress indicators. Salinity rises.', '2026-07-02 16:00:00+00', false),
('notif-3', 'Survey Alert', 'Survey Completed', 'Census Survey ''Big Cats Population Census'' has been successfully closed and analyzed.', '2026-07-01 09:05:00+00', true)
ON CONFLICT (id) DO NOTHING;

-- Seed Audit Logs
INSERT INTO audit_logs (id, user_id, user_name, user_role, action, details, timestamp) VALUES
('log-1', 'u-1', 'Dr. Elena Rostova', 'Researcher', 'SURVEY_COMPLETED', 'Completed survey: Big Cats Population Census', '2026-07-01 09:01:00+00'),
('log-2', 'u-1', 'Dr. Elena Rostova', 'Researcher', 'IMAGE_ANALYSIS_SUCCESS', 'Successfully analyzed image: savanna_lions.jpg and detected 3 African Lion instances.', '2026-06-10 14:23:00+00')
ON CONFLICT (id) DO NOTHING;
