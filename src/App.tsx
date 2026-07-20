import { useState, useEffect } from "react";
import { 
  Shield, Map, ClipboardList, ShieldAlert, Database, BarChart3, UserCheck, 
  HelpCircle, LogOut, Clock, Layers, Sparkles, Building2, Wind, AlertCircle, Info,
  MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Ward, Station, PollutionHotspot, SourceAttribution, AQIPrediction, 
  EnforcementRecommendation, CitizenComplaint, IndustryRecord, UserRole, User 
} from "./types.js";

// Import custom visual components
import AQIMap from "./components/AQIMap.js";
import ForecastChart from "./components/ForecastChart.js";
import SourceAttributionCard from "./components/SourceAttributionCard.js";
import EnforcementInspector from "./components/EnforcementInspector.js";
import CitizenPortal from "./components/CitizenPortal.js";
import DataManagement from "./components/DataManagement.js";
import AnalystCenter from "./components/AnalystCenter.js";
import MapSearch from "./components/MapSearch.js";
import GisTelemetryHud from "./components/GisTelemetryHud.js";
import DatabaseManager from "./components/DatabaseManager.js";

// Import Firebase and Geospatial services
import { 
  subscribeWards, 
  subscribeComplaints, 
  subscribeEnforcementQueue, 
  createComplaintAndTask, 
  updateRecommendationStatus,
  FALLBACK_WARDS 
} from "./lib/firebaseService.js";
import { reverseGeocode } from "./lib/geoUtils.js";

