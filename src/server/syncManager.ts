import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, query, orderBy, writeBatch 
} from "firebase/firestore";
import { CitizenComplaint, UserRole } from "../types.js";
import { getDB, saveDB } from "./db.js";

const EXCEL_FILE = path.join(process.cwd(), "AirTrace_AI_Live_Data.xlsx");
const CONFIG_FILE = path.join(process.cwd(), "firebase-applet-config.json");

let lastExcelWriteTime = 0;
let isFirebaseServerActive = false;
let dbFirestoreInstance: any = null;

// Initialize Firebase Server-Side defensively
export async function initFirebaseServer(forceReload = false) {
  if (isFirebaseServerActive && !forceReload) return dbFirestoreInstance;
  
  if (!fs.existsSync(CONFIG_FILE)) {
    console.log("[Firebase Server] No firebase-applet-config.json found. Running in local fallback/REST mode.");
    return null;
  }

  try {
    const configData = fs.readFileSync(CONFIG_FILE, "utf8");
    const firebaseConfig = JSON.parse(configData);
    
    if (getApps().length > 0 && forceReload) {
      try {
        await deleteApp(getApp());
      } catch (err) {
        console.warn("[Firebase Server] Failed to delete existing App on reload:", err);
      }
    }

    if (getApps().length === 0) {
      const app = initializeApp(firebaseConfig);
      dbFirestoreInstance = getFirestore(app);
    } else {
      dbFirestoreInstance = getFirestore(getApp());
    }
    
    isFirebaseServerActive = true;
    console.log("[Firebase Server] Firebase successfully initialized on server.");
    
    // Subscribe to Firestore complaints collection to sync in real-time to local db
    const complaintsCol = collection(dbFirestoreInstance, "pollution_complaints");
    onSnapshot(complaintsCol, (snapshot) => {
      console.log(`[Firebase Server Snapshot] Received real-time update from Firestore complaints: ${snapshot.size} documents.`);
      
      const db = getDB();
      let updatedCount = 0;
      
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const existingIdx = db.complaints.findIndex(c => c.id === docSnap.id);
        
        const complaint: CitizenComplaint = {
          id: docSnap.id,
          citizenName: d.citizenName || "Anonymous",
          citizenPhone: d.citizenPhone || "N/A",
          wardId: d.wardId || "w-1",
          complaintType: d.complaintType || "other",
          description: d.description || "",
          latitude: Number(d.latitude) || 12.9716,
          longitude: Number(d.longitude) || 77.5946,
          timestamp: d.timestamp || new Date().toISOString(),
          status: d.status || "submitted",
          imageUrl: d.imageUrl || d.evidenceUrl || null
        };

        if (existingIdx !== -1) {
          // Compare to prevent duplicate/unnecessary writes
          const existing = db.complaints[existingIdx];
          if (existing.status !== complaint.status || existing.description !== complaint.description) {
            db.complaints[existingIdx] = complaint;
            updatedCount++;
          }
        } else {
          db.complaints.unshift(complaint);
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        console.log(`[Firebase Server Sync] Updated ${updatedCount} complaints from cloud to local db.`);
        saveDB();
        // Update live Excel sheet
        writeLiveExcel(db).catch(err => {
          console.error("[Firebase Server Sync] Failed to update Excel after cloud change:", err);
        });
      }
    }, (err) => {
      console.error("[Firebase Server Snapshot] Firestore subscription error:", err);
    });

  } catch (e) {
    console.warn("[Firebase Server] Failed to initialize Firestore listener, running in local fallback.", e);
  }
  return dbFirestoreInstance;
}

