import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import ExcelJS from "exceljs";
import { initDB, getDB, recalculateMLOutputs, saveDB } from "./src/server/db.js";
import { explainAirQuality, explainCitizenAdvisory } from "./src/server/gemini.js";
import { searchLiveLocations, getLiveTelemetry } from "./src/server/liveData.js";
import { initFirebaseServer, writeLiveExcel, startExcelWatcher, uploadComplaintToFirestoreIfActive, updateComplaintStatusInFirestoreIfActive } from "./src/server/syncManager.js";
import { UserRole } from "./src/types.js";

// Load env variables
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 3000;

let loggedInUser: any = null;

// Body parser
app.use(express.json());

// Initialize database
initDB();

// Initialize Server-Side Firebase Realtime Sync and Excel Bidirectionality
initFirebaseServer().then(() => {
  const db = getDB();
  return writeLiveExcel(db);
}).then(() => {
  startExcelWatcher();
}).catch(err => {
  console.error("[Startup Sync] Initialization failed:", err);
});

// Periodic data synchronization / ML updates every 5 minutes
// Act as a scheduled pipeline equivalent to Python's APScheduler
setInterval(() => {
  console.log("[Pipeline Engine] Running scheduled environmental preprocessing and ML pipeline updates...");
  recalculateMLOutputs();
  saveDB();
}, 5 * 60 * 1000);

// --- REST API ENDPOINTS ---