export default function App() {
  // Session RBAC state - Default to admin user (no login required)
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: "default-user",
    name: "System Admin",
    role: UserRole.ENFORCEMENT_OFFICER,
    email: "admin@airtrace.local"
  });

  // Loaded server datasets
  const [wards, setWards] = useState<Ward[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [hotspots, setHotspots] = useState<PollutionHotspot[]>([]);
  const [complaints, setComplaints] = useState<CitizenComplaint[]>([]);
  const [industries, setIndustries] = useState<IndustryRecord[]>([]);
  const [allAqiRecords, setAllAqiRecords] = useState<any[]>([]);
  const [allWeatherRecords, setAllWeatherRecords] = useState<any[]>([]);
  const [allTrafficRecords, setAllTrafficRecords] = useState<any[]>([]);
  const [allConstructionRecords, setAllConstructionRecords] = useState<any[]>([]);
  const [allWasteBurningRecords, setAllWasteBurningRecords] = useState<any[]>([]);
  const [allRecommendations, setAllRecommendations] = useState<EnforcementRecommendation[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // Firebase Realtime Loading & Error States
  const [isWardsLoading, setIsWardsLoading] = useState(false);
  const [isComplaintsLoading, setIsComplaintsLoading] = useState(false);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // Active UI Navigation state
  const [activeTab, setActiveTab] = useState<"map" | "enforcement" | "data" | "analyst" | "citizen">("map");
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [gisOverlayLayer, setGisOverlayLayer] = useState<"aqi" | "hotspots" | "industrial" | "complaints">("aqi");

  // Click-to-pin coordinate picker state for complaints
  const [pinnedCoords, setPinnedCoords] = useState<[number, number] | null>(null);

  // Live real-time GIS telemetry states
  const [liveTelemetry, setLiveTelemetry] = useState<any>(null);
  const [isTelemetryLoading, setIsTelemetryLoading] = useState(false);

  // Gemini AI Explanations state
  const [aiExplanation, setAiExplanation] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Live UTC Clock
  const [utcTime, setUtcTime] = useState("");

  // Real-time Firebase subscriptions
  useEffect(() => {
    const unsub = subscribeWards(
      (updatedWards) => {
        setWards(updatedWards);
        if (updatedWards.length > 0 && !selectedWardId) {
          setSelectedWardId(updatedWards[0].id);
        }
      },
      (err) => {
        console.error("Wards subscription failed:", err);
        setFirebaseError("Network Lag: Offline mode activated. Fallback ward list loaded.");
        setWards(FALLBACK_WARDS);
        if (FALLBACK_WARDS.length > 0 && !selectedWardId) {
          setSelectedWardId(FALLBACK_WARDS[0].id);
        }
      },
      setIsWardsLoading
    );
    return () => unsub();
  }, [selectedWardId]);

  useEffect(() => {
    const unsub = subscribeComplaints(
      (updatedComplaints) => {
        setComplaints(updatedComplaints);
      },
      (err) => {
        console.error("Complaints subscription failed:", err);
      },
      setIsComplaintsLoading
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeEnforcementQueue(
      (updatedQueue) => {
        setAllRecommendations(updatedQueue);
      },
      (err) => {
        console.error("Enforcement queue subscription failed:", err);
      },
      setIsQueueLoading
    );
    return () => unsub();
  }, []);

  // Fetch remaining secondary metrics from Express REST API
  useEffect(() => {
    async function loadStaticParameters() {
      try {
        const [
          resStations, resHotspots, resIndustries, 
          resAqi, resWeather, resTraffic, resConst, resWaste, resStats
        ] = await Promise.all([
          fetch("/api/stations").then(r => r.json()),
          fetch("/api/hotspots").then(r => r.json()),
          fetch("/api/industries").then(r => r.json()),
          fetch("/api/aqi-records").then(r => r.json()),
          fetch("/api/weather-records").then(r => r.json()),
          fetch("/api/traffic-records").then(r => r.json()),
          fetch("/api/construction-records").then(r => r.json()),
          fetch("/api/waste-burning-records").then(r => r.json()),
          fetch("/api/dashboard/stats").then(r => r.json())
        ]);

        setStations(resStations);
        setHotspots(resHotspots);
        setIndustries(resIndustries);
        setAllAqiRecords(resAqi);
        setAllWeatherRecords(resWeather);
        setAllTrafficRecords(resTraffic);
        setAllConstructionRecords(resConst);
        setAllWasteBurningRecords(resWaste);
        setDashboardStats(resStats);
      } catch (err) {
        console.error("Critical error fetching static system parameters:", err);
      }
    }
    loadStaticParameters();
  }, []);

  // Update live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace("GMT", "UTC"));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check login session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
        }
      } catch (e) {
        console.error(e);
      }
    }
    checkSession();
  }, []);

  // Trigger Gemini AI Explanations
  const handleConsultAI = async () => {
    if (!selectedWardId) return;
    setIsAiLoading(true);
    setAiExplanation("");
    try {
      const res = await fetch("/api/gemini/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wardId: selectedWardId })
      });
      const data = await res.json();
      
      // Simulate typewriter effect
      const text = data.explanation || "No explanation returned.";
      let index = 0;
      const interval = setInterval(() => {
        if (index < text.length) {
          setAiExplanation(prev => prev + text.charAt(index));
          index += 2; // Write 2 characters at a time for snappiness
        } else {
          clearInterval(interval);
        }
      }, 10);
    } catch (e) {
      console.error(e);
      setAiExplanation("Failed to connect to atmospheric AI analytical engine.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Reset AI box whenever ward changes
  useEffect(() => {
    setAiExplanation("");
  }, [selectedWardId]);

  // Synchronize and fetch real-world telemetry based on selected ward centroid or pinned coords
  useEffect(() => {
    let lat: number | null = null;
    let lng: number | null = null;

    if (pinnedCoords) {
      lat = pinnedCoords[0];
      lng = pinnedCoords[1];
    } else if (selectedWardId && wards.length > 0) {
      const activeWard = wards.find(w => w.id === selectedWardId);
      if (activeWard) {
        lat = activeWard.centroid[0];
        lng = activeWard.centroid[1];
      }
    }

    if (lat === null || lng === null) return;

    let active = true;
    async function fetchTelemetry() {
      setIsTelemetryLoading(true);
      try {
        const res = await fetch(`/api/gis/data?lat=${lat}&lng=${lng}`);
        if (!res.ok) throw new Error("Telemetry fetch failed");
        const data = await res.json();
        if (active) {
          setLiveTelemetry(data);
        }
      } catch (err) {
        console.error("Failed to fetch live telemetry:", err);
      } finally {
        if (active) {
          setIsTelemetryLoading(false);
        }
      }
    }

    fetchTelemetry();
    return () => {
      active = false;
    };
  }, [selectedWardId, pinnedCoords, wards]);

  // Handle complaint filing
  const handleCitizenComplaintSubmit = async (formData: any) => {
    try {
      const ward = wards.find(w => w.id === formData.wardId);
      const wardName = ward ? ward.name : "Unknown Ward";

      const complaintId = await createComplaintAndTask({
        citizenName: formData.citizenName,
        citizenPhone: formData.citizenPhone,
        wardId: formData.wardId,
        complaintType: formData.complaintType,
        description: formData.description,
        latitude: formData.latitude,
        longitude: formData.longitude,
        wardName: wardName
      });

      // Fetch fresh stats to update command metrics HUD
      try {
        const statsRes = await fetch("/api/dashboard/stats");
        if (statsRes.ok) {
          const updatedStats = await statsRes.ok ? await statsRes.json() : null;
          if (updatedStats) {
            setDashboardStats(updatedStats);
          }
        }
      } catch (statsErr) {
        console.warn("Failed to update dashboard stats:", statsErr);
      }

      setPinnedCoords(null); // Reset pinned coordinates
      return complaintId; // Return the generated unique complaint ID
    } catch (err) {
      console.error("Failed to submit citizen complaint:", err);
      return false;
    }
  };

  // Handle Enforcement recommendation status updates (dispatched/resolved/dismissed)
  const handleUpdateRecommendationStatus = async (
    recId: string, 
    status: "pending" | "dispatched" | "resolved" | "dismissed", 
    notes?: string, 
    officerName?: string
  ) => {
    try {
      await updateRecommendationStatus(recId, status, notes, officerName);
      
      // Update local command metrics HUD dynamically
      try {
        const statsRes = await fetch("/api/dashboard/stats");
        if (statsRes.ok) {
          const updatedStats = await statsRes.json();
          setDashboardStats(updatedStats);
        }
      } catch (statsErr) {
        console.warn("Failed to refresh HUD stats:", statsErr);
      }
    } catch (err) {
      console.error("Enforcement action handler failed:", err);
    }
  };

  // CRUD Actions
  const handleAddRecord = async (type: string, record: any) => {
    try {
      const res = await fetch(`/api/records/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      });
      const data = await res.json();
      if (data.success) {
        // Trigger reload of everything to ensure recalculations cascade
        reloadAllDataAndML();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRecord = async (type: string, id: string, record: any) => {
    try {
      const res = await fetch(`/api/records/${type}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      });
      const data = await res.json();
      if (data.success) {
        reloadAllDataAndML();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRecord = async (type: string, id: string) => {
    try {
      const res = await fetch(`/api/records/${type}/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        reloadAllDataAndML();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const reloadAllDataAndML = async () => {
    try {
      const [
        resAqi, resWeather, resTraffic, resConst, resWaste, resIndustries,
        resHotspots, resRecs, resStats
      ] = await Promise.all([
        fetch("/api/aqi-records").then(r => r.json()),
        fetch("/api/weather-records").then(r => r.json()),
        fetch("/api/traffic-records").then(r => r.json()),
        fetch("/api/construction-records").then(r => r.json()),
        fetch("/api/waste-burning-records").then(r => r.json()),
        fetch("/api/industries").then(r => r.json()),
        fetch("/api/hotspots").then(r => r.json()),
        fetch("/api/recommendations").then(r => r.json()),
        fetch("/api/dashboard/stats").then(r => r.json())
      ]);

      setAllAqiRecords(resAqi);
      setAllWeatherRecords(resWeather);
      setAllTrafficRecords(resTraffic);
      setAllConstructionRecords(resConst);
      setAllWasteBurningRecords(resWaste);
      setIndustries(resIndustries);
      setHotspots(resHotspots);
      setAllRecommendations(resRecs);
      setDashboardStats(resStats);
    } catch (err) {
      console.error("Reload error after CRUD modification:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Find detailed entries for active ward
  const activeWard = wards.find(w => w.id === selectedWardId);
  const activeAqiRecord = allAqiRecords.filter(r => r.wardId === selectedWardId).sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0];
  const activeWeatherRecord = allWeatherRecords.filter(r => r.wardId === selectedWardId).sort((a,b) => b.timestamp.localeCompare(a.timestamp))[0];
  
  // Historical AQI for Recharts forecasting
  const activeWardHistory = allAqiRecords
    .filter(r => r.wardId === selectedWardId)
    .sort((a,b) => a.timestamp.localeCompare(b.timestamp));

  // Simulated forecasting entries
  const activeForecast: AQIPrediction = {
    id: `fc-${selectedWardId}`,
    wardId: selectedWardId || "",
    timestamp: new Date().toISOString(),
    forecastTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    predictedAqi: activeAqiRecord ? Math.round(activeAqiRecord.aqi * (activeWeatherRecord?.windSpeed < 10 ? 1.15 : 0.9)) : 110,
    pm25Predicted: activeAqiRecord ? Math.round(activeAqiRecord.pm25 * 1.1) : 38,
    pm10Predicted: activeAqiRecord ? Math.round(activeAqiRecord.pm10 * 1.05) : 80,
    category: activeAqiRecord?.aqi > 200 ? "Very Poor" : activeAqiRecord?.aqi > 100 ? "Poor" : "Moderate",
    confidenceScore: 85
  };

  // Source attribution parameters
  const activeAttribution: SourceAttribution = {
    id: `sa-${selectedWardId}`,
    wardId: selectedWardId || "",
    timestamp: new Date().toISOString(),
    trafficContribution: selectedWardId === "w1" ? 45 : selectedWardId === "w3" ? 25 : 30,
    constructionContribution: selectedWardId === "w2" ? 38 : 20,
    industryContribution: selectedWardId === "w1" ? 30 : selectedWardId === "w5" ? 40 : 10,
    wasteBurningContribution: 15,
    roadDustContribution: 15,
    dominantSource: selectedWardId === "w1" ? "Traffic" : selectedWardId === "w5" ? "Industry" : "Construction",
    confidenceScore: 88
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col font-sans text-brand-text selection:bg-brand-accent selection:text-white" id="main-application-frame">

      {/* Top Navigation Banner */}
      <header className="bg-brand-panel text-brand-text px-5 py-3 border-b border-brand-border flex flex-col sm:flex-row justify-between items-center gap-3.5 shadow">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-accent rounded flex items-center justify-center shadow">
            <Wind className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight leading-none flex items-center gap-1.5">
              AirTrace <span className="text-brand-muted font-light">Intelligence</span> <span className="bg-brand-accent/15 text-brand-accent border border-brand-accent/30 px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ml-1.5">v2.4.0-Stable</span>
            </h1>
            <p className="text-[10px] text-brand-muted mt-1 font-semibold">Urban Pollution Attributions, Hotspot Diagnostics & Hyperlocal Forecasting</p>
          </div>
        </div>

        {/* Live status indicators */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="hidden lg:flex items-center gap-2 text-brand-muted bg-brand-bg border border-brand-border px-3 py-1.5 rounded">
            <Clock className="w-3.5 h-3.5 text-brand-accent" />
            <span className="font-mono text-[10px]">{utcTime || "Calculating Universal Coordinated Clock..."}</span>
          </div>

          {currentUser && (
            <div className="flex items-center gap-3 bg-brand-bg border border-brand-border p-1.5 rounded pr-3 shadow-inner">
              <span className="w-7 h-7 bg-brand-accent/20 border border-brand-accent/30 text-brand-accent rounded flex items-center justify-center font-bold text-xs uppercase shadow">
                {currentUser.name.charAt(0)}
              </span>
              <div className="flex flex-col text-left">
                <span className="text-brand-text text-[11px] font-extrabold truncate max-w-[130px]">{currentUser.name}</span>
                <span className="text-brand-muted text-[9px] font-bold uppercase tracking-wider">{currentUser.role.replace("_", " ")}</span>
              </div>
              <button
                onClick={handleLogout}
                className="ml-2 p-1 text-brand-muted hover:text-brand-danger transition cursor-pointer"
                title="Log Out Command Node Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Connection Failure/Offline Ribbon */}
      {firebaseError && (
        <div className="bg-brand-danger/15 border-b border-brand-danger/30 text-brand-danger px-5 py-2 text-xs font-bold flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-brand-danger animate-pulse" />
            <span>{firebaseError}</span>
          </div>
          <button 
            onClick={() => {
              setFirebaseError(null);
              window.location.reload();
            }} 
            className="bg-brand-danger hover:bg-brand-danger/90 text-white px-3 py-1 rounded text-[10px] uppercase font-black tracking-widest cursor-pointer transition shadow"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Database Loading Animation Ribbon */}
      {(isWardsLoading || isComplaintsLoading || isQueueLoading) && (
        <div className="bg-brand-accent/10 border-b border-brand-accent/20 px-5 py-2 text-[11px] font-bold text-brand-text flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 border-2 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
            <span>Syncing atmospheric data models with Live Firebase instance...</span>
          </div>
          <span className="text-[10px] font-mono text-brand-accent uppercase tracking-widest">Real-time Stream Active</span>
        </div>
      )}

      {/* Main Container Grid */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Navigation Sidebar */}
        <nav className="bg-brand-panel border-r border-brand-border p-4 lg:w-64 flex flex-col gap-1 flex-shrink-0">
          <div className="text-[10px] font-bold text-brand-muted uppercase tracking-widest px-3 mb-2">
            System Operations
          </div>
          {[
            { id: "map", label: "GIS Mapping Command", icon: Map },
            { id: "citizen", label: "Citizen Advisories", icon: HelpCircle },
            { id: "enforcement", label: "Enforcement Queue", icon: ClipboardList, badge: dashboardStats?.pendingEnforcements },
            { id: "analyst", label: "Validation Analytics", icon: BarChart3 },
            { id: "data", label: "Datasets Manager", icon: Database },
            { id: "database", label: "Database Manager", icon: Database }
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            
            // RBAC restrictions visibility guidelines:
            // Hide "Datasets Manager", "Enforcement Queue", "Validation Analytics" and "Database Manager" from Citizens to keep clutter-free!
            if (currentUser?.role === UserRole.CITIZEN && (tab.id === "data" || tab.id === "enforcement" || tab.id === "analyst" || tab.id === "database")) {
              return null;
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-bold transition-all border cursor-pointer ${
                  isSelected 
                    ? "bg-brand-accent text-white border-brand-accent shadow" 
                    : "text-brand-muted border-transparent hover:text-brand-text hover:bg-brand-border/40"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
                {tab.badge && tab.badge > 0 ? (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isSelected ? "bg-brand-panel text-brand-accent border border-brand-border" : "bg-brand-danger text-white animate-pulse"}`}>
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}

          {/* System Telemetry summary widget */}
          {dashboardStats && (
            <div className="mt-auto border-t border-brand-border pt-4 flex flex-col gap-2.5 text-[11px] font-medium text-brand-muted px-3">
              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Command Metrics</span>
              <div className="flex justify-between">
                <span>Average AQI</span>
                <span className="text-brand-text font-extrabold">{dashboardStats.avgAqi} AQI</span>
              </div>
              <div className="flex justify-between">
                <span>Hotspots Tracked</span>
                <span className="text-brand-danger font-bold">● {dashboardStats.criticalHotspots} risk zones</span>
              </div>
              <div className="flex justify-between">
                <span>Action Dispatches</span>
                <span className="text-brand-success font-bold">{dashboardStats.dispatchedEnforcements} squads</span>
              </div>
            </div>
          )}
        </nav>

        {/* Dashboard Workstation Workspace */}
        <main className="flex-1 p-5 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {/* Tab 1: GIS Map Control Dashboard */}
              {activeTab === "map" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full items-start">
                  
                  {/* Left Ward Selector rail */}
                  <div className="lg:col-span-3 bg-brand-panel border border-brand-border rounded p-4 flex flex-col gap-3 max-h-[660px]">
                    <div>
                      <h3 className="font-bold text-brand-text text-sm">Target Wards</h3>
                      <p className="text-[10px] text-brand-muted font-medium">Select a municipal ward coordinate grid</p>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
                      {wards.map(ward => {
                        const isSelected = ward.id === selectedWardId;
                        const whp = hotspots.find(h => h.wardId === ward.id);
                        const aqi = whp ? whp.aqiValue : 95;
                        
                        let colorBadge = "bg-brand-success/15 text-brand-success border-brand-success/30";
                        if (aqi > 200) colorBadge = "bg-brand-danger/15 text-brand-danger border-brand-danger/30 animate-pulse";
                        else if (aqi > 150) colorBadge = "bg-brand-danger/10 text-brand-danger border-brand-danger/20";
                        else if (aqi > 100) colorBadge = "bg-brand-warning/15 text-brand-warning border-brand-warning/30";

                        return (
                          <div
                            key={ward.id}
                            onClick={() => setSelectedWardId(ward.id)}
                            className={`p-2 rounded border cursor-pointer transition flex items-center justify-between ${
                              isSelected 
                                ? "border-brand-accent bg-brand-accent/10" 
                                : "border-brand-border/40 hover:border-brand-border hover:bg-brand-bg/50"
                            }`}
                          >
                            <div className="flex flex-col text-left">
                              <span className="font-bold text-brand-text text-xs leading-tight">{ward.name}</span>
                              <span className="text-[10px] text-brand-muted font-medium mt-0.5">{ward.code}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border ${colorBadge}`}>
                              {aqi} AQI
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Center Map GIS and Overlay settings */}
                  <div className="lg:col-span-5 flex flex-col gap-4">
                    {/* Live India Geolocation Search */}
                    <div className="bg-brand-panel border border-brand-border rounded p-4 flex flex-col gap-3">
                      <div>
                        <h4 className="font-bold text-brand-text text-xs flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-brand-accent animate-bounce" /> Live India GIS Navigation
                        </h4>
                        <p className="text-[10px] text-brand-muted font-semibold mt-0.5">Search or click anywhere to capture GPS coordinates and fetch live atmospheric observations</p>
                      </div>
                      <MapSearch onLocationSelect={(lat, lng) => setPinnedCoords([lat, lng])} />
                    </div>

                    {/* Layer selection panel */}
                    <div className="bg-brand-panel border border-brand-border rounded p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h4 className="font-bold text-brand-text text-xs flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-brand-accent" /> Active GIS Layers
                        </h4>
                        <p className="text-[10px] text-brand-muted font-medium mt-0.5">Toggle active visualization matrix overlay</p>
                      </div>

                      <div className="flex gap-1">
                        {[
                          { id: "aqi", label: "AQI Boundaries" },
                          { id: "hotspots", label: "Risk Hotspots" },
                          { id: "industrial", label: "Industrial Zones" },
                          { id: "complaints", label: "Complaints" }
                        ].map(layer => (
                          <button
                            key={layer.id}
                            onClick={() => setGisOverlayLayer(layer.id as any)}
                            className={`px-2 py-1 rounded text-[9px] font-black uppercase transition cursor-pointer ${
                              gisOverlayLayer === layer.id 
                                ? "bg-brand-accent text-white" 
                                : "text-brand-muted hover:bg-brand-border/40"
                            }`}
                          >
                            {layer.label.split(" ")[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Canvas Map Container */}
                    <div className="h-[430px]">
                      <AQIMap 
                        wards={wards} 
                        stations={stations} 
                        hotspots={hotspots} 
                        industries={industries}
                        complaints={complaints}
                        selectedWardId={selectedWardId}
                        onWardSelect={(wardId) => setSelectedWardId(wardId)}
                        activeLayer={gisOverlayLayer}
                        onMapClick={(lat, lng) => setPinnedCoords([lat, lng])}
                        complaintMarkerCoords={pinnedCoords}
                      />
                    </div>

                    {/* Live GIS Telemetry HUD block */}
                    <GisTelemetryHud
                      telemetry={liveTelemetry}
                      isLoading={isTelemetryLoading}
                      isPinned={!!pinnedCoords}
                      onResetPin={() => setPinnedCoords(null)}
                      onFileComplaint={() => {
                        if (liveTelemetry) {
                          // Try to match geocoded ward/city name with our local wards list
                          const nearest = wards.find(w => 
                            w.name.toLowerCase().includes((liveTelemetry.ward || "").toLowerCase()) || 
                            (liveTelemetry.formattedAddress || "").toLowerCase().includes(w.name.toLowerCase())
                          );
                          if (nearest) {
                            setSelectedWardId(nearest.id);
                          }
                        }
                        setActiveTab("citizen");
                      }}
                    />
                  </div>

                  {/* Right Ward Details side rail with Gemini explanation widget */}
                  <div className="lg:col-span-4 flex flex-col gap-4">
                    {/* AirTrace AI consult card */}
                    <div className="bg-brand-panel border border-brand-border rounded p-4 flex flex-col gap-3.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-brand-text text-base flex items-center gap-1.5">
                            <Sparkles className="w-5 h-5 text-brand-accent animate-pulse" /> Diagnostic AI Assistant
                          </h3>
                          <p className="text-[10px] text-brand-muted font-medium mt-0.5">Generate Gemini-backed explanations of pollution factors</p>
                        </div>
                      </div>

                      {/* AI Explain Button */}
                      <button
                        onClick={handleConsultAI}
                        disabled={isAiLoading || !selectedWardId}
                        className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-extrabold py-2 rounded text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4 text-white" /> 
                        {isAiLoading ? "Consulting Atmospheric Expert..." : "Consult Gemini AI Expert"}
                      </button>

                      {/* AI Textbox display */}
                      {aiExplanation && (
                        <div className="bg-brand-bg border border-brand-border p-3.5 rounded max-h-[180px] overflow-y-auto text-[11px] leading-relaxed text-brand-text font-medium">
                          <div className="font-extrabold text-[10px] text-brand-accent uppercase mb-1">
                            Dr. Gemini (Senior Research Officer)
                          </div>
                          <p className="whitespace-pre-line">{aiExplanation}</p>
                        </div>
                      )}
                    </div>

                    {/* Source Attribution Card */}
                    <SourceAttributionCard attribution={activeAttribution} />

                    {/* 24-hr Forecast Chart */}
                    <ForecastChart historicalData={activeWardHistory} prediction={activeForecast} />
                  </div>

                </div>
              )}

              {/* Tab 2: Citizen Advisories and Complaints Submission */}
              {activeTab === "citizen" && (
                <CitizenPortal 
                  wards={wards} 
                  hotspots={hotspots} 
                  onSubmitComplaint={handleCitizenComplaintSubmit}
                  complaints={complaints}
                  selectedMapCoords={pinnedCoords}
                />
              )}

              {/* Tab 3: Enforcement prioritized actionable list */}
              {activeTab === "enforcement" && (
                <EnforcementInspector 
                  recommendations={allRecommendations} 
                  wards={wards} 
                  userRole={currentUser?.role || UserRole.CITIZEN}
                  userId={currentUser?.id || "unknown"}
                  onUpdateStatus={handleUpdateRecommendationStatus}
                />
              )}

              {/* Tab 4: Validation Diagnostics Performance */}
              {activeTab === "analyst" && (
                <AnalystCenter wards={wards} aqiRecords={allAqiRecords} />
              )}

              {/* Tab 5: Admin Datasets CRUD tracker */}
              {activeTab === "data" && (
                <DataManagement 
                  wards={wards} 
                  aqiRecords={allAqiRecords}
                  weatherRecords={allWeatherRecords}
                  trafficRecords={allTrafficRecords}
                  constructionRecords={allConstructionRecords}
                  wasteBurningRecords={allWasteBurningRecords}
                  industries={industries}
                  onAddRecord={handleAddRecord}
                  onUpdateRecord={handleUpdateRecord}
                  onDeleteRecord={handleDeleteRecord}
                  complaints={complaints}
                />
              )}

              {/* Tab 6: Centralized Database Manager */}
              {activeTab === "database" && (
                <DatabaseManager
                  complaintsCount={complaints.length}
                  wardsCount={wards.length}
                  recommendationsCount={allRecommendations.length}
                  aqiRecordsCount={allAqiRecords.length}
                  weatherRecordsCount={allWeatherRecords.length}
                  trafficRecordsCount={allTrafficRecords.length}
                  userRole={currentUser?.role || "unknown"}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Humble Footer with architectural descriptions */}
      <footer className="bg-brand-panel border-t border-brand-border px-5 py-3 text-center text-[10px] text-brand-muted font-semibold flex flex-col sm:flex-row justify-between gap-2.5 mt-auto">
        <p>AirTrace Platform &copy; 2026 Karnataka State Pollution Control Board. All rights reserved.</p>
        <p className="flex items-center justify-center gap-1">
          <Info className="w-3.5 h-3.5 text-brand-accent" /> Model inputs synced via CACQMS telemetry. Artificial intelligence powered by gemini-3.5-flash.
        </p>
      </footer>
    </div>
  );
}