// Generate the complete unified Excel Workbook
export async function writeLiveExcel(db: any): Promise<string> {
  const dateString = new Date().toISOString().split("T")[0];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AirTrace AI Intelligence Engine";
  workbook.created = new Date();

  // Color theme palettes conforming to high-end design
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF3A536B" } // Professional dark slate blue
  };
  const headerFont: Partial<ExcelJS.Font> = {
    name: "Segoe UI",
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 11
  };
  const dataFont: Partial<ExcelJS.Font> = {
    name: "Segoe UI",
    size: 10
  };

  // Sheet 1: Live AQI
  const wsLive = workbook.addWorksheet("Live AQI");
  wsLive.columns = [
    { header: "Timestamp", key: "timestamp", width: 25 },
    { header: "City", key: "city", width: 15 },
    { header: "Ward Name", key: "ward", width: 22 },
    { header: "Latitude", key: "latitude", width: 12 },
    { header: "Longitude", key: "longitude", width: 12 },
    { header: "AQI Value", key: "aqi", width: 12 },
    { header: "PM2.5", key: "pm25", width: 10 },
    { header: "PM10", key: "pm10", width: 10 },
    { header: "NO2", key: "no2", width: 10 },
    { header: "SO2", key: "so2", width: 10 },
    { header: "CO", key: "co", width: 10 },
    { header: "Weather (°C)", key: "weather", width: 15 },
    { header: "Traffic Score", key: "traffic", width: 15 },
    { header: "24h Pred AQI", key: "prediction", width: 15 },
    { header: "Priority Score", key: "priority", width: 15 }
  ];

  db.wards.forEach((ward: any) => {
    const latestAqi = db.aqiRecords.filter((r: any) => r.wardId === ward.id).sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))[0];
    const latestWeather = db.weatherRecords.filter((w: any) => w.wardId === ward.id).sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))[0];
    const latestTraffic = db.trafficRecords.filter((t: any) => t.wardId === ward.id).sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))[0];
    const pred = db.predictions.find((p: any) => p.wardId === ward.id && p.timestamp.startsWith(dateString));
    const rec = db.recommendations.find((r: any) => r.wardId === ward.id && r.timestamp.startsWith(dateString));

    if (latestAqi) {
      wsLive.addRow({
        timestamp: latestAqi.timestamp,
        city: "Bengaluru",
        ward: ward.name,
        latitude: latestAqi.latitude,
        longitude: latestAqi.longitude,
        aqi: latestAqi.aqi,
        pm25: latestAqi.pm25,
        pm10: latestAqi.pm10,
        no2: latestAqi.no2,
        so2: latestAqi.so2,
        co: latestAqi.co,
        weather: latestWeather ? `${latestWeather.temperature}°C, WS: ${latestWeather.windSpeed}km/h` : "N/A",
        traffic: latestTraffic ? `${latestTraffic.densityScore}%` : "N/A",
        prediction: pred ? pred.predictedAqi : "N/A",
        priority: rec ? rec.priorityScore : "N/A"
      });
    }
  });

  // Sheet 2: Predictions
  const wsPred = workbook.addWorksheet("Predictions");
  wsPred.columns = [
    { header: "Timestamp", key: "timestamp", width: 25 },
    { header: "Ward Name", key: "ward", width: 22 },
    { header: "Current AQI", key: "current_aqi", width: 15 },
    { header: "Predicted AQI (24h)", key: "predicted_aqi", width: 20 },
    { header: "Confidence Score", key: "confidence", width: 20 }
  ];

  db.wards.forEach((ward: any) => {
    const latestAqi = db.aqiRecords.filter((r: any) => r.wardId === ward.id).sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))[0];
    const pred = db.predictions.find((p: any) => p.wardId === ward.id && p.timestamp.startsWith(dateString));
    if (pred && latestAqi) {
      wsPred.addRow({
        timestamp: pred.timestamp,
        ward: ward.name,
        current_aqi: latestAqi.aqi,
        predicted_aqi: pred.predictedAqi,
        confidence: `${pred.confidenceScore}%`
      });
    }
  });

  // Sheet 3: Source Attribution
  const wsAttr = workbook.addWorksheet("Source Attribution");
  wsAttr.columns = [
    { header: "Ward Name", key: "ward", width: 22 },
    { header: "Traffic Contribution (%)", key: "traffic", width: 22 },
    { header: "Construction (%)", key: "construction", width: 20 },
    { header: "Industrial Stack (%)", key: "industry", width: 20 },
    { header: "Waste Burning (%)", key: "waste", width: 20 },
    { header: "Road Dust (%)", key: "dust", width: 20 },
    { header: "Attribution Confidence (%)", key: "confidence", width: 25 }
  ];

  db.wards.forEach((ward: any) => {
    const attr = db.sourceAttributions.find((s: any) => s.wardId === ward.id && s.timestamp.startsWith(dateString));
    if (attr) {
      wsAttr.addRow({
        ward: ward.name,
        traffic: attr.trafficContribution,
        construction: attr.constructionContribution,
        industry: attr.industryContribution,
        waste: attr.wasteBurningContribution,
        dust: attr.roadDustContribution,
        confidence: `${attr.confidenceScore}%`
      });
    }
  });

  // Sheet 4: Enforcement Report
  const wsEnf = workbook.addWorksheet("Enforcement Report");
  wsEnf.columns = [
    { header: "Ward Name", key: "ward", width: 22 },
    { header: "Priority Score (0-100)", key: "priority", width: 22 },
    { header: "Targeted Recommendation", key: "recommendation", width: 50 },
    { header: "Assigned Inspector", key: "officer", width: 25 },
    { header: "Action Deployment Status", key: "status", width: 22 }
  ];

  db.recommendations.forEach((rec: any) => {
    const ward = db.wards.find((w: any) => w.id === rec.wardId);
    if (ward) {
      wsEnf.addRow({
        ward: ward.name,
        priority: rec.priorityScore,
        recommendation: rec.suggestedAction,
        officer: rec.assignedOfficer || "Unassigned",
        status: rec.status.toUpperCase()
      });
    }
  });

  // Sheet 5: Citizen Complaints (Synchronized)
  const wsComplaints = workbook.addWorksheet("Citizen Complaints");
  wsComplaints.columns = [
    { header: "Complaint ID", key: "id", width: 22 },
    { header: "Citizen Name", key: "citizenName", width: 22 },
    { header: "Citizen Phone", key: "citizenPhone", width: 18 },
    { header: "Ward ID", key: "wardId", width: 12 },
    { header: "Latitude", key: "latitude", width: 14 },
    { header: "Longitude", key: "longitude", width: 14 },
    { header: "Category", key: "complaintType", width: 20 },
    { header: "Status", key: "status", width: 15 },
    { header: "Description", key: "description", width: 45 },
    { header: "Created Time", key: "timestamp", width: 25 }
  ];

  db.complaints.forEach((comp: CitizenComplaint) => {
    wsComplaints.addRow({
      id: comp.id,
      citizenName: comp.citizenName,
      citizenPhone: comp.citizenPhone,
      wardId: comp.wardId,
      latitude: comp.latitude,
      longitude: comp.longitude,
      complaintType: comp.complaintType,
      status: comp.status,
      description: comp.description,
      timestamp: comp.timestamp
    });
  });

  // Apply custom Segoe UI typography and professional fills on all sheets
  [wsLive, wsPred, wsAttr, wsEnf, wsComplaints].forEach(ws => {
    ws.getRow(1).eachCell(cell => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    ws.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell(cell => {
          cell.font = dataFont;
        });
      }
    });
  });

  // Ensure directories exist
  const dir = path.dirname(EXCEL_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await workbook.xlsx.writeFile(EXCEL_FILE);
  
  // Set the lock timestamp to prevent file watcher looping back
  const stats = fs.statSync(EXCEL_FILE);
  lastExcelWriteTime = stats.mtimeMs;
  
  return EXCEL_FILE;
}