// Auth Endpoints
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const db = getDB();
  const user = db.users.find(u => u.username === username);

  if (user) {
    loggedInUser = user;
    // Audit Log login event
    const logId = `au-log-${Date.now()}`;
    db.auditLogs.unshift({
      id: logId,
      timestamp: new Date().toISOString(),
      userId: user.id,
      username: user.username,
      userRole: user.role,
      action: "USER_LOGIN",
      details: `Successfully logged in from IP address.`
    });
    saveDB();

    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

app.get("/api/auth/me", (req, res) => {
  res.json({ success: !!loggedInUser, user: loggedInUser });
});

app.post("/api/auth/logout", (req, res) => {
  const { userId } = req.body;
  const db = getDB();
  const user = db.users.find(u => u.id === userId);
  
  loggedInUser = null;
  if (user) {
    db.auditLogs.unshift({
      id: `au-log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: user.id,
      username: user.username,
      userRole: user.role,
      action: "USER_LOGOUT",
      details: "User logged out."
    });
    saveDB();
  }
  res.json({ success: true });
});

// Live / Latest AQI
app.get("/api/aqi/live", (req, res) => {
  const db = getDB();
  // Return the latest record for each ward
  const latestRecords = db.wards.map(ward => {
    const wardRecords = db.aqiRecords
      .filter(r => r.wardId === ward.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return wardRecords[0];
  }).filter(Boolean);

  res.json(latestRecords);
});

// Wards info
app.get("/api/wards", (req, res) => {
  const db = getDB();
  res.json(db.wards);
});

// Stations list
app.get("/api/stations", (req, res) => {
  const db = getDB();
  res.json(db.stations);
});

// Industries list
app.get("/api/industries", (req, res) => {
  const db = getDB();
  res.json(db.industries);
});

// Historical AQI Trends
app.get("/api/aqi/history", (req, res) => {
  const db = getDB();
  const { wardId, limit } = req.query;
  
  let records = db.aqiRecords;
  if (wardId) {
    records = records.filter(r => r.wardId === wardId);
  }
  
  // Sort by timestamp chronological
  records = records.sort((a,b) => a.timestamp.localeCompare(b.timestamp));
  
  if (limit) {
    records = records.slice(-Number(limit));
  }
  
  res.json(records);
});

// Weather Records
app.get("/api/weather", (req, res) => {
  const db = getDB();
  const { wardId } = req.query;
  const latestWeather = db.wards.map(ward => {
    if (wardId && ward.id !== wardId) return null;
    return db.weatherRecords
      .filter(w => w.wardId === ward.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  }).filter(Boolean);
  
  res.json(latestWeather);
});

// Traffic density records
app.get("/api/traffic", (req, res) => {
  const db = getDB();
  const { wardId } = req.query;
  const latestTraffic = db.wards.map(ward => {
    if (wardId && ward.id !== wardId) return null;
    return db.trafficRecords
      .filter(t => t.wardId === ward.id)
      .sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0];
  }).filter(Boolean);
  
  res.json(latestTraffic);
});

// Hotspots
app.get("/api/hotspots", (req, res) => {
  const db = getDB();
  const dateString = new Date().toISOString().split("T")[0];
  const hotspots = db.hotspots.filter(h => h.timestamp.startsWith(dateString));
  res.json(hotspots);
});

// Source Attributions
app.get("/api/source-attribution", (req, res) => {
  const db = getDB();
  const dateString = new Date().toISOString().split("T")[0];
  const attributions = db.sourceAttributions.filter(s => s.timestamp.startsWith(dateString));
  res.json(attributions);
});

// Hyperlocal Predictions (Forecast)
app.get("/api/forecast", (req, res) => {
  const db = getDB();
  const dateString = new Date().toISOString().split("T")[0];
  const predictions = db.predictions.filter(p => p.timestamp.startsWith(dateString));
  res.json(predictions);
});

// Enforcement Recommendations
app.get("/api/recommendations", (req, res) => {
  const db = getDB();
  res.json(db.recommendations);
});

// Update enforcement status
app.post("/api/recommendations/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, notes, officerName, userId } = req.body;
  const db = getDB();
  const rec = db.recommendations.find(r => r.id === id);
  const user = db.users.find(u => u.id === userId);

  if (!rec) {
    return res.status(404).json({ success: false, message: "Recommendation not found" });
  }

  rec.status = status;
  if (notes !== undefined) rec.inspectionNotes = notes;
  if (officerName !== undefined) rec.assignedOfficer = officerName;
  if (status === "resolved") {
    rec.inspectedAt = new Date().toISOString();
  }

  // Log audit trail
  db.auditLogs.unshift({
    id: `au-log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: userId || "system",
    username: user ? user.username : "system",
    userRole: user ? user.role : UserRole.POLLUTION_CONTROL_OFFICER,
    action: "RECOMMENDATION_STATUS_UPDATE",
    details: `Updated action ${id} to ${status}. Notes: ${notes || "None"}`
  });

  saveDB();
  res.json({ success: true, recommendation: rec });
});

// Dashboard aggregates
app.get("/api/dashboard/stats", (req, res) => {
  const db = getDB();
  const dateString = new Date().toISOString().split("T")[0];

  const latestAqi = db.wards.map(ward => {
    return db.aqiRecords
      .filter(r => r.wardId === ward.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  }).filter(Boolean);

  const avgAqi = latestAqi.reduce((acc, r) => acc + r.aqi, 0) / latestAqi.length;
  
  const criticalCount = latestAqi.filter(r => r.aqi >= 200).length;
  const activeHotspotsCount = db.hotspots.filter(h => h.timestamp.startsWith(dateString) && h.riskLevel !== "low").length;
  
  // Dominant source across city
  const attributions = db.sourceAttributions.filter(s => s.timestamp.startsWith(dateString));
  const sourcesCount: Record<string, number> = {};
  attributions.forEach(a => {
    sourcesCount[a.dominantSource] = (sourcesCount[a.dominantSource] || 0) + 1;
  });
  let topSource = "Undetermined";
  let maxCount = 0;
  Object.entries(sourcesCount).forEach(([src, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topSource = src;
    }
  });

  res.json({
    cityAverageAqi: Math.round(avgAqi),
    criticalWards: criticalCount,
    activeHotspots: activeHotspotsCount,
    topPollutionSource: topSource
  });
});

// Citizen Complaints CRUD
app.get("/api/complaints", (req, res) => {
  const db = getDB();
  res.json(db.complaints);
});

app.post("/api/complaints", (req, res) => {
  const { citizenName, citizenPhone, wardId, complaintType, description, latitude, longitude, id, timestamp, status, imageUrl } = req.body;
  const db = getDB();
  
  const newComplaint = {
    id: id || `AQI-2026-${Math.floor(100000 + Math.random() * 900000)}`,
    timestamp: timestamp || new Date().toISOString(),
    citizenName,
    citizenPhone,
    wardId,
    complaintType,
    description,
    latitude: latitude || 12.9716,
    longitude: longitude || 77.5946,
    imageUrl: imageUrl || null,
    status: status || "submitted"
  };

  db.complaints.unshift(newComplaint);

  // Add system audit log
  db.auditLogs.unshift({
    id: `au-log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: "citizen",
    username: citizenName,
    userRole: UserRole.CITIZEN,
    action: "COMPLAINT_SUBMITTED",
    details: `Filed ${complaintType} complaint at ward: ${wardId}`
  });

  // Also create corresponding recommendation in db.recommendations if it doesn't already exist
  const existingRec = db.recommendations.find(r => r.id === `rc-${newComplaint.id}` || r.id === newComplaint.id);
  if (!existingRec) {
    const ward = db.wards.find(w => w.id === wardId);
    const wardName = ward ? ward.name : "Unknown Ward";
    
    const newRecommendation = {
      id: `rc-${newComplaint.id}`,
      timestamp: newComplaint.timestamp,
      wardId,
      priorityScore: 85,
      priorityLevel: "high" as const,
      reason: `Citizen complaint: ${description}`,
      evidence: {
        currentAqi: 125,
        predictedAqi: 140,
        trafficDensity: 70,
        constructionSites: 1,
        wasteBurningIncidents: 1,
        sourceConfidence: 90
      },
      suggestedAction: `Inspect coordinates (${newComplaint.latitude.toFixed(4)}, ${newComplaint.longitude.toFixed(4)}) in ${wardName} and halt illegal emissions immediately.`,
      estimatedImpact: "high" as const,
      assignedOfficer: "Officer Priya Sharma",
      status: "pending" as const,
      inspectedAt: null,
      inspectionNotes: null
    };
    db.recommendations.unshift(newRecommendation);
  }

  saveDB();
  
  // Real-time synchronization
  uploadComplaintToFirestoreIfActive(newComplaint).catch(err => console.error("Firestore submit error:", err));
  writeLiveExcel(db).catch(err => console.error("Excel update error:", err));

  res.json({ success: true, complaint: newComplaint });
});

app.post("/api/complaints/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, userId } = req.body;
  const db = getDB();
  const complaint = db.complaints.find(c => c.id === id);
  const user = db.users.find(u => u.id === userId);

  if (!complaint) {
    return res.status(404).json({ success: false, message: "Complaint not found" });
  }

  complaint.status = status;

  db.auditLogs.unshift({
    id: `au-log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: userId || "system",
    username: user ? user.username : "system",
    userRole: user ? user.role : UserRole.MUNICIPAL_OFFICER,
    action: "COMPLAINT_STATUS_UPDATE",
    details: `Updated citizen complaint ${id} status to ${status}`
  });

  saveDB();

  // Real-time synchronization
  updateComplaintStatusInFirestoreIfActive(id, status).catch(err => console.error("Firestore update status error:", err));
  writeLiveExcel(db).catch(err => console.error("Excel update error:", err));

  res.json({ success: true, complaint });
});

// Citizen Alerts Exceeded Notifications
app.get("/api/citizen-alerts", (req, res) => {
  const db = getDB();
  const latestRecords = db.wards.map(ward => {
    return db.aqiRecords
      .filter(r => r.wardId === ward.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  }).filter(Boolean);

  const alerts = latestRecords.filter(r => r.aqi > 150).map(r => {
    const ward = db.wards.find(w => w.id === r.wardId)!;
    return {
      id: `alert-${r.id}`,
      timestamp: r.timestamp,
      wardId: r.wardId,
      wardName: ward.name,
      aqi: r.aqi,
      severity: r.aqi >= 300 ? "severe" : r.aqi >= 200 ? "poor" : "unhealthy",
      message: `AQI in ${ward.name} has crossed hazardous threshold of ${r.aqi}. Please wear masking gear.`
    };
  });

  res.json(alerts);
});

// Audit Logs list
app.get("/api/audit-logs", (req, res) => {
  const db = getDB();
  res.json(db.auditLogs.slice(0, 100)); // Limit to last 100 entries
});

// --- DATA MANAGEMENT CRUD ROUTING ---

// Create record
app.post("/api/records/:type", (req, res) => {
  const { type } = req.params;
  const db = getDB();
  const record = req.body;
  
  if (!record.id) {
    record.id = `${type}-${Date.now()}`;
  }
  
  if (type === "aqi") db.aqiRecords.push(record);
  else if (type === "weather") db.weatherRecords.push(record);
  else if (type === "traffic") db.trafficRecords.push(record);
  else if (type === "construction") db.constructionRecords.push(record);
  else if (type === "waste") db.wasteBurningRecords.push(record);
  else if (type === "industry") db.industries.push(record);
  else if (type === "complaints") db.complaints.unshift(record);
  else return res.status(400).json({ success: false, message: "Invalid dataset type" });

  recalculateMLOutputs();
  saveDB();
  writeLiveExcel(db).catch(err => console.error("Excel update error in records POST:", err));

  res.json({ success: true, record });
});

// Update record
app.put("/api/records/:type/:id", (req, res) => {
  const { type, id } = req.params;
  const db = getDB();
  const record = req.body;
  
  let index = -1;
  let targetArray: any[] = [];

  if (type === "aqi") targetArray = db.aqiRecords;
  else if (type === "weather") targetArray = db.weatherRecords;
  else if (type === "traffic") targetArray = db.trafficRecords;
  else if (type === "construction") targetArray = db.constructionRecords;
  else if (type === "waste") targetArray = db.wasteBurningRecords;
  else if (type === "industry") targetArray = db.industries;
  else if (type === "complaints") targetArray = db.complaints;

  index = targetArray.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Record not found" });
  }

  targetArray[index] = { ...targetArray[index], ...record };
  
  recalculateMLOutputs();
  saveDB();
  writeLiveExcel(db).catch(err => console.error("Excel update error in records PUT:", err));

  res.json({ success: true, record: targetArray[index] });
});

// Delete record
app.delete("/api/records/:type/:id", (req, res) => {
  const { type, id } = req.params;
  const db = getDB();

  let targetArrayName: any = null;

  if (type === "aqi") targetArrayName = "aqiRecords";
  else if (type === "weather") targetArrayName = "weatherRecords";
  else if (type === "traffic") targetArrayName = "trafficRecords";
  else if (type === "construction") targetArrayName = "constructionRecords";
  else if (type === "waste") targetArrayName = "wasteBurningRecords";
  else if (type === "industry") targetArrayName = "industries";
  else if (type === "complaints") targetArrayName = "complaints";

  if (!targetArrayName) {
    return res.status(400).json({ success: false, message: "Invalid dataset type" });
  }

  const beforeLen = (db as any)[targetArrayName].length;
  (db as any)[targetArrayName] = (db as any)[targetArrayName].filter((r: any) => r.id !== id);
  const afterLen = (db as any)[targetArrayName].length;

  if (beforeLen === afterLen) {
    return res.status(404).json({ success: false, message: "Record not found" });
  }

  recalculateMLOutputs();
  saveDB();
  writeLiveExcel(db).catch(err => console.error("Excel update error in records DELETE:", err));

  res.json({ success: true });
});

// --- DATA MANAGEMENT GET ENDPOINTS ---
app.get("/api/aqi-records", (req, res) => {
  res.json(getDB().aqiRecords);
});

app.get("/api/weather-records", (req, res) => {
  res.json(getDB().weatherRecords);
});

app.get("/api/traffic-records", (req, res) => {
  res.json(getDB().trafficRecords);
});

app.get("/api/construction-records", (req, res) => {
  res.json(getDB().constructionRecords);
});

app.get("/api/waste-burning-records", (req, res) => {
  res.json(getDB().wasteBurningRecords);
});

// --- LIVE GEOSPATIAL INTELLIGENCE & SEARCH ---
app.get("/api/gis/search", async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== "string") {
    return res.status(400).json({ error: "Search query 'q' is required" });
  }
  try {
    const results = await searchLiveLocations(q);
    res.json(results);
  } catch (err) {
    console.error("GIS location search endpoint failed:", err);
    res.status(500).json({ error: "Failed to query live GIS database" });
  }
});

app.get("/api/gis/data", async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: "Latitude and longitude coordinates are required" });
  }
  try {
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: "Invalid coordinate values" });
    }
    const telemetry = await getLiveTelemetry(latitude, longitude);
    res.json(telemetry);
  } catch (err) {
    console.error("GIS live data fetch endpoint failed:", err);
    res.status(500).json({ error: "Failed to retrieve live environmental telemetry" });
  }
});

