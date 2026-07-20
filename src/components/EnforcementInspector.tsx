import { useState } from "react";
import { AlertCircle, CheckCircle2, ShieldAlert, Send, UserPlus } from "lucide-react";
import { EnforcementRecommendation, Ward, UserRole } from "../types.js";

interface EnforcementInspectorProps {
  recommendations: EnforcementRecommendation[];
  wards: Ward[];
  userRole: UserRole;
  userId: string;
  onUpdateStatus: (recId: string, status: "pending" | "dispatched" | "resolved" | "dismissed", notes?: string, officerName?: string) => Promise<void>;
}

export default function EnforcementInspector({
  recommendations,
  wards,
  userRole,
  userId,
  onUpdateStatus
}: EnforcementInspectorProps) {
  const [selectedRecId, setSelectedRecId] = useState<string | null>(
    recommendations.length > 0 ? recommendations[0].id : null
  );
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [officerNameInput, setOfficerNameInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRec = recommendations.find(r => r.id === selectedRecId);
  const selectedWard = selectedRec ? wards.find(w => w.id === selectedRec.wardId) : null;

  const handleStatusChange = async (status: "pending" | "dispatched" | "resolved" | "dismissed") => {
    if (!selectedRec) return;
    setIsSubmitting(true);
    try {
      await onUpdateStatus(
        selectedRec.id, 
        status, 
        inspectionNotes || undefined, 
        officerNameInput || undefined
      );
      setInspectionNotes("");
      setOfficerNameInput("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (level: string) => {
    switch (level) {
      case "critical": return "bg-brand-danger/15 text-brand-danger border-brand-danger/30 animate-pulse";
      case "high": return "bg-brand-danger/10 text-brand-danger border-brand-danger/20";
      case "medium": return "bg-brand-warning/15 text-brand-warning border-brand-warning/30";
      default: return "bg-brand-success/15 text-brand-success border-brand-success/30";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved": return "bg-brand-success/15 text-brand-success border-brand-success/30";
      case "dispatched": return "bg-brand-accent/15 text-brand-accent border-brand-accent/30 animate-pulse";
      case "dismissed": return "bg-brand-border text-brand-muted border-brand-border/60";
      default: return "bg-brand-warning/15 text-brand-warning border-brand-warning/30";
    }
  };

  const isOfficer = userRole === UserRole.POLLUTION_CONTROL_OFFICER || userRole === UserRole.ADMINISTRATOR || userRole === UserRole.MUNICIPAL_OFFICER;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full items-start">
      {/* List Sidebar */}
      <div className="lg:col-span-5 bg-brand-panel border border-brand-border rounded p-4 h-[600px] flex flex-col gap-3">
        <div>
          <h3 className="font-bold text-brand-text text-sm">Prioritization Queue</h3>
          <p className="text-[10px] text-brand-muted font-medium mt-0.5">Risk ranking by AQI progression and vulnerable populations</p>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
          {recommendations.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-brand-muted font-medium italic">
              Queue is empty.
            </div>
          ) : (
            recommendations.map((rec, index) => {
              const ward = wards.find(w => w.id === rec.wardId);
              const isSelected = rec.id === selectedRecId;
              return (
                <div
                  key={rec.id}
                  onClick={() => setSelectedRecId(rec.id)}
                  className={`p-3 rounded border cursor-pointer transition flex flex-col gap-2 ${
                    isSelected 
                      ? "border-brand-accent bg-brand-accent/10" 
                      : "border-brand-border/40 hover:border-brand-border bg-brand-bg/40"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-brand-accent bg-brand-accent/15 w-5 h-5 flex items-center justify-center rounded border border-brand-accent/20">
                        #{index + 1}
                      </span>
                      <h4 className="font-bold text-brand-text text-xs">{ward ? ward.name : "Unknown Ward"}</h4>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border capitalize ${getPriorityColor(rec.priorityLevel)}`}>
                      {rec.priorityLevel}
                    </span>
                  </div>

                  <p className="text-[10px] text-brand-muted line-clamp-2 leading-relaxed text-left">
                    <strong>Suggested Action:</strong> {rec.suggestedAction}
                  </p>

                  <div className="flex justify-between items-center mt-1 pt-2 border-t border-brand-border text-[9px] text-brand-muted font-medium">
                    <span>Forecast: <strong className="text-brand-text">{rec.evidence.predictedAqi} AQI</strong></span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] border font-bold uppercase ${getStatusBadge(rec.status)}`}>
                      {rec.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Detail Viewer */}
      <div className="lg:col-span-7 bg-brand-panel border border-brand-border rounded p-4 min-h-[600px] flex flex-col gap-4">
        {selectedRec && selectedWard ? (
          <div className="flex flex-col gap-4 h-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2 border-b border-brand-border pb-3">
              <div>
                <span className="text-[9px] font-bold text-brand-accent tracking-wider bg-brand-accent/10 px-2 py-0.5 rounded uppercase border border-brand-accent/20">
                  Priority Enforcement
                </span>
                <h3 className="font-extrabold text-brand-text text-base mt-1.5">{selectedWard.name} ({selectedWard.code})</h3>
                <p className="text-[10px] text-brand-muted font-medium mt-0.5">Municipal compliance & enforcement diagnostics</p>
              </div>
              <div className="flex sm:flex-col items-start sm:items-end gap-1.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${getPriorityColor(selectedRec.priorityLevel)}`}>
                  {selectedRec.priorityLevel} Priority ({selectedRec.priorityScore})
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${getStatusBadge(selectedRec.status)}`}>
                  STATUS: {selectedRec.status}
                </span>
              </div>
            </div>

            {/* Core Action & Reason */}
            <div className="p-3 bg-brand-bg border border-brand-border rounded flex flex-col gap-2 text-left">
              <span className="text-[9px] font-bold text-brand-accent uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> RECOMMENDED ACTIONS
              </span>
              <p className="text-brand-text font-bold text-xs leading-relaxed">
                {selectedRec.suggestedAction}
              </p>
              <div className="mt-1 text-[10px] text-brand-muted bg-brand-panel border border-brand-border p-2.5 rounded leading-relaxed">
                <strong>Justification:</strong> {selectedRec.reason}
              </div>
            </div>

            {/* Evidence & Metrics Breakdown */}
            <div className="flex flex-col gap-2 text-left">
              <h4 className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Geospatial Evidence Metrics</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-brand-bg border border-brand-border p-2 rounded text-center">
                  <span className="text-[9px] text-brand-muted block font-medium">Ambient / Predicted AQI</span>
                  <span className="font-mono text-xs font-extrabold text-brand-text mt-1 block">
                    {selectedRec.evidence.currentAqi} &rarr; {selectedRec.evidence.predictedAqi}
                  </span>
                </div>
                <div className="bg-brand-bg border border-brand-border p-2 rounded text-center">
                  <span className="text-[9px] text-brand-muted block font-medium">Population Density</span>
                  <span className="font-mono text-xs font-extrabold text-brand-accent mt-1 block">
                    {selectedWard.populationDensity.toLocaleString()} pop/km²
                  </span>
                </div>
                <div className="bg-brand-bg border border-brand-border p-2 rounded text-center col-span-2 sm:col-span-1">
                  <span className="text-[9px] text-brand-muted block font-medium">Vulnerable Sites</span>
                  <span className="font-mono text-[10px] font-extrabold text-brand-danger mt-1 block">
                    🏥 {selectedWard.hospitalsCount} Hosp | 🏫 {selectedWard.schoolsCount} Sch
                  </span>
                </div>
                <div className="bg-brand-bg border border-brand-border p-2 rounded text-center">
                  <span className="text-[9px] text-brand-muted block font-medium">Traffic Congestion</span>
                  <span className="font-mono text-xs font-extrabold text-brand-warning mt-1 block">
                    {selectedRec.evidence.trafficDensity}% density
                  </span>
                </div>
                <div className="bg-brand-bg border border-brand-border p-2 rounded text-center">
                  <span className="text-[9px] text-brand-muted block font-medium">Construction Dust</span>
                  <span className="font-mono text-xs font-extrabold text-brand-accent/80 mt-1 block">
                    {selectedRec.evidence.constructionSites} Active Sites
                  </span>
                </div>
                <div className="bg-brand-bg border border-brand-border p-2 rounded text-center col-span-2 sm:col-span-1">
                  <span className="text-[9px] text-brand-muted block font-medium">Certainty Score</span>
                  <span className="font-mono text-xs font-extrabold text-brand-success mt-1 block">
                    {selectedRec.evidence.sourceConfidence}% Confidence
                  </span>
                </div>
              </div>
            </div>

            {/* Officer Assignment details */}
            {(selectedRec.assignedOfficer || selectedRec.inspectedAt) && (
              <div className="bg-brand-accent/10 border border-brand-accent/20 p-3.5 rounded text-xs flex flex-col gap-2 text-left">
                <span className="text-[9px] font-bold text-brand-accent uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-success" /> Officer Deployment Metrics
                </span>
                <div className="grid grid-cols-2 gap-3 text-brand-muted font-medium">
                  <div>
                    <span className="text-brand-muted block text-[10px]">Assigned Incident Officer</span>
                    <strong className="text-brand-text text-sm mt-0.5 block">{selectedRec.assignedOfficer || "Unassigned"}</strong>
                  </div>
                  <div>
                    <span className="text-brand-muted block text-[10px]">Inspected/Resolved At</span>
                    <strong className="text-brand-text mt-0.5 block">
                      {selectedRec.inspectedAt ? new Date(selectedRec.inspectedAt).toLocaleString() : "Awaiting Dispatch"}
                    </strong>
                  </div>
                </div>
                {selectedRec.inspectionNotes && (
                  <div className="mt-2 bg-brand-bg border border-brand-border p-2 rounded italic text-brand-text">
                    <strong>Inspection Log Notes:</strong> "{selectedRec.inspectionNotes}"
                  </div>
                )}
              </div>
            )}

            {/* Action panel under RBAC */}
            {isOfficer ? (
              <div className="border-t border-brand-border pt-4 mt-auto flex flex-col gap-3 text-left">
                <h4 className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Officer Action Controls</h4>
                <div className="flex flex-col gap-3">
                  {selectedRec.status === "pending" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 border border-brand-border px-3 py-1.5 rounded bg-brand-bg">
                        <UserPlus className="w-4 h-4 text-brand-muted flex-shrink-0" />
                        <input 
                          type="text" 
                          placeholder="Assign Officer Name" 
                          className="w-full text-xs bg-transparent border-none outline-none text-brand-text font-semibold placeholder-brand-muted"
                          value={officerNameInput}
                          onChange={(e) => setOfficerNameInput(e.target.value)}
                        />
                      </div>
                      <button
                        onClick={() => handleStatusChange("dispatched")}
                        disabled={isSubmitting}
                        className="bg-brand-accent hover:bg-brand-accent/90 text-white text-xs font-bold px-4 py-2 rounded shadow cursor-pointer transition flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" /> Dispatch Compliance Team
                      </button>
                    </div>
                  )}

                  {selectedRec.status === "dispatched" && (
                    <div className="flex flex-col gap-3">
                      <div className="border border-brand-border px-3 py-2 rounded bg-brand-bg">
                        <textarea 
                          placeholder="Input Compliance Inspection Notes (e.g. Fined developer site W-84 for lack of water mist sprays)..." 
                          rows={2}
                          className="w-full text-xs bg-transparent border-none outline-none text-brand-text font-medium placeholder-brand-muted resize-none"
                          value={inspectionNotes}
                          onChange={(e) => setInspectionNotes(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleStatusChange("dismissed")}
                          disabled={isSubmitting}
                          className="border border-brand-border hover:bg-brand-border/50 text-brand-text text-xs font-bold px-4 py-1.5 rounded cursor-pointer transition"
                        >
                          Dismiss Alert
                        </button>
                        <button
                          onClick={() => handleStatusChange("resolved")}
                          disabled={isSubmitting}
                          className="bg-brand-success hover:bg-brand-success/90 text-white text-xs font-bold px-4 py-1.5 rounded shadow cursor-pointer transition flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Resolve Compliance
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedRec.status === "resolved" && (
                    <div className="flex items-center gap-2 text-brand-success bg-brand-success/15 border border-brand-success/30 p-3 rounded text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Action fully resolved. compliance reports appended to systemic logs.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-t border-brand-border pt-4 mt-auto flex items-center gap-2 p-3 bg-brand-bg border border-brand-border rounded text-xs text-brand-muted font-medium text-left">
                <ShieldAlert className="w-4 h-4 text-brand-muted flex-shrink-0" />
                <span>You are currently viewing as **{userRole.replace("_", " ")}**. Standard actions dispatch is restricted to Municipal officers and Inspectors.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-brand-muted font-medium italic">
            Select a ranked recommendation to inspect evidence metrics.
          </div>
        )}
      </div>
    </div>
  );
}
