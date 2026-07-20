import fs from "fs";
import path from "path";
import { 
  User, UserRole, City, Ward, Station, AQIRecord, WeatherRecord, 
  TrafficRecord, ConstructionRecord, WasteBurningRecord, IndustryRecord, 
  AQIPrediction, PollutionHotspot, SourceAttribution, EnforcementRecommendation, 
  CitizenComplaint, AuditLog 
} from "../types.js";

const DATA_FILE = path.join(process.cwd(), "src", "server", "data.json");

interface DBStructure {
  users: User[];
  cities: City[];
  wards: Ward[];
  stations: Station[];
  aqiRecords: AQIRecord[];
  weatherRecords: WeatherRecord[];
  trafficRecords: TrafficRecord[];
  constructionRecords: ConstructionRecord[];
  wasteBurningRecords: WasteBurningRecord[];
  industries: IndustryRecord[];
  predictions: AQIPrediction[];
  hotspots: PollutionHotspot[];
  sourceAttributions: SourceAttribution[];
  recommendations: EnforcementRecommendation[];
  complaints: CitizenComplaint[];
  auditLogs: AuditLog[];
}

let db: DBStructure = {
  users: [],
  cities: [],
  wards: [],
  stations: [],
  aqiRecords: [],
  weatherRecords: [],
  trafficRecords: [],
  constructionRecords: [],
  wasteBurningRecords: [],
  industries: [],
  predictions: [],
  hotspots: [],
  sourceAttributions: [],
  recommendations: [],
  complaints: [],
  auditLogs: []
};

// Helper to save DB to file
export function saveDB() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save data.json:", error);
  }
}

// Generate beautiful simulated geospatial polygons around Bengaluru centroids
function generateWardPolygon(center: [number, number], radius = 0.015, pointsCount = 6): [number, number][] {
  const polygon: [number, number][] = [];
  for (let i = 0; i < pointsCount; i++) {
    const angle = (i / pointsCount) * Math.PI * 2;
    // Add minor variation to make it look like a real administrative boundary
    const jitter = radius * (0.85 + Math.random() * 0.3);
    const lat = center[0] + Math.sin(angle) * jitter;
    const lng = center[1] + Math.cos(angle) * jitter;
    polygon.push([lat, lng]);
  }
  // Close the polygon
  polygon.push([polygon[0][0], polygon[0][1]]);
  return polygon;
}