// --- AI ANALYTICS / GEMINI ROUTING ---

// Human-readable diagnostic analysis endpoint
app.post("/api/gemini/explain", async (req, res) => {
  const { wardId } = req.body;
  const db = getDB();
  
  const ward = db.wards.find(w => w.id === wardId);
  if (!ward) return res.status(404).json({ error: "Ward not found" });

  const dateString = new Date().toISOString().split("T")[0];

  const latestAqi = db.aqiRecords.filter(r => r.wardId === wardId).sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0];
  const latestWeather = db.weatherRecords.filter(w => w.wardId === wardId).sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0];
  const latestTraffic = db.trafficRecords.filter(t => t.wardId === wardId).sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0];
  const latestConst = db.constructionRecords.filter(c => c.wardId === wardId).sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0];
  const attribution = db.sourceAttributions.find(s => s.wardId === wardId && s.timestamp.startsWith(dateString));
  const prediction = db.predictions.find(p => p.wardId === wardId && p.timestamp.startsWith(dateString));
  const industryCount = db.industries.filter(i => i.wardId === wardId && i.status === "active").length;

  if (!latestAqi || !latestWeather || !attribution || !prediction) {
    return res.status(400).json({ error: "Missing analytical records for this ward to perform explanations." });
  }

  const report = await explainAirQuality({
    wardName: ward.name,
    aqi: latestAqi.aqi,
    pm25: latestAqi.pm25,
    pm10: latestAqi.pm10,
    weather: {
      temperature: latestWeather.temperature,
      humidity: latestWeather.humidity,
      windSpeed: latestWeather.windSpeed,
      windDirection: latestWeather.windDirection,
      rainfall: latestWeather.rainfall
    },
    trafficScore: latestTraffic ? latestTraffic.densityScore : 50,
    constructionSites: latestConst ? latestConst.activeSites : 0,
    industryCount,
    dominantSource: attribution.dominantSource,
    sourceConfidence: attribution.confidenceScore,
    forecastAqi: prediction.predictedAqi
  });

  res.json({ explanation: report });
});