// Watch Excel File changes (Bidirectional Synchronization)
export function startExcelWatcher() {
  if (!fs.existsSync(EXCEL_FILE)) {
    console.log("[Excel Watcher] AirTrace_AI_Live_Data.xlsx not found yet, skipping watch setup.");
    return;
  }

  let isDebouncing = false;

  fs.watch(EXCEL_FILE, async (event) => {
    if (event === "change") {
      if (isDebouncing) return;
      isDebouncing = true;
      
      setTimeout(async () => {
        isDebouncing = false;
        try {
          const stats = fs.statSync(EXCEL_FILE);
          // Check if the change was made by the server's own write Live Excel operation
          if (Math.abs(stats.mtimeMs - lastExcelWriteTime) < 1500) {
            // Ignore server's own write
            return;
          }

          console.log("[Excel Watcher] Detected external modifications to Excel. Re-verifying database integrity...");
          const db = getDB();
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.readFile(EXCEL_FILE);
          
          const ws = workbook.getWorksheet("Citizen Complaints");
          if (!ws) {
            console.warn("[Excel Watcher] No 'Citizen Complaints' sheet found inside modified workbook.");
            return;
          }

          let wasDbUpdated = false;
          const updatedComplaintsToCloud: CitizenComplaint[] = [];

          ws.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
              const id = row.getCell(1).value?.toString();
              const citizenName = row.getCell(2).value?.toString();
              const citizenPhone = row.getCell(3).value?.toString();
              const wardId = row.getCell(4).value?.toString();
              const latitude = parseFloat(row.getCell(5).value?.toString() || "0");
              const longitude = parseFloat(row.getCell(6).value?.toString() || "0");
              const complaintType = row.getCell(7).value?.toString() as any;
              const status = row.getCell(8).value?.toString() as any;
              const description = row.getCell(9).value?.toString();
              const timestamp = row.getCell(10).value?.toString() || new Date().toISOString();

              if (id && citizenName && wardId) {
                const complaint: CitizenComplaint = {
                  id,
                  citizenName,
                  citizenPhone: citizenPhone || "N/A",
                  wardId,
                  latitude: isNaN(latitude) ? 12.9716 : latitude,
                  longitude: isNaN(longitude) ? 77.5946 : longitude,
                  complaintType: complaintType || "other",
                  status: status || "submitted",
                  description: description || "",
                  timestamp,
                  imageUrl: null
                };

                const localIdx = db.complaints.findIndex(c => c.id === id);
                if (localIdx !== -1) {
                  const existing = db.complaints[localIdx];
                  if (existing.status !== complaint.status || existing.description !== complaint.description) {
                    db.complaints[localIdx] = complaint;
                    wasDbUpdated = true;
                    updatedComplaintsToCloud.push(complaint);
                  }
                } else {
                  db.complaints.unshift(complaint);
                  wasDbUpdated = true;
                  updatedComplaintsToCloud.push(complaint);
                }
              }
            }
          });

          if (wasDbUpdated) {
            console.log(`[Excel Watcher] Merged ${updatedComplaintsToCloud.length} modified records back to local DB.`);
            saveDB();

            // Also upload updated records back to Firestore (Cloud Sync)
            if (isFirebaseServerActive && dbFirestoreInstance) {
              try {
                const batch = writeBatch(dbFirestoreInstance);
                updatedComplaintsToCloud.forEach(comp => {
                  const compRef = doc(dbFirestoreInstance, "pollution_complaints", comp.id);
                  batch.set(compRef, comp, { merge: true });
                });
                await batch.commit();
                console.log(`[Excel Watcher] Cloud synchronization complete for ${updatedComplaintsToCloud.length} records.`);
              } catch (cloudErr) {
                console.error("[Excel Watcher] Cloud upload failed, offline backup persisted.", cloudErr);
              }
            }
          }

        } catch (err) {
          console.error("[Excel Watcher] Error during Excel modifications verification:", err);
        }
      }, 800);
    }
  });

  console.log(`[Excel Watcher] Actively monitoring edits on path: ${EXCEL_FILE}`);
}