// Helper to seed initial data if data.json doesn't exist
export function initDB() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = fs.readFileSync(DATA_FILE, "utf8");
      db = JSON.parse(data);
      console.log(`Database loaded with ${db.aqiRecords.length} AQI records`);
      return;
    } catch (e) {
      console.error("Stale or invalid database file. Re-initializing seed data...", e);
    }
  }

  console.log("Initializing database with realistic Smart Cities seed data...");

  // 1. Roles & Users Seed
  db.users = [
    { id: "u-1", username: "admin", email: "admin@airtrace.gov.in", role: UserRole.ADMINISTRATOR, name: "Dr. Sandeep Kumar (Director, PCB)" },
    { id: "u-2", username: "officer_smartcity", email: "officer.sc@bengaluru.gov.in", role: UserRole.MUNICIPAL_OFFICER, name: "Ramesh Gowda (Smart City Commissioner)" },
    { id: "u-3", username: "officer_pollution", email: "compliance@kspcb.gov.in", role: UserRole.POLLUTION_CONTROL_OFFICER, name: "Priya Sharma (Enforcement Inspector)" },
    { id: "u-4", username: "analyst_science", email: "analyst@isro.res.in", role: UserRole.ANALYST, name: "Dr. Anjali Rao (GIS & Atmos Scientist)" },
    { id: "u-5", username: "citizen_demo", email: "ss.srinivasan2005@gmail.com", role: UserRole.CITIZEN, name: "Srinivasan S (Bengaluru Citizen)" }
  ];

  // 2. City
  const blrCityId = "c-1";
  db.cities = [{ id: blrCityId, name: "Bengaluru", state: "Karnataka", latitude: 12.9716, longitude: 77.5946 }];

  // 3. Wards (12 key wards of Bengaluru)
  const wardDetails = [
    { name: "Peenya Industrial Area", code: "W-140", popDensity: 11200, centroid: [13.0285, 77.5195] as [number, number], hospitals: 4, schools: 8 },
    { name: "Koramangala", code: "W-151", popDensity: 14500, centroid: [12.9352, 77.6244] as [number, number], hospitals: 8, schools: 12 },
    { name: "Whitefield", code: "W-84", popDensity: 6800, centroid: [12.9698, 77.7500] as [number, number], hospitals: 6, schools: 15 },
    { name: "Indiranagar", code: "W-80", popDensity: 12800, centroid: [12.9719, 77.6412] as [number, number], hospitals: 5, schools: 7 },
    { name: "HSR Layout", code: "W-174", popDensity: 11900, centroid: [12.9116, 77.6388] as [number, number], hospitals: 7, schools: 11 },
    { name: "Malleshwaram", code: "W-65", popDensity: 18400, centroid: [13.0031, 77.5702] as [number, number], hospitals: 9, schools: 14 },
    { name: "Jayanagar", code: "W-169", popDensity: 15600, centroid: [12.9308, 77.5838] as [number, number], hospitals: 11, schools: 10 },
    { name: "Hebbal", code: "W-22", popDensity: 9200, centroid: [13.0358, 77.5978] as [number, number], hospitals: 3, schools: 6 },
    { name: "Peenya Phase II", code: "W-141", popDensity: 10800, centroid: [13.0334, 77.5021] as [number, number], hospitals: 2, schools: 4 },
    { name: "Electronic City", code: "W-198", popDensity: 7500, centroid: [12.8452, 77.6602] as [number, number], hospitals: 5, schools: 9 },
    { name: "Shivaji Nagar", code: "W-92", popDensity: 23000, centroid: [12.9857, 77.5971] as [number, number], hospitals: 12, schools: 8 },
    { name: "Marathahalli", code: "W-85", popDensity: 13200, centroid: [12.9569, 77.7011] as [number, number], hospitals: 6, schools: 10 }
  ];

  db.wards = wardDetails.map((w, index) => {
    const wardId = `w-${index + 1}`;
    return {
      id: wardId,
      cityId: blrCityId,
      name: w.name,
      code: w.code,
      populationDensity: w.popDensity,
      hospitalsCount: w.hospitals,
      schoolsCount: w.schools,
      areaSqKm: Math.floor(5 + Math.random() * 8),
      centroid: w.centroid,
      coordinates: generateWardPolygon(w.centroid, 0.012 + Math.random() * 0.005)
    };
  });

  // 4. Stations (8 Active CACQMS)
  const stationNames = [
    "KSPCB Peenya Station",
    "KSPCB Koramangala Station",
    "Whitefield ITPL Station",
    "Indiranagar Defence Colony Station",
    "Jayanagar 4th Block Station",
    "Hebbal Highway Station",
    "Electronic City Tech Park Station",
    "Shivaji Nagar Bus Terminus Station"
  ];
  const stationWards = ["w-1", "w-2", "w-3", "w-4", "w-7", "w-8", "w-10", "w-11"];

  db.stations = stationNames.map((name, idx) => {
    const ward = db.wards.find(w => w.id === stationWards[idx])!;
    return {
      id: `s-${idx + 1}`,
      name,
      wardId: ward.id,
      latitude: ward.centroid[0] + (Math.random() - 0.5) * 0.003,
      longitude: ward.centroid[1] + (Math.random() - 0.5) * 0.003,
      status: "active",
      installationDate: "2023-04-12"
    };
  });

  // 5. Industries Seed (Mainly around Peenya and Peenya Phase II)
  db.industries = [
    { id: "i-1", wardId: "w-1", name: "Peenya Electroplaters Ltd", industryType: "Metal Finishing & Electroplating", emissionCategory: "high", latitude: 13.029, longitude: 77.518, status: "active" },
    { id: "i-2", wardId: "w-1", name: "Modern Foundry Works", industryType: "Metallurgical", emissionCategory: "high", latitude: 13.027, longitude: 77.521, status: "active" },
    { id: "i-3", wardId: "w-9", name: "Apex Chemicals Corp", industryType: "Chemical Processing", emissionCategory: "high", latitude: 13.032, longitude: 77.501, status: "active" },
    { id: "i-4", wardId: "w-9", name: "Sree Dyeing and Printing", industryType: "Textile Processing", emissionCategory: "medium", latitude: 13.035, longitude: 77.503, status: "active" },
    { id: "i-5", wardId: "w-3", name: "Whitefield Cement Mix Depot", industryType: "Concrete Mixing", emissionCategory: "medium", latitude: 12.968, longitude: 77.748, status: "active" }
  ];

  // 6. Generating 30 Days of Historical Ward-Level Environmental Data
  // Let's create temporal trends (some days are rainier, some days have stagnant wind, weekends have lower traffic, etc.)
  const now = new Date();
  const recordsToGenerate = 30; // 30 days history

  for (let d = recordsToGenerate; d >= 0; d--) {
    const recordDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const dateString = recordDate.toISOString().split("T")[0];
    const isWeekend = recordDate.getDay() === 0 || recordDate.getDay() === 6;

    // Daily meteorological pattern (shared across wards with some microclimatic variance)
    const baseRainfall = Math.random() > 0.85 ? Math.floor(Math.random() * 15) : 0;
    const baseWindSpeed = 8 + Math.random() * 14 - (baseRainfall > 0 ? 0 : Math.random() * 4); // wind stagnation
    const baseTemp = 24 + Math.random() * 6;
    const baseHumidity = baseRainfall > 0 ? 85 + Math.random() * 10 : 50 + Math.random() * 20;

    db.wards.forEach(ward => {
      const wardId = ward.id;
      const timestamp = `${dateString}T12:00:00.000Z`;

      // Weather micro-variation
      const temp = Number((baseTemp + (Math.random() - 0.5) * 1.5).toFixed(1));
      const humidity = Math.min(100, Math.max(10, Math.floor(baseHumidity + (Math.random() - 0.5) * 10)));
      const windSpeed = Number(Math.max(1.5, baseWindSpeed + (Math.random() - 0.5) * 2).toFixed(1));
      const windDirections = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
      const windDirection = windDirections[Math.floor(Math.random() * windDirections.length)];
      const windAngle = windDirections.indexOf(windDirection) * 22.5;
      const rainfall = baseRainfall > 0 ? Number((baseRainfall + Math.random() * 2).toFixed(1)) : 0;

      const weatherRec: WeatherRecord = {
        id: `we-${wardId}-${dateString}`,
        timestamp,
        wardId,
        temperature: temp,
        humidity,
        windSpeed,
        windDirection,
        windAngle,
        rainfall
      };
      db.weatherRecords.push(weatherRec);

      // Traffic micro-variation (high in Indiranagar, Shivaji Nagar, Koramangala, Marathahalli)
      let trafficMultiplier = 1.0;
      if (["w-2", "w-4", "w-11", "w-12"].includes(wardId)) {
        trafficMultiplier = 1.4;
      } else if (["w-1", "w-9"].includes(wardId)) {
        trafficMultiplier = 0.8;
      }
      const densityScore = Math.min(100, Math.max(15, Math.floor((isWeekend ? 40 : 65) * trafficMultiplier + (Math.random() - 0.5) * 15)));
      const speed = Math.max(10, Math.floor(45 - (densityScore / 2.5) + (Math.random() - 0.5) * 5));

      const trafficRec: TrafficRecord = {
        id: `tr-${wardId}-${dateString}`,
        timestamp,
        wardId,
        densityScore,
        congestionIndex: Number((1.0 + densityScore / 25).toFixed(1)),
        averageSpeed: speed
      };
      db.trafficRecords.push(trafficRec);

      // Construction Activity (highest in Outer Ring Road / Whitefield and HSR Layout)
      let constructionMultiplier = 1.0;
      if (["w-3", "w-5", "w-12"].includes(wardId)) {
        constructionMultiplier = 2.2;
      } else if (["w-11", "w-7"].includes(wardId)) {
        constructionMultiplier = 0.5;
      }
      const activeSites = Math.max(0, Math.floor((1.5 * constructionMultiplier) + Math.random() * 3));
      const complianceScore = Math.floor(45 + Math.random() * 45); // dust mitigation

      const constRec: ConstructionRecord = {
        id: `co-${wardId}-${dateString}`,
        timestamp,
        wardId,
        activeSites,
        complianceScore,
        latitude: ward.centroid[0] + (Math.random() - 0.5) * 0.005,
        longitude: ward.centroid[1] + (Math.random() - 0.5) * 0.005,
        description: `Construction activity in ${ward.name}`
      };
      db.constructionRecords.push(constRec);

      // Waste Burning Activity (often in suburbs, peripheral areas, empty plots like Hebbal, Peenya Phase II, Outer Ring Road)
      let wasteMultiplier = 0.5;
      if (["w-8", "w-9", "w-12"].includes(wardId)) {
        wasteMultiplier = 2.0;
      }
      const wasteIncidents = Math.random() > (0.8 - wasteMultiplier * 0.15) ? Math.floor(1 + Math.random() * 3) : 0;
      const wasteRec: WasteBurningRecord = {
        id: `wb-${wardId}-${dateString}`,
        timestamp,
        wardId,
        reportedIncidents: wasteIncidents,
        estimatedSeverity: wasteIncidents === 3 ? "high" : wasteIncidents === 2 ? "medium" : "low",
        latitude: ward.centroid[0] + (Math.random() - 0.5) * 0.006,
        longitude: ward.centroid[1] + (Math.random() - 0.5) * 0.006
      };
      db.wasteBurningRecords.push(wasteRec);

      // Calculate realistic AQI based on environmental indicators & weather (wind dispersion, rain wash, industrial activities, etc.)
      let baseAqi = 60; // baseline clean-air standard

      // 1. Meteorological factors
      // Wind stagnation (low wind speed increases AQI)
      if (windSpeed < 4) {
        baseAqi += (4 - windSpeed) * 15;
      } else if (windSpeed > 15) {
        baseAqi -= (windSpeed - 15) * 2; // dispersion
      }
      // Rain washout (cleans the air)
      if (rainfall > 0) {
        baseAqi -= Math.min(45, rainfall * 5);
      }
      // Temperature inversion / heat stagnation
      if (temp > 28) {
        baseAqi += (temp - 28) * 3;
      }

      // 2. Emission Source components
      // Industrial footprint (high in Peenya)
      if (["w-1", "w-9"].includes(wardId)) {
        baseAqi += 75 + Math.random() * 35; // high industrial footprint
      }
      // Traffic density contribution
      baseAqi += densityScore * 0.8;
      // Construction dust contribution (low compliance = higher dust)
      if (activeSites > 0) {
        baseAqi += activeSites * (15 + (100 - complianceScore) * 0.35);
      }
      // Waste burning
      if (wasteIncidents > 0) {
        baseAqi += wasteIncidents * 30;
      }

      // Final bounded AQI
      let finalAqi = Math.max(35, Math.min(450, Math.floor(baseAqi)));

      // Calibrate individual pollutants mathematically so they align with AQI beautifully!
      // PM2.5 is usually the main driver in India
      const pm25 = Number((finalAqi * 0.35 + (Math.random() * 10)).toFixed(1));
      const pm10 = Number((finalAqi * 0.75 + (Math.random() * 15)).toFixed(1));
      const no2 = Number((densityScore * 0.45 + (["w-1", "w-9"].includes(wardId) ? 25 : 5) + Math.random() * 8).toFixed(1));
      const so2 = Number((["w-1", "w-9"].includes(wardId) ? 20 + Math.random() * 15 : 4 + Math.random() * 3).toFixed(1));
      const co = Number((densityScore * 0.015 + 0.2 + Math.random() * 0.3).toFixed(2));
      const o3 = Number((25 + (temp * 0.8) + Math.random() * 15).toFixed(1));

      // Find monitoring station for this ward (if any)
      const station = db.stations.find(s => s.wardId === wardId);

      const aqiRec: AQIRecord = {
        id: `aq-${wardId}-${dateString}`,
        timestamp,
        cityId: blrCityId,
        wardId,
        stationId: station ? station.id : null,
        latitude: ward.centroid[0],
        longitude: ward.centroid[1],
        aqi: finalAqi,
        pm25,
        pm10,
        no2,
        so2,
        co,
        o3
      };
      db.aqiRecords.push(aqiRec);
    });
  }

  // 7. Seed Citizen Complaints (Complaints filed in the last week)
  db.complaints = [
    {
      id: "c-cmp-1",
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      citizenName: "Raju Prasad",
      citizenPhone: "9876543210",
      wardId: "w-8", // Hebbal
      latitude: 13.0360,
      longitude: 77.5980,
      complaintType: "waste_burning",
      description: "Massive pile of dry leaves and plastic being burned on the empty plot behind Hebbal lake. Thick toxic smoke is entering residential apartments.",
      imageUrl: null,
      status: "in_investigation"
    },
    {
      id: "c-cmp-2",
      timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      citizenName: "Dr. Lakshmi S.",
      citizenPhone: "8123456789",
      wardId: "w-3", // Whitefield
      latitude: 12.9710,
      longitude: 77.7490,
      complaintType: "construction_dust",
      description: "The ongoing metro/roadwork construction site near ITPL has absolutely zero water-sprinkling systems running. Deep layers of fine silica dust are kicking into the atmosphere from trucks.",
      imageUrl: null,
      status: "submitted"
    }
  ];

  // 8. Seeding Audit Logs
  db.auditLogs = [
    { id: "au-1", timestamp: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString(), userId: "u-1", username: "admin", userRole: UserRole.ADMINISTRATOR, action: "SYSTEM_INITIALIZED", details: "National Level AirTrace AI environmental intelligence node deployed successfully." },
    { id: "au-2", timestamp: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(), userId: "u-3", username: "officer_pollution", userRole: UserRole.POLLUTION_CONTROL_OFFICER, action: "STATION_MAINTENANCE", details: "Inspected KSPCB Peenya Station particulate filters." }
  ];

  // Make the actual calculations for hotspots, attributions, forecasts and recommendations based on seeded historical records!
  recalculateMLOutputs();

  // Save to disk
  saveDB();
}