// Citizen advisory generator endpoint
app.post("/api/gemini/advisory", async (req, res) => {
  const { aqi, language } = req.body;
  if (!aqi || !language) return res.status(400).json({ error: "AQI and language code are required." });

  const advisoryText = await explainCitizenAdvisory(Number(aqi), language);
  res.json({ advisory: advisoryText });
});

// --- CUSTOM FIREBASE CONFIGURATION STORAGE & LIVE SWITCHING ---

app.post("/api/config/firebase", async (req, res) => {
  try {
    const config = req.body;
    if (!config || typeof config !== "object" || !config.apiKey || !config.projectId) {
      return res.status(400).json({ success: false, error: "Invalid Firebase configuration. Required keys: apiKey, projectId, authDomain, etc." });
    }

    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    console.log("[Firebase Server Config] Saved custom Firebase Configuration JSON.");

    // Force reload Firebase Server-side instance and real-time subscription listeners
    await initFirebaseServer(true);

    res.json({ success: true, message: "Firebase connection loaded successfully." });
  } catch (err: any) {
    console.error("[Firebase Server Config] Error connecting Firebase:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to connect Firebase." });
  }
});

app.get("/api/config/firebase", (req, res) => {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (!fs.existsSync(configPath)) {
    return res.json({ configured: false });
  }
  try {
    const data = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(data);
    res.json({
      configured: true,
      projectId: parsed.projectId,
      authDomain: parsed.authDomain,
      storageBucket: parsed.storageBucket,
      messagingSenderId: parsed.messagingSenderId,
      appId: parsed.appId
    });
  } catch (err) {
    res.json({ configured: false });
  }
});

