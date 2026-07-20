import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  orderBy, 
  writeBatch 
} from "firebase/firestore";
import { Ward, CitizenComplaint, EnforcementRecommendation, PollutionHotspot } from "../types.js";

// Fallback Wards List
export const FALLBACK_WARDS: Ward[] = [
  { id: "w-1", name: "Peenya Industrial Area", code: "W-140", populationDensity: 11200, centroid: [13.0285, 77.5195], hospitalsCount: 4, schoolsCount: 8, areaSqKm: 6, coordinates: [] },
  { id: "w-2", name: "Koramangala", code: "W-151", populationDensity: 14500, centroid: [12.9352, 77.6244], hospitalsCount: 8, schoolsCount: 12, areaSqKm: 8, coordinates: [] },
  { id: "w-3", name: "Whitefield", code: "W-84", populationDensity: 6800, centroid: [12.9698, 77.7500], hospitalsCount: 6, schoolsCount: 15, areaSqKm: 12, coordinates: [] },
  { id: "w-4", name: "Indiranagar", code: "W-80", populationDensity: 12800, centroid: [12.9719, 77.6412], hospitalsCount: 5, schoolsCount: 7, areaSqKm: 5, coordinates: [] },
  { id: "w-5", name: "HSR Layout", code: "W-174", populationDensity: 11900, centroid: [12.9116, 77.6388], hospitalsCount: 7, schoolsCount: 11, areaSqKm: 7, coordinates: [] },
  { id: "w-6", name: "Malleshwaram", code: "W-65", populationDensity: 18400, centroid: [13.0031, 77.5702], hospitalsCount: 9, schoolsCount: 14, areaSqKm: 6, coordinates: [] },
  { id: "w-7", name: "Jayanagar", code: "W-169", populationDensity: 15600, centroid: [12.9308, 77.5838], hospitalsCount: 11, schoolsCount: 10, areaSqKm: 9, coordinates: [] },
  { id: "w-8", name: "Hebbal", code: "W-22", populationDensity: 9200, centroid: [13.0358, 77.5978], hospitalsCount: 3, schoolsCount: 6, areaSqKm: 10, coordinates: [] },
  { id: "w-9", name: "Peenya Phase II", code: "W-141", populationDensity: 10800, centroid: [13.0334, 77.5021], hospitalsCount: 2, schoolsCount: 4, areaSqKm: 5, coordinates: [] },
  { id: "w-10", name: "Electronic City", code: "W-198", populationDensity: 7500, centroid: [12.8452, 77.6602], hospitalsCount: 5, schoolsCount: 9, areaSqKm: 11, coordinates: [] },
  { id: "w-11", name: "Shivaji Nagar", code: "W-92", populationDensity: 23000, centroid: [12.9857, 77.5971], hospitalsCount: 12, schoolsCount: 8, areaSqKm: 4, coordinates: [] },
  { id: "w-12", name: "Marathahalli", code: "W-85", populationDensity: 13200, centroid: [12.9569, 77.7011], hospitalsCount: 6, schoolsCount: 10, areaSqKm: 8, coordinates: [] }
].map(w => {
  // Generate polygon approximation
  const polygon: [number, number][] = [];
  const pointsCount = 6;
  const radius = 0.015;
  for (let i = 0; i < pointsCount; i++) {
    const angle = (i / pointsCount) * Math.PI * 2;
    const jitter = radius * 0.95;
    const lat = w.centroid[0] + Math.sin(angle) * jitter;
    const lng = w.centroid[1] + Math.cos(angle) * jitter;
    polygon.push([lat, lng]);
  }
  polygon.push([polygon[0][0], polygon[0][1]]);
  return { ...w, cityId: "c1", coordinates: polygon } as Ward;
});

let firebaseConfig: any = null;
let isInitialized = false;
let dbInstance: any = null;

// Initialize Firebase defensively
async function initializeFirebase() {
  if (isInitialized) return dbInstance;
  try {
    const response = await fetch("/firebase-applet-config.json");
    if (response.ok) {
      firebaseConfig = await response.json();
      if (getApps().length === 0) {
        const app = initializeApp(firebaseConfig);
        dbInstance = getFirestore(app);
      } else {
        dbInstance = getFirestore(getApp());
      }
      isInitialized = true;
      console.log("Firebase initialized successfully on client.");
    }
  } catch (e) {
    console.warn("Could not load /firebase-applet-config.json, running in mock/local fallback mode.", e);
  }
  return dbInstance;
}