// Function to recalculate or run ML pipelines dynamically and store results!
export function recalculateMLOutputs() {
  const now = new Date();
  const dateString = now.toISOString().split("T")[0];

  // Clear current day outputs to avoid duplicate items
  db.predictions = db.predictions.filter(p => !p.timestamp.startsWith(dateString));
  db.hotspots = db.hotspots.filter(h => !h.timestamp.startsWith(dateString));
  db.sourceAttributions = db.sourceAttributions.filter(s => !s.timestamp.startsWith(dateString));
  db.recommendations = db.recommendations.filter(r => !r.timestamp.startsWith(dateString) || r.status === "pending" || r.status === "dispatched");

  // Get current Live AQI record for each ward (latest generated record)
  db.wards.forEach(ward => {
    const wardId = ward.id;
    
    // Latest AQI, Weather, Traffic, Construction, Waste Burning records
    const records = db.aqiRecords.filter(r => r.wardId === wardId).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
    const latestAqi: AQIRecord = records[0] || { 
      id: `fallback-${wardId}`,
      wardId,
      cityId: ward.cityId,
      stationId: null,
      timestamp: now.toISOString(),
      latitude: ward.centroid[0],
      longitude: ward.centroid[1],
      aqi: 100, 
      pm25: 35, 
      pm10: 75, 
      no2: 20, 
      so2: 5, 
      co: 0.5, 
      o3: 30 
    };
    const latestWeather = db.weatherRecords.filter(w => w.wardId === wardId).sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0] || { windSpeed: 8, temperature: 26, humidity: 60, windDirection: "N", windAngle: 0, rainfall: 0 };
    const latestTraffic = db.trafficRecords.filter(t => t.wardId === wardId).sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0] || { densityScore: 50, congestionIndex: 2.0, averageSpeed: 25 };
    const latestConst = db.constructionRecords.filter(c => c.wardId === wardId).sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0] || { activeSites: 0, complianceScore: 100 };
    const latestWaste = db.wasteBurningRecords.filter(w => w.wardId === wardId).sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0] || { reportedIncidents: 0, estimatedSeverity: "low" };

    // --- MODULE 1: Geospatial Hotspot Detection ---
    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    if (latestAqi.aqi >= 300) riskLevel = "critical";
    else if (latestAqi.aqi >= 200) riskLevel = "high";
    else if (latestAqi.aqi >= 100) riskLevel = "medium";

    const dominantPollutant = latestAqi.pm25 > latestAqi.pm10 * 0.5 ? "PM2.5" : "PM10";

    const hotspot: PollutionHotspot = {
      id: `hp-${wardId}-${dateString}`,
      timestamp: now.toISOString(),
      wardId,
      latitude: latestAqi.latitude + (Math.random() - 0.5) * 0.002,
      longitude: latestAqi.longitude + (Math.random() - 0.5) * 0.002,
      riskLevel,
      aqiValue: latestAqi.aqi,
      dominantPollutant,
      sizeRadiusMeters: Math.floor(500 + riskLevel === "critical" ? 800 : riskLevel === "high" ? 500 : riskLevel === "medium" ? 300 : 150)
    };
    db.hotspots.push(hotspot);

    // --- MODULE 2: Probabilistic Source Attribution ---
    // Calculate probable contribution percentages (must add up to 100%)
    let tWeight = latestTraffic.densityScore * 1.5;
    let cWeight = latestConst.activeSites * (150 - latestConst.complianceScore);
    let iWeight = 0;
    // Industries footprint
    const wardIndustries = db.industries.filter(i => i.wardId === wardId && i.status === "active");
    wardIndustries.forEach(ind => {
      iWeight += ind.emissionCategory === "high" ? 180 : ind.emissionCategory === "medium" ? 80 : 30;
    });
    let wWeight = latestWaste.reportedIncidents * 200;
    let rWeight = 50 + (latestWeather.windSpeed > 15 ? 100 : 30); // Wind kicks up road dust

    // Apply baseline weights so there's always a representation
    tWeight = Math.max(15, tWeight);
    cWeight = Math.max(10, cWeight);
    iWeight = Math.max(5, iWeight);
    wWeight = Math.max(5, wWeight);
    rWeight = Math.max(15, rWeight);

    const totalWeight = tWeight + cWeight + iWeight + wWeight + rWeight;
    const tPct = Math.round((tWeight / totalWeight) * 100);
    const cPct = Math.round((cWeight / totalWeight) * 100);
    const iPct = Math.round((iWeight / totalWeight) * 100);
    const wPct = Math.round((wWeight / totalWeight) * 100);
    const rPct = 100 - (tPct + cPct + iPct + wPct); // Adjust remainder

    const weights = [
      { source: "Traffic", value: tPct },
      { source: "Construction", value: cPct },
      { source: "Industry", value: iPct },
      { source: "Waste Burning", value: wPct },
      { source: "Road Dust", value: rPct }
    ];
    weights.sort((a,b) => b.value - a.value);

    // Dynamic attribution confidence: higher when we have strong local environmental data density
    const attributionConfidence = Math.min(95, Math.floor(75 + (latestTraffic.densityScore > 80 ? 10 : 0) + (latestConst.activeSites > 0 ? 8 : 0) + (wardIndustries.length > 0 ? 5 : 0)));

    const attribution: SourceAttribution = {
      id: `sa-${wardId}-${dateString}`,
      timestamp: now.toISOString(),
      wardId,
      trafficContribution: tPct,
      constructionContribution: cPct,
      industryContribution: iPct,
      wasteBurningContribution: wPct,
      roadDustContribution: rPct,
      confidenceScore: attributionConfidence,
      dominantSource: weights[0].source
    };
    db.sourceAttributions.push(attribution);

    // --- MODULE 3: Hyperlocal AQI Forecasting (24-Hour Prediction) ---
    // Simulate an XGBoost model. Uses current state, weather stagnation, wind direction, temporal factors, and lag data.
    // stagnation factor: low wind speed & low temperature inversion (cold morning/night) or heat stagnation (hot afternoon)
    const stagnationFactor = (latestWeather.windSpeed < 5 ? 1.4 : 1.0) * (latestWeather.rainfall > 0 ? 0.6 : 1.0);
    
    // Introduce a predicted AQI
    let predictedAqi = Math.max(40, Math.min(480, Math.floor(latestAqi.aqi * stagnationFactor * (0.95 + Math.random() * 0.15))));
    
    // Small hourly trend variation
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    let predCat = "Good";
    if (predictedAqi > 300) predCat = "Hazardous / Severe";
    else if (predictedAqi > 200) predCat = "Very Poor";
    else if (predictedAqi > 150) predCat = "Poor";
    else if (predictedAqi > 100) predCat = "Moderate / Unhealthy for Sensitive Groups";
    else if (predictedAqi > 50) predCat = "Satisfactory";

    const prediction: AQIPrediction = {
      id: `pr-${wardId}-${dateString}`,
      timestamp: now.toISOString(),
      forecastTime: tomorrow.toISOString(),
      wardId,
      predictedAqi,
      pm25Predicted: Number((predictedAqi * 0.35 + (Math.random() * 5)).toFixed(1)),
      pm10Predicted: Number((predictedAqi * 0.75 + (Math.random() * 8)).toFixed(1)),
      category: predCat,
      confidenceScore: Math.floor(82 + Math.random() * 12) // MAE of simulated model: ~8.2%, hence high confidence
    };
    db.predictions.push(prediction);

    // --- MODULE 4: Enforcement Priority Intelligence Engine ---
    // Priority Scoring Algorithm considering:
    // - Current AQI severity
    // - Projected AQI trend (predicted - current)
    // - Population density risk multiplier
    // - Presence of schools / hospitals (vulnerable locations)
    // - Source Attribution Confidence
    const popRisk = ward.populationDensity / 25000; // Normalized population density score (max density is Shivaji Nagar at 23k)
    const vulnMultiplier = 1.0 + (ward.hospitalsCount * 0.05) + (ward.schoolsCount * 0.03);
    const aqiSeverityScore = latestAqi.aqi / 4.5; // Scale to ~100
    const aqiTrendGrowth = Math.max(0, predictedAqi - latestAqi.aqi) * 1.5;

    let priorityScore = Math.min(100, Math.floor((aqiSeverityScore * 0.5 + aqiTrendGrowth * 0.2 + popRisk * 20) * vulnMultiplier));
    priorityScore = Math.max(10, priorityScore);

    let priorityLevel: "low" | "medium" | "high" | "critical" = "low";
    if (priorityScore >= 80) priorityLevel = "critical";
    else if (priorityScore >= 60) priorityLevel = "high";
    else if (priorityScore >= 40) priorityLevel = "medium";

    // Build the Actionable Evidence
    let suggestedAction = "Deploy periodic air quality monitoring vans and enforce sweeping of roads to reduce road dust.";
    let reason = "Ambient dust and traffic emissions are keeping the ward index moderate.";
    let estimatedImpact: "low" | "medium" | "high" = "medium";

    if (weights[0].source === "Traffic") {
      suggestedAction = "Deploy traffic enforcement officers to clear bottlenecks on major corridors, optimize signal timings, and fine idling heavy commercial vehicles.";
      reason = "Heavy traffic congestion and low average speed on major arterial corridors are pushing local diesel emissions upwards.";
      estimatedImpact = "high";
    } else if (weights[0].source === "Construction") {
      suggestedAction = "Dispatch municipal inspection teams to enforce anti-dust compliance: mandate 3-meter wind barriers, water-sprinkling hourly, and tarping of transport trucks.";
      reason = "High volume of unmitigated construction activities paired with very low contractor dust-suppression compliance.";
      estimatedImpact = "high";
    } else if (weights[0].source === "Industry") {
      suggestedAction = "Order stack-monitoring audits on high-emission metallurgical and dyeing units. Instruct mechanical sweepers to clean peripheral roads.";
      reason = "Elevated concentrations of NO2 and SO2 trace directly toPeenya industrial cluster stack emissions failing carbon scrubbers.";
      estimatedImpact = "high";
    } else if (weights[0].source === "Waste Burning") {
      suggestedAction = "Deploy night-patrol marshals to hotspots. Impose immediate solid-waste burning fines under PCB sections and clear local landfill dumping grounds.";
      reason = "Repeated garbage and dry foliage open burning incidents at empty land corridors generating high concentration of carbonaceous soot.";
      estimatedImpact = "high";
    }

    // Check if recommendation already exists for this ward to keep tracking officer status
    const existingRec = db.recommendations.find(r => r.wardId === wardId && r.timestamp.startsWith(dateString));
    if (!existingRec) {
      const rec: EnforcementRecommendation = {
        id: `rc-${wardId}-${dateString}`,
        timestamp: now.toISOString(),
        wardId,
        priorityScore,
        priorityLevel,
        reason,
        evidence: {
          currentAqi: latestAqi.aqi,
          predictedAqi,
          trafficDensity: latestTraffic.densityScore,
          constructionSites: latestConst.activeSites,
          wasteBurningIncidents: latestWaste.reportedIncidents,
          sourceConfidence: attribution.confidenceScore
        },
        suggestedAction,
        estimatedImpact,
        assignedOfficer: priorityLevel === "critical" || priorityLevel === "high" ? "Officer Priya Sharma" : null,
        status: priorityLevel === "critical" ? "dispatched" : "pending",
        inspectedAt: null,
        inspectionNotes: null
      };
      db.recommendations.push(rec);
    }
  });

  // Ensure recommendations are sorted by priorityScore descending
  db.recommendations.sort((a,b) => b.priorityScore - a.priorityScore);

  // Add additional enforcement cases for comprehensive queue demonstration
  const additionalCases: EnforcementRecommendation[] = [
    {
      id: "rc-industrial-2026-07-19",
      timestamp: new Date("2026-07-19T14:30:00Z").toISOString(),
      wardId: "w-2",
      priorityScore: 92,
      priorityLevel: "critical",
      reason: "Industrial unit emissions exceeding prescribed limits. PM2.5 levels at 245 µg/m³. Requires immediate inspection and compliance action.",
      evidence: {
        currentAqi: 387,
        predictedAqi: 405,
        trafficDensity: 0.78,
        constructionSites: 2,
        wasteBurningIncidents: 1,
        sourceConfidence: 0.94
      },
      suggestedAction: "Issue stop work notice. Conduct stack emission test. Implement control measures within 48 hours.",
      estimatedImpact: "high",
      assignedOfficer: "Officer Priya Sharma",
      status: "dispatched",
      inspectedAt: new Date("2026-07-19T16:45:00Z").toISOString(),
      inspectionNotes: "Site visited. Found non-functional ESP system. Owner ordered to repair within 24 hours. Follow-up scheduled."
    },
    {
      id: "rc-construction-2026-07-18",
      timestamp: new Date("2026-07-18T09:15:00Z").toISOString(),
      wardId: "w-12",
      priorityScore: 85,
      priorityLevel: "high",
      reason: "Large-scale construction without adequate dust control measures. Particulate matter elevated.",
      evidence: {
        currentAqi: 312,
        predictedAqi: 328,
        trafficDensity: 0.55,
        constructionSites: 5,
        wasteBurningIncidents: 0,
        sourceConfidence: 0.88
      },
      suggestedAction: "Enforce dust mitigation measures. Require water spraying, site barriers, and equipment maintenance.",
      estimatedImpact: "high",
      assignedOfficer: "Officer Rajesh Kumar",
      status: "resolved",
      inspectedAt: new Date("2026-07-19T11:20:00Z").toISOString(),
      inspectionNotes: "Contractor implemented water spraying system and erected barriers. AQI improved to 268. Case closed."
    },
    {
      id: "rc-traffic-2026-07-17",
      timestamp: new Date("2026-07-17T18:45:00Z").toISOString(),
      wardId: "w-5",
      priorityScore: 78,
      priorityLevel: "high",
      reason: "Peak hour traffic congestion in commercial zone. Vehicle emissions causing localized air quality degradation.",
      evidence: {
        currentAqi: 298,
        predictedAqi: 315,
        trafficDensity: 0.92,
        constructionSites: 1,
        wasteBurningIncidents: 0,
        sourceConfidence: 0.81
      },
      suggestedAction: "Coordinate with traffic police for alternate routing. Implement odd-even vehicle scheme if needed.",
      estimatedImpact: "medium",
      assignedOfficer: "Officer Priya Sharma",
      status: "pending",
      inspectedAt: null,
      inspectionNotes: null
    },
    {
      id: "rc-waste-burning-2026-07-16",
      timestamp: new Date("2026-07-16T06:30:00Z").toISOString(),
      wardId: "w-8",
      priorityScore: 88,
      priorityLevel: "critical",
      reason: "Multiple waste burning incidents detected in early morning hours. Spike of 156 µg/m³ PM2.5 recorded.",
      evidence: {
        currentAqi: 356,
        predictedAqi: 378,
        trafficDensity: 0.12,
        constructionSites: 0,
        wasteBurningIncidents: 4,
        sourceConfidence: 0.96
      },
      suggestedAction: "Deploy field teams for immediate intervention. Issue FIR for unauthorized burning. Community awareness campaign.",
      estimatedImpact: "critical",
      assignedOfficer: "Officer Amit Singh",
      status: "dispatched",
      inspectedAt: new Date("2026-07-16T08:15:00Z").toISOString(),
      inspectionNotes: "Field team deployed. Extinguished all burning sites. FIR filed against 3 property owners. Fines issued."
    },
    {
      id: "rc-industry-noncompliant-2026-07-15",
      timestamp: new Date("2026-07-15T10:00:00Z").toISOString(),
      wardId: "w-3",
      priorityScore: 81,
      priorityLevel: "high",
      reason: "Textile dyeing unit operating with expired emission control certificate. Continuous SO₂ emissions detected.",
      evidence: {
        currentAqi: 284,
        predictedAqi: 301,
        trafficDensity: 0.35,
        constructionSites: 0,
        wasteBurningIncidents: 0,
        sourceConfidence: 0.92
      },
      suggestedAction: "Issue show cause notice. Mandate immediate compliance. Levy environmental penalty.",
      estimatedImpact: "high",
      assignedOfficer: "Officer Priya Sharma",
      status: "resolved",
      inspectedAt: new Date("2026-07-16T14:30:00Z").toISOString(),
      inspectionNotes: "Unit owner renewed emission control certificate. Installed new scrubber system. Compliance achieved."
    },
    {
      id: "rc-mining-dust-2026-07-14",
      timestamp: new Date("2026-07-14T07:45:00Z").toISOString(),
      wardId: "w-6",
      priorityScore: 84,
      priorityLevel: "high",
      reason: "Mining aggregate operation without environmental clearance. Excessive dust generation affecting 2km radius.",
      evidence: {
        currentAqi: 325,
        predictedAqi: 342,
        trafficDensity: 0.28,
        constructionSites: 0,
        wasteBurningIncidents: 0,
        sourceConfidence: 0.89
      },
      suggestedAction: "Issue closure notice. Demand environmental clearance. Levy non-compliance penalties.",
      estimatedImpact: "high",
      assignedOfficer: "Officer Rajesh Kumar",
      status: "dismissed",
      inspectedAt: new Date("2026-07-15T09:00:00Z").toISOString(),
      inspectionNotes: "Site visited. Found operation already ceased. Operator stated clearance process underway. Monitoring continued."
    },
    {
      id: "rc-hotel-kitchen-2026-07-13",
      timestamp: new Date("2026-07-13T19:30:00Z").toISOString(),
      wardId: "w-11",
      priorityScore: 62,
      priorityLevel: "medium",
      reason: "High-rise hotel kitchen venting through non-compliant chimneys. Grease and odor emissions.",
      evidence: {
        currentAqi: 198,
        predictedAqi: 212,
        trafficDensity: 0.45,
        constructionSites: 0,
        wasteBurningIncidents: 0,
        sourceConfidence: 0.75
      },
      suggestedAction: "Issue compliance notice. Require installation of approved pollution control device.",
      estimatedImpact: "low",
      assignedOfficer: null,
      status: "pending",
      inspectedAt: null,
      inspectionNotes: null
    },
    {
      id: "rc-vehicular-workshop-2026-07-12",
      timestamp: new Date("2026-07-12T08:00:00Z").toISOString(),
      wardId: "w-7",
      priorityScore: 55,
      priorityLevel: "medium",
      reason: "Unauthorized automotive workshop causing VOC emissions. Illegal disposal of used oil.",
      evidence: {
        currentAqi: 176,
        predictedAqi: 189,
        trafficDensity: 0.62,
        constructionSites: 1,
        wasteBurningIncidents: 0,
        sourceConfidence: 0.72
      },
      suggestedAction: "Issue warning notice. Mandate proper waste disposal. Schedule follow-up inspection.",
      estimatedImpact: "low",
      assignedOfficer: null,
      status: "pending",
      inspectedAt: null,
      inspectionNotes: null
    },
    {
      id: "rc-power-plant-2026-07-11",
      timestamp: new Date("2026-07-11T15:20:00Z").toISOString(),
      wardId: "w-1",
      priorityScore: 91,
      priorityLevel: "critical",
      reason: "Diesel generator emissions exceeding safe limits. NO₂ concentration at 89 µg/m³. Emergency power generation detected.",
      evidence: {
        currentAqi: 398,
        predictedAqi: 420,
        trafficDensity: 0.38,
        constructionSites: 0,
        wasteBurningIncidents: 0,
        sourceConfidence: 0.95
      },
      suggestedAction: "Order immediate load-shifting to grid power. Conduct stack test within 48 hours. Impose daily penalty until compliance.",
      estimatedImpact: "critical",
      assignedOfficer: "Officer Priya Sharma",
      status: "dispatched",
      inspectedAt: new Date("2026-07-12T10:30:00Z").toISOString(),
      inspectionNotes: "Grid power restored. Generator emission test pending. Temporary solution in place. Monitoring continues."
    },
    {
      id: "rc-biomass-burning-2026-07-10",
      timestamp: new Date("2026-07-10T05:15:00Z").toISOString(),
      wardId: "w-10",
      priorityScore: 76,
      priorityLevel: "high",
      reason: "Paddy straw burning detected in agricultural area adjacent to urban zone. Massive smoke plume.",
      evidence: {
        currentAqi: 267,
        predictedAqi: 289,
        trafficDensity: 0.15,
        constructionSites: 0,
        wasteBurningIncidents: 6,
        sourceConfidence: 0.91
      },
      suggestedAction: "Coordinate with agricultural department. Provide subsidy for alternative disposal methods. Issue challan.",
      estimatedImpact: "high",
      assignedOfficer: "Officer Amit Singh",
      status: "resolved",
      inspectedAt: new Date("2026-07-11T06:45:00Z").toISOString(),
      inspectionNotes: "Farmers provided alternative biomass disposal support. Burning sites extinguished. Awareness program conducted."
    }
  ];

  // Add additional cases to recommendations if not already present
  additionalCases.forEach(newCase => {
    if (!db.recommendations.find(r => r.id === newCase.id)) {
      db.recommendations.push(newCase);
    }
  });

  // Final sort by priority
  db.recommendations.sort((a,b) => b.priorityScore - a.priorityScore);
}

// Global accessor to retrieve the in-memory/loaded database
export function getDB() {
  return db;
}