// --- EXCEL DATA SYNCHRONIZATION VIA EXCELJS ---

app.get("/api/reports/excel", async (req, res) => {
  try {
    const db = getDB();
    const filePath = await writeLiveExcel(db);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=AirTrace_AI_Live_Data.xlsx");
    res.sendFile(filePath);
  } catch (err) {
    console.error("[Excel Report API] Error generating spreadsheet:", err);
    res.status(500).json({ error: "Failed to generate Excel report." });
  }
});

// CSV Data Dump Export
app.get("/api/reports/csv", (req, res) => {
  const db = getDB();
  const dateString = new Date().toISOString().split("T")[0];

  let csv = "Timestamp,Ward,AQI,PM2.5,PM10,NO2,SO2,CO,WindSpeed,TrafficScore,DominantSource,EnforcementPriority\n";
  
  db.wards.forEach(ward => {
    const latestAqi = db.aqiRecords.filter(r => r.wardId === ward.id).sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0];
    const latestWeather = db.weatherRecords.filter(w => w.wardId === ward.id).sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0];
    const latestTraffic = db.trafficRecords.filter(t => t.wardId === ward.id).sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0];
    const attr = db.sourceAttributions.find(s => s.wardId === ward.id && s.timestamp.startsWith(dateString));
    const rec = db.recommendations.find(r => r.wardId === ward.id && r.timestamp.startsWith(dateString));

    if (latestAqi) {
      csv += `"${latestAqi.timestamp}","${ward.name}",${latestAqi.aqi},${latestAqi.pm25},${latestAqi.pm10},${latestAqi.no2},${latestAqi.so2},${latestAqi.co},${latestWeather ? latestWeather.windSpeed : "N/A"},${latestTraffic ? latestTraffic.densityScore : "N/A"},"${attr ? attr.dominantSource : "N/A"}",${rec ? rec.priorityScore : "N/A"}\n`;
    }
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=AirTrace_AI_Daily_Raw_Export.csv");
  res.status(200).send(csv);
});