// Generate an exact complaint reference ID (e.g. AQI-2026-000145)
export function generateComplaintId(): string {
  const serial = Math.floor(100000 + Math.random() * 900000);
  return `AQI-2026-${serial}`;
}

// Subscribe to Wards
export function subscribeWards(
  onUpdate: (wards: Ward[]) => void,
  onError: (err: any) => void,
  onLoading: (isLoading: boolean) => void
) {
  let unsub: (() => void) | null = null;
  onLoading(true);

  async function start() {
    try {
      const db = await initializeFirebase();
      if (db) {
        const wardsCol = collection(db, "wards");
        unsub = onSnapshot(
          wardsCol,
          async (snapshot) => {
            if (snapshot.empty) {
              console.log("Wards collection is empty, seeding default wards list into Firebase...");
              try {
                // Seed wards to Firebase
                for (const w of FALLBACK_WARDS) {
                  // Standardized fields: Name, AQI, Latitude, Longitude
                  const docData = {
                    id: w.id,
                    name: w.name,
                    code: w.code,
                    populationDensity: w.populationDensity,
                    hospitalsCount: w.hospitalsCount,
                    schoolsCount: w.schoolsCount,
                    areaSqKm: w.areaSqKm,
                    latitude: w.centroid[0],
                    longitude: w.centroid[1],
                    centroid: w.centroid,
                    coordinates: w.coordinates,
                    aqi: 95 // default starting AQI
                  };
                  await setDoc(doc(db, "wards", w.id), docData);
                }
              } catch (seedErr) {
                console.error("Failed to seed wards collection in Firebase:", seedErr);
              }
            } else {
              const wardsList: Ward[] = [];
              snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                wardsList.push({
                  id: docSnap.id,
                  name: data.name || "Unnamed Ward",
                  code: data.code || "",
                  populationDensity: data.populationDensity || 10000,
                  hospitalsCount: data.hospitalsCount || 2,
                  schoolsCount: data.schoolsCount || 5,
                  areaSqKm: data.areaSqKm || 5,
                  centroid: data.centroid || [data.latitude, data.longitude],
                  coordinates: data.coordinates || []
                } as Ward);
              });
              onUpdate(wardsList);
              onLoading(false);
            }
          },
          (err) => {
            console.error("Firebase wards subscription error:", err);
            onError(err);
            onLoading(false);
          }
        );
      } else {
        // Fallback to Express REST API
        console.log("Using REST API fallback for wards...");
        const res = await fetch("/api/wards");
        if (res.ok) {
          const data = await res.json();
          onUpdate(data);
        } else {
          onUpdate(FALLBACK_WARDS);
        }
        onLoading(false);
      }
    } catch (e) {
      console.error("Error subscribing to Wards:", e);
      onError(e);
      onUpdate(FALLBACK_WARDS);
      onLoading(false);
    }
  }

  start();

  return () => {
    if (unsub) unsub();
  };
}

// Subscribe to Complaints (collection: pollution_complaints)
export function subscribeComplaints(
  onUpdate: (complaints: CitizenComplaint[]) => void,
  onError: (err: any) => void,
  onLoading: (isLoading: boolean) => void
) {
  let unsub: (() => void) | null = null;
  onLoading(true);

  async function start() {
    try {
      const db = await initializeFirebase();
      if (db) {
        const complaintsCol = collection(db, "pollution_complaints");
        const q = query(complaintsCol, orderBy("timestamp", "desc"));
        unsub = onSnapshot(
          q,
          (snapshot) => {
            const list: CitizenComplaint[] = [];
            snapshot.forEach((docSnap) => {
              const d = docSnap.data();
              list.push({
                id: docSnap.id,
                citizenName: d.citizenName,
                citizenPhone: d.citizenPhone,
                wardId: d.wardId,
                complaintType: d.complaintType,
                description: d.description,
                latitude: d.latitude,
                longitude: d.longitude,
                timestamp: d.timestamp,
                status: d.status,
                imageUrl: d.imageUrl || null
              } as CitizenComplaint);
            });
            onUpdate(list);
            onLoading(false);
          },
          (err) => {
            console.error("Firebase complaints subscription error:", err);
            onError(err);
            onLoading(false);
          }
        );
      } else {
        // REST API fallback
        const res = await fetch("/api/complaints");
        if (res.ok) {
          const list = await res.json();
          // Sort newest first
          list.sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp));
          onUpdate(list);
        } else {
          onUpdate([]);
        }
        onLoading(false);
      }
    } catch (e) {
      console.error("Error subscribing to Complaints:", e);
      onError(e);
      onLoading(false);
    }
  }

  start();

  return () => {
    if (unsub) unsub();
  };
}