// Upload a single complaint to Firestore server-side if connection is active
export async function uploadComplaintToFirestoreIfActive(complaint: CitizenComplaint) {
  if (isFirebaseServerActive && dbFirestoreInstance) {
    try {
      const compRef = doc(dbFirestoreInstance, "pollution_complaints", complaint.id);
      await setDoc(compRef, complaint);
      console.log(`[Firebase Server] Cloud Sync: Uploaded complaint ${complaint.id} to Firestore.`);
    } catch (err) {
      console.error(`[Firebase Server] Cloud Sync: Failed to upload complaint ${complaint.id} to Firestore:`, err);
    }
  }
}

// Update status of a single complaint in Firestore server-side if connection is active
export async function updateComplaintStatusInFirestoreIfActive(complaintId: string, status: string) {
  if (isFirebaseServerActive && dbFirestoreInstance) {
    try {
      const compRef = doc(dbFirestoreInstance, "pollution_complaints", complaintId);
      await setDoc(compRef, { status }, { merge: true });
      console.log(`[Firebase Server] Cloud Sync: Updated status of complaint ${complaintId} to ${status} in Firestore.`);
    } catch (err) {
      console.error(`[Firebase Server] Cloud Sync: Failed to update complaint ${complaintId} status in Firestore:`, err);
    }
  }
}
