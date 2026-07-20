import React, { useState, useEffect } from "react";
import { Languages, AlertTriangle, Megaphone, MapPin, CheckCircle, ShieldAlert } from "lucide-react";
import { Ward, CitizenComplaint, PollutionHotspot } from "../types.js";
import { reverseGeocode } from "../lib/geoUtils.js";

interface CitizenPortalProps {
  wards: Ward[];
  hotspots: PollutionHotspot[];
  onSubmitComplaint: (formData: any) => Promise<string | boolean>;
  complaints: CitizenComplaint[];
  selectedMapCoords: [number, number] | null;
}

export default function CitizenPortal({
  wards,
  hotspots,
  onSubmitComplaint,
  complaints,
  selectedMapCoords
}: CitizenPortalProps) {
  const [selectedWardId, setSelectedWardId] = useState("");
  const [advisoryLanguage, setAdvisoryLanguage] = useState<"en" | "ta" | "hi" | "kn">("en");
  const [advisoryText, setAdvisoryText] = useState("");
  const [isLoadingAdvisory, setIsLoadingAdvisory] = useState(false);

  // Complaint Form state
  const [citizenName, setCitizenName] = useState("");
  const [citizenPhone, setCitizenPhone] = useState("");
  const [complaintType, setComplaintType] = useState<"waste_burning" | "construction_dust" | "industrial_smoke" | "heavy_traffic" | "other">("waste_burning");
  const [description, setDescription] = useState("");
  const [complaintSuccess, setComplaintSuccess] = useState(false);
  const [complaintIdRef, setComplaintIdRef] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Synchronize selectedWardId when wards are loaded
  useEffect(() => {
    if (wards.length > 0 && !selectedWardId) {
      setSelectedWardId(wards[0].id);
    }
  }, [wards, selectedWardId]);

  // BUG FIX 5: Automatically select nearest ward when map coordinate changes
  useEffect(() => {
    if (selectedMapCoords && wards.length > 0) {
      const geoResult = reverseGeocode(selectedMapCoords[0], selectedMapCoords[1], wards);
      if (geoResult.nearestWard) {
        setSelectedWardId(geoResult.nearestWard.id);
      }
    }
  }, [selectedMapCoords, wards]);

  const activeHotspot = hotspots.find(h => h.wardId === selectedWardId);
  const activeAqi = activeHotspot ? activeHotspot.aqiValue : 95;

  // Fetch advisory when ward or language changes
  useEffect(() => {
    async function fetchAdvisory() {
      setIsLoadingAdvisory(true);
      try {
        const res = await fetch("/api/gemini/advisory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aqi: activeAqi, language: advisoryLanguage })
        });
        const data = await res.json();
        setAdvisoryText(data.advisory);
      } catch (e) {
        console.error("Failed to load health advisory:", e);
        setAdvisoryText("Unable to load advisory at this time.");
      } finally {
        setIsLoadingAdvisory(false);
      }
    }
    fetchAdvisory();
  }, [selectedWardId, advisoryLanguage, activeAqi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate fields. Required fields: Name, Phone, Incident Category, Incident Ward, Coordinates
    if (!citizenName.trim()) {
      setValidationError("Your Full Name is a required field.");
      return;
    }
    if (!citizenPhone.trim()) {
      setValidationError("Your Phone Number is a required field.");
      return;
    }
    if (!selectedWardId) {
      setValidationError("Incident Ward is a required field. If empty, select a target location or pin the map.");
      return;
    }
    if (!selectedMapCoords) {
      setValidationError("Incident GPS Coordinates are required. Click anywhere on the GIS map to place a pin.");
      return;
    }
    if (!description.trim()) {
      setValidationError("Incident Description is a required field.");
      return;
    }

    const lat = selectedMapCoords[0];
    const lng = selectedMapCoords[1];

    const result = await onSubmitComplaint({
      citizenName,
      citizenPhone,
      wardId: selectedWardId,
      complaintType,
      description,
      latitude: lat,
      longitude: lng
    });

    if (result) {
      setComplaintIdRef(result.toString());
      setComplaintSuccess(true);
      setCitizenName("");
      setCitizenPhone("");
      setDescription("");
      setValidationError(null);
    } else {
      setValidationError("Critical: Synchronization to live Firebase cluster failed. Fallback REST pipeline offline. Please retry submission.");
    }
  };

  const getAdvisoryColor = (val: number) => {
    if (val <= 50) return "border-brand-success/30 bg-brand-success/10 text-brand-success";
    if (val <= 100) return "border-brand-accent/30 bg-brand-accent/10 text-brand-text";
    if (val <= 150) return "border-brand-warning/20 bg-brand-warning/10 text-brand-warning";
    if (val <= 200) return "border-brand-warning/30 bg-brand-warning/15 text-brand-warning";
    return "border-brand-danger/30 bg-brand-danger/10 text-brand-danger animate-pulse";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full items-start">
      {/* Advisories & Local Indicators */}
      <div className="lg:col-span-6 flex flex-col gap-4">
        {/* Advisories Panel */}
        <div className="bg-brand-panel border border-brand-border rounded p-4 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-brand-text text-sm">Multilingual Advisories</h3>
              <p className="text-[10px] text-brand-muted font-medium mt-0.5">Atmospheric guidance based on localized ward AQI levels</p>
            </div>
            
            {/* Language Toggles */}
            <div className="flex items-center gap-1.5 bg-brand-bg border border-brand-border p-1 rounded">
              <Languages className="w-3.5 h-3.5 text-brand-muted ml-1" />
              {(["en", "ta", "hi", "kn"] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setAdvisoryLanguage(lang)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                    advisoryLanguage === lang 
                      ? "bg-brand-accent text-white" 
                      : "text-brand-muted hover:text-brand-text"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Location Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-brand-muted uppercase">Select Target Location / Ward</label>
            <select
              value={selectedWardId}
              onChange={(e) => setSelectedWardId(e.target.value)}
              className="w-full border border-brand-border px-3 py-1.5 text-xs font-semibold rounded outline-none bg-brand-bg focus:border-brand-accent text-brand-text"
            >
              {wards.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>

          {/* Dynamic Advisory Output */}
          <div className={`p-3 rounded border flex gap-3 transition-all ${getAdvisoryColor(activeAqi)}`}>
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-65">
                Localized Citizen Health Directive (AQI: {activeAqi})
              </span>
              {isLoadingAdvisory ? (
                <span className="text-xs font-medium animate-pulse">Consulting AI health modules...</span>
              ) : (
                <p className="text-xs font-bold leading-relaxed">{advisoryText}</p>
              )}
            </div>
          </div>

          {/* Precautionary Guideline Metrics */}
          <div className="grid grid-cols-2 gap-3 text-[11px] font-medium text-brand-muted">
            <div className="border border-brand-border p-2.5 rounded bg-brand-bg">
              <span className="text-brand-muted block mb-0.5 text-[10px] uppercase">Mask Requirement</span>
              <strong className="text-brand-text font-bold">
                {activeAqi > 200 ? "Mandatory N95 Grade" : activeAqi > 100 ? "Highly Recommended" : "Optional"}
              </strong>
            </div>
            <div className="border border-brand-border p-2.5 rounded bg-brand-bg">
              <span className="text-brand-muted block mb-0.5 text-[10px] uppercase">Outdoor Workouts</span>
              <strong className="text-brand-text font-bold">
                {activeAqi > 200 ? "Strictly Avoid" : activeAqi > 150 ? "Restricted Indoors" : "Safe"}
              </strong>
            </div>
          </div>
        </div>

        {/* Dynamic Alerts Queue */}
        <div className="bg-brand-panel border border-brand-border rounded p-4 max-h-[250px] overflow-y-auto">
          <h4 className="font-bold text-brand-text text-sm mb-3">Recent Citizen Grievance Logs</h4>
          <div className="flex flex-col gap-2">
            {complaints.length === 0 ? (
              <p className="text-xs text-brand-muted italic">No reports submitted recently.</p>
            ) : (
              complaints.map(cmp => (
                <div key={cmp.id} className="border border-brand-border/40 p-2 rounded bg-brand-bg/40 text-[11px] flex justify-between gap-3">
                  <div className="flex flex-col gap-0.5 text-left">
                    <strong className="text-brand-text font-bold capitalize">
                      {cmp.complaintType.replace("_", " ")} Report
                    </strong>
                    <span className="text-brand-muted line-clamp-1 italic">"{cmp.description}"</span>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="px-1.5 py-0.5 rounded bg-brand-warning/15 border border-brand-warning/30 text-brand-warning font-bold text-[9px] uppercase">
                      {cmp.status}
                    </span>
                    <span className="text-[9px] text-brand-muted font-medium">
                      {new Date(cmp.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Complaint Filing Form */}
      <div className="lg:col-span-6 bg-brand-panel border border-brand-border rounded p-4">
        <div className="flex gap-3 items-start border-b border-brand-border pb-3 mb-4">
          <Megaphone className="w-5 h-5 text-brand-accent mt-0.5" />
          <div>
            <h3 className="font-bold text-brand-text text-sm">Submit Pollution Grievance Report</h3>
            <p className="text-[10px] text-brand-muted font-medium mt-0.5">Direct report line to pollution control compliance marshals</p>
          </div>
        </div>

        {validationError && (
          <div className="mb-4 bg-brand-danger/15 border border-brand-danger/30 text-brand-danger p-3 rounded text-xs font-bold flex items-center gap-2 animate-pulse" id="complaint-validation-alert">
            <ShieldAlert className="w-4.5 h-4.5 text-brand-danger flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {complaintSuccess && (
          <div className="mb-4 bg-brand-success/15 border border-brand-success/30 text-brand-success p-3 rounded text-xs font-bold flex flex-col gap-2.5" id="complaint-success-banner">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4.5 h-4.5 text-brand-success flex-shrink-0" />
              <span>Complaint Submitted Successfully.</span>
            </div>
            <div className="text-[11px] bg-brand-bg border border-brand-border p-2.5 rounded text-brand-text font-mono flex justify-between items-center gap-3">
              <span>Reference Number: <strong className="text-brand-accent tracking-wider font-extrabold">{complaintIdRef}</strong></span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(complaintIdRef);
                  const btn = document.getElementById("copy-ref-btn");
                  if (btn) {
                    btn.innerText = "COPIED";
                    setTimeout(() => { btn.innerText = "COPY"; }, 1500);
                  }
                }}
                id="copy-ref-btn"
                className="bg-brand-accent hover:bg-brand-accent/90 text-white px-2 py-0.5 rounded text-[9px] font-black cursor-pointer transition uppercase"
              >
                COPY
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-brand-muted uppercase">Your Full Name</label>
              <input 
                type="text" 
                placeholder="Raju Prasad"
                required
                className="border border-brand-border px-3 py-1.5 text-xs font-semibold rounded outline-none focus:border-brand-accent text-brand-text bg-brand-bg"
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-brand-muted uppercase">Phone Number</label>
              <input 
                type="tel" 
                placeholder="9876543210"
                required
                className="border border-brand-border px-3 py-1.5 text-xs font-semibold rounded outline-none focus:border-brand-accent text-brand-text bg-brand-bg"
                value={citizenPhone}
                onChange={(e) => setCitizenPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-brand-muted uppercase">Incident Category</label>
              <select
                value={complaintType}
                onChange={(e: any) => setComplaintType(e.target.value)}
                className="border border-brand-border px-3 py-1.5 text-xs font-semibold rounded outline-none focus:border-brand-accent text-brand-text bg-brand-bg"
              >
                <option value="waste_burning">Open Solid Waste Burning</option>
                <option value="construction_dust">Fugitive Construction Dust</option>
                <option value="industrial_smoke">Industrial Stack Smoke</option>
                <option value="heavy_traffic">Severe Traffic Jam Corridors</option>
                <option value="other">Other Point-Source Pollution</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-brand-muted uppercase">Incident Ward</label>
              <select
                value={selectedWardId}
                onChange={(e) => setSelectedWardId(e.target.value)}
                className="border border-brand-border px-3 py-1.5 text-xs font-semibold rounded outline-none focus:border-brand-accent text-brand-text bg-brand-bg"
              >
                {wards.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Spatial Selector feedback */}
          <div className="border border-brand-accent/20 bg-brand-accent/10 p-3 rounded flex gap-2.5 text-[10px] text-brand-text font-medium leading-relaxed">
            <MapPin className="w-5 h-5 text-brand-accent flex-shrink-0 mt-0.5" />
            <div className="flex flex-col text-left">
              <strong>Geospatial Coordinate Pinning:</strong>
              <p className="mt-0.5">
                {selectedMapCoords 
                  ? `Pin set: Latitude ${selectedMapCoords[0].toFixed(5)}, Longitude ${selectedMapCoords[1].toFixed(5)}` 
                  : "Click anywhere directly on the interactive GIS map to select and pin precise GPS coordinates for the pollution incident."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-brand-muted uppercase">Incident Description</label>
            <textarea 
              placeholder="Provide exact details (e.g. Empty plot behind complex, burning plastics, black smoke)..." 
              required
              rows={3}
              className="border border-brand-border px-3 py-1.5 text-xs font-medium rounded outline-none focus:border-brand-accent text-brand-text bg-brand-bg resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white text-xs font-bold py-2.5 rounded cursor-pointer transition shadow"
          >
            File Compliance Complaint
          </button>
        </form>
      </div>
    </div>
  );
}