// Subscribe to Enforcement Queue (collection: enforcement_queue)
export function subscribeEnforcementQueue(
  onUpdate: (queue: EnforcementRecommendation[]) => void,
  onError: (err: any) => void,
  onLoading: (isLoading: boolean) => void
) {
  let unsub: (() => void) | null = null;
  onLoading(true);

  async function start() {
    try {
      const db = await initializeFirebase();
      if (db) {
        const queueCol = collection(db, "enforcement_queue");
        unsub = onSnapshot(
          queueCol,
          (snapshot) => {
            const list: EnforcementRecommendation[] = [];
            snapshot.forEach((docSnap) => {
              const d = docSnap.data();
              list.push({
                id: docSnap.id,
                timestamp: d.timestamp,
                wardId: d.wardId,
                priorityScore: d.priorityScore || 50,
                priorityLevel: d.priorityLevel || d.priority || "medium",
                reason: d.reason || "Complaint filed",
                evidence: d.evidence || {
                  currentAqi: 120,
                  predictedAqi: 130,
                  trafficDensity: 60,
                  constructionSites: 1,
                  wasteBurningIncidents: 1,
                  sourceConfidence: 85
                },
                suggestedAction: d.suggestedAction || "Enforce clean air protocols",
                estimatedImpact: d.estimatedImpact || "medium",
                assignedOfficer: d.assignedOfficer || "Officer Priya Sharma",
                status: d.status || "Pending Inspection",
                inspectedAt: d.inspectedAt || null,
                inspectionNotes: d.inspectionNotes || null
              } as EnforcementRecommendation);
            });
            // Sort by priorityScore descending
            list.sort((a, b) => b.priorityScore - a.priorityScore);
            onUpdate(list);
            onLoading(false);
          },
          (err) => {
            console.error("Firebase enforcement queue subscription error:", err);
            onError(err);
            onLoading(false);
          }
        );
      } else {
        // REST API fallback
        const res = await fetch("/api/recommendations");
        if (res.ok) {
          const list = await res.json();
          onUpdate(list);
        } else {
          onUpdate([]);
        }
        onLoading(false);
      }
    } catch (e) {
      console.error("Error subscribing to Enforcement Queue:", e);
      onError(e);
      onLoading(false);
    }
  }

  start();

  return () => {
    if (unsub) unsub();
  };
}

