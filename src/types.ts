export enum UserRole {
  ADMINISTRATOR = "administrator",
  MUNICIPAL_OFFICER = "municipal_officer",
  POLLUTION_CONTROL_OFFICER = "pollution_control_officer",
  ANALYST = "analyst",
  CITIZEN = "citizen",
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface City {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
}

export interface Ward {
  id: string;
  cityId: string;
  name: string;
  code: string;
  populationDensity: number; // people/sq km
  hospitalsCount: number;
  schoolsCount: number;
  areaSqKm: number;
  coordinates: [number, number][]; // Polygons for ward boundary display
  centroid: [number, number];
}

export interface Station {
  id: string;
  name: string;
  wardId: string;
  latitude: number;
  longitude: number;
  status: "active" | "inactive" | "maintenance";
  installationDate: string;
}

export interface AQIRecord {
  id: string;
  timestamp: string;
  cityId: string;
  wardId: string;
  stationId: string | null;
  latitude: number;
  longitude: number;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  co: number;
  o3: number;
}

export interface WeatherRecord {
  id: string;
  timestamp: string;
  wardId: string;
  temperature: number; // °C
  humidity: number; // %
  windSpeed: number; // km/h
  windDirection: string; // N, NE, E, SE, S, SW, W, NW
  windAngle: number; // degrees
  rainfall: number; // mm
}

export interface TrafficRecord {
  id: string;
  timestamp: string;
  wardId: string;
  densityScore: number; // 0 to 100
  congestionIndex: number; // 1.0 to 5.0
  averageSpeed: number; // km/h
}

export interface ConstructionRecord {
  id: string;
  timestamp: string;
  wardId: string;
  activeSites: number;
  complianceScore: number; // 0 to 100 (dust suppression)
  latitude: number;
  longitude: number;
  description: string;
}

export interface WasteBurningRecord {
  id: string;
  timestamp: string;
  wardId: string;
  reportedIncidents: number;
  estimatedSeverity: "low" | "medium" | "high";
  latitude: number;
  longitude: number;
}

export interface IndustryRecord {
  id: string;
  wardId: string;
  name: string;
  industryType: string;
  emissionCategory: "low" | "medium" | "high";
  latitude: number;
  longitude: number;
  status: "active" | "inactive";
}

export interface AQIPrediction {
  id: string;
  timestamp: string; // The time the prediction is made
  forecastTime: string; // The target time for the forecast
  wardId: string;
  predictedAqi: number;
  pm25Predicted: number;
  pm10Predicted: number;
  category: string;
  confidenceScore: number; // 0 to 100
}

export interface PollutionHotspot {
  id: string;
  timestamp: string;
  wardId: string;
  latitude: number;
  longitude: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  aqiValue: number;
  dominantPollutant: string;
  sizeRadiusMeters: number;
}

export interface SourceAttribution {
  id: string;
  timestamp: string;
  wardId: string;
  trafficContribution: number; // percentage
  constructionContribution: number; // percentage
  industryContribution: number; // percentage
  wasteBurningContribution: number; // percentage
  roadDustContribution: number; // percentage
  confidenceScore: number; // percentage
  dominantSource: string;
}

export interface EnforcementRecommendation {
  id: string;
  timestamp: string;
  wardId: string;
  priorityScore: number; // 0 to 100
  priorityLevel: "low" | "medium" | "high" | "critical";
  reason: string;
  evidence: {
    currentAqi: number;
    predictedAqi: number;
    trafficDensity: number;
    constructionSites: number;
    wasteBurningIncidents: number;
    sourceConfidence: number;
  };
  suggestedAction: string;
  estimatedImpact: "low" | "medium" | "high";
  assignedOfficer: string | null;
  status: "pending" | "dispatched" | "resolved" | "dismissed";
  inspectedAt: string | null;
  inspectionNotes: string | null;
}

export interface CitizenComplaint {
  id: string;
  timestamp: string;
  citizenName: string;
  citizenPhone: string;
  wardId: string;
  latitude: number;
  longitude: number;
  complaintType: "waste_burning" | "construction_dust" | "industrial_smoke" | "heavy_traffic" | "other";
  description: string;
  imageUrl: string | null;
  status: "submitted" | "in_investigation" | "resolved";
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  userRole: UserRole;
  action: string;
  details: string;
}