// Complaints CSV Export
app.get("/api/reports/complaints-csv", (req, res) => {
  try {
    const db = getDB();
    let csv = "Complaint ID,Citizen Name,Citizen Phone,Ward ID,Ward Name,Latitude,Longitude,Category,Status,Description,Created Time\n";
    
    db.complaints.forEach(c => {
      const ward = db.wards.find(w => w.id === c.wardId);
      const wardName = ward ? ward.name : "Unknown Ward";
      
      const escape = (val: any) => {
        if (val === null || val === undefined) return "";
        let str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      csv += `${escape(c.id)},${escape(c.citizenName)},${escape(c.citizenPhone)},${escape(c.wardId)},${escape(wardName)},${c.latitude},${c.longitude},${escape(c.complaintType)},${escape(c.status)},${escape(c.description)},${escape(c.timestamp)}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=AirTrace_AI_Citizen_Complaints_Export.csv");
    res.status(200).send(csv);
  } catch (err) {
    console.error("[Complaints CSV API] Error:", err);
    res.status(500).json({ error: "Failed to generate complaints CSV." });
  }
});

// --- VITE MIDDLEWARE SETUP FOR DEV/PROD ROUTING ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind to host 0.0.0.0 and port 3000 as mandated by container specifications
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[AirTrace AI Backend Server] running on http://localhost:${PORT} under NODE_ENV: ${process.env.NODE_ENV || "development"}`);
  });
}

startServer();