// Submit Citizen Complaint and Automatically Create Enforcement Task
export async function createComplaintAndTask(formData: {
  citizenName: string;
  citizenPhone: string;
  wardId: string;
  complaintType: string;
  description: string;
  latitude: number;
  longitude: number;
  wardName: string;
}): Promise<string> {
  const complaintId = generateComplaintId();
  const timestamp = new Date().toISOString();

  // 1. Complaint record fields conforming exactly to BUG FIX 4
  const complaintData = {
    id: complaintId,
    citizenName: formData.citizenName,
    citizenPhone: formData.citizenPhone,
    wardId: formData.wardId,
    complaintType: formData.complaintType,
    description: formData.description,
    latitude: formData.latitude,
    longitude: formData.longitude,
    timestamp: timestamp,
    status: "Pending", // Status default: Pending
    priority: "medium",
    assignedOfficer: "Officer Priya Sharma",
    evidenceUrl: ""
  };

  // 2. Enforcement task fields conforming exactly to BUG FIX 7
  const deadlineDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour deadline
  const enforcementData = {
    id: complaintId, // Complaint ID is shared
    complaintId: complaintId,
    wardId: formData.wardId,
    ward: formData.wardName,
    priority: "High", // High priority by default for submitted citizens reports
    priorityScore: 85,
    priorityLevel: "high",
    reason: `Citizen reported active ${formData.complaintType.replace("_", " ")}: ${formData.description}`,
    assignedOfficer: "Officer Priya Sharma",
    status: "Pending Inspection", // Default status
    deadline: deadlineDate.toISOString(),
    latitude: formData.latitude,
    longitude: formData.longitude,
    timestamp: timestamp,
    evidence: {
      currentAqi: 125,
      predictedAqi: 140,
      trafficDensity: 70,
      constructionSites: 1,
      wasteBurningIncidents: 1,
      sourceConfidence: 90
    },
    suggestedAction: `Inspect coordinates (${formData.latitude.toFixed(4)}, ${formData.longitude.toFixed(4)}) in ${formData.wardName} and halt illegal emissions immediately.`,
    estimatedImpact: "high",
    inspectedAt: null,
    inspectionNotes: null
  };

  try {
    const db = await initializeFirebase();
    if (db) {
      // Create batch
      const batch = writeBatch(db);
      
      // Store inside pollution_complaints
      const complaintRef = doc(db, "pollution_complaints", complaintId);
      batch.set(complaintRef, complaintData);

      // Store inside enforcement_queue
      const enforcementRef = doc(db, "enforcement_queue", complaintId);
      batch.set(enforcementRef, enforcementData);

      await batch.commit();
      console.log(`Successfully stored complaint & enforcement task in Firebase: ${complaintId}`);
    } else {
      console.log("Firebase not initialized on client, using REST API fallback.");
    }
  } catch (err) {
    console.error("Firebase storage failed, using dynamic local fallback:", err);
  }

  // ALWAYS sync with the REST API to update the Excel sheet and the local database "lively"
  try {
    console.log("Submitting complaint to REST API to ensure dynamic local and Excel synchronization...");
    const res = await fetch("/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(complaintData)
    });
    if (!res.ok) {
      throw new Error("Local REST API failed to store complaint.");
    }
    console.log("Successfully synchronized complaint with local server REST API & Excel.");
  } catch (localErr) {
    console.warn("Local server sync failed:", localErr);
  }

  return complaintId;
}

// Update Enforcement task status and sync corresponding citizen complaint status defensively
export async function updateRecommendationStatus(
  recId: string,
  status: "pending" | "dispatched" | "resolved" | "dismissed",
  notes?: string,
  officerName?: string
): Promise<boolean> {
  const timestamp = new Date().toISOString();
  let firebaseUpdated = false;
  
  try {
    const db = await initializeFirebase();
    if (db) {
      const batch = writeBatch(db);
      
      // Update enforcement_queue
      const enforcementRef = doc(db, "enforcement_queue", recId);
      const enfStatus = status === "dispatched" ? "dispatched" : status === "resolved" ? "resolved" : status === "dismissed" ? "dismissed" : "pending";
      batch.set(enforcementRef, {
        status: enfStatus,
        inspectedAt: status === "resolved" || status === "dismissed" ? timestamp : null,
        inspectionNotes: notes || null,
        assignedOfficer: officerName || "Officer Priya Sharma"
      }, { merge: true });
      
      // Attempt to also update corresponding citizen complaint in pollution_complaints
      const complaintRef = doc(db, "pollution_complaints", recId);
      const compStatus = status === "dispatched" ? "Dispatched" : status === "resolved" ? "Resolved" : status === "dismissed" ? "Dismissed" : "Pending";
      batch.set(complaintRef, {
        status: compStatus,
        assignedOfficer: officerName || "Officer Priya Sharma"
      }, { merge: true });
      
      await batch.commit();
      firebaseUpdated = true;
      console.log(`Successfully updated Firebase status for task ${recId} to ${status}`);
    }
  } catch (err) {
    console.error("Firebase status update failed, falling back to local REST:", err);
  }

  // ALWAYS update the REST API to keep Excel and DB updated lively!
  try {
    console.log(`Syncing status update for ${recId} with REST API...`);
    const res = await fetch(`/api/recommendations/${recId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes, officerName })
    });
    return res.ok || firebaseUpdated;
  } catch (e) {
    console.error("Local status update fallback failed:", e);
    return firebaseUpdated;
  }
}
