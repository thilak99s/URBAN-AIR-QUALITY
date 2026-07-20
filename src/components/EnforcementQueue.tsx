import { useState, useEffect } from "react";
import {
  AlertCircle, CheckCircle2, ShieldAlert, Download, Filter, Search, ChevronDown,
  Clock, MapPin, Wind, Zap, BarChart3, TrendingUp, AlertTriangle, CheckSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { EnforcementRecommendation, Ward } from "../types.js";

interface EnforcementQueueProps {
  recommendations: EnforcementRecommendation[];
  wards: Ward[];
  onUpdateStatus: (recId: string, status: "pending" | "dispatched" | "resolved" | "dismissed", notes?: string) => Promise<void>;
}

interface CaseStats {
  total: number;
  pending: number;
  underReview: number;
  closed: number;
  highPriority: number;
  criticalCases: number;
}

export default function EnforcementQueue({
  recommendations,
  wards,
  onUpdateStatus
}: EnforcementQueueProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "dispatched" | "resolved" | "dismissed">("all");
  const [filterPriority, setFilterPriority] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [sortBy, setSortBy] = useState<"date" | "priority" | "aqi" | "status">("priority");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const itemsPerPage = 10;

  // Calculate stats
  const stats: CaseStats = {
    total: recommendations.length,
    pending: recommendations.filter(r => r.status === "pending").length,
    underReview: recommendations.filter(r => r.status === "dispatched").length,
    closed: recommendations.filter(r => r.status === "resolved" || r.status === "dismissed").length,
    highPriority: recommendations.filter(r => r.priority === "high" || r.priority === "critical").length,
    criticalCases: recommendations.filter(r => r.priority === "critical").length
  };

  // Filter and sort
  const filtered = recommendations.filter(rec => {
    const matchesSearch = 
      rec.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wards.find(w => w.id === rec.wardId)?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || rec.status === filterStatus;
    const matchesPriority = filterPriority === "all" || rec.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "priority":
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      case "aqi":
        return (b.aqiValue || 0) - (a.aqiValue || 0);
      case "date":
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      default:
        return 0;
    }
  });

  const paginatedData = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(sorted.length / itemsPerPage);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-brand-danger/20 text-brand-danger border-brand-danger/40 animate-pulse";
      case "high": return "bg-brand-danger/15 text-brand-danger border-brand-danger/30";
      case "medium": return "bg-brand-warning/15 text-brand-warning border-brand-warning/30";
      default: return "bg-brand-success/15 text-brand-success border-brand-success/30";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved": return "bg-brand-success/15 text-brand-success border-brand-success/30";
      case "dispatched": return "bg-brand-accent/15 text-brand-accent border-brand-accent/30";
      case "dismissed": return "bg-brand-border text-brand-muted border-brand-border/60";
      default: return "bg-brand-warning/15 text-brand-warning border-brand-warning/30";
    }
  };

  const getAQIColor = (aqi: number) => {
    if (aqi > 400) return "text-brand-danger";
    if (aqi > 300) return "text-brand-danger";
    if (aqi > 200) return "text-brand-danger";
    if (aqi > 100) return "text-brand-warning";
    return "text-brand-success";
  };

  const handleStatusChange = async (recId: string, newStatus: string) => {
    try {
      await onUpdateStatus(recId, newStatus as any, "Status updated");
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Case ID", "City", "Date", "AQI", "Priority", "Status", "Assigned Officer"];
    const rows = sorted.map(rec => {
      const ward = wards.find(w => w.id === rec.wardId);
      return [
        rec.id,
        ward?.name || "Unknown",
        new Date(rec.timestamp).toLocaleString(),
        rec.aqiValue,
        rec.priority,
        rec.status,
        rec.assignedOfficer || "Unassigned"
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enforcement-queue-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Total Cases</span>
          <span className="text-xl font-bold text-brand-text">{stats.total}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.05 }}
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Pending</span>
          <span className="text-xl font-bold text-brand-warning">{stats.pending}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Under Review</span>
          <span className="text-xl font-bold text-brand-accent">{stats.underReview}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.15 }}
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Resolved</span>
          <span className="text-xl font-bold text-brand-success">{stats.closed}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">High Priority</span>
          <span className="text-xl font-bold text-brand-danger">{stats.highPriority}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.25 }}
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Critical</span>
          <span className="text-xl font-bold text-brand-danger animate-pulse">{stats.criticalCases}</span>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <div className="bg-brand-panel border border-brand-border rounded p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex-1 flex items-center gap-2 bg-brand-bg border border-brand-border rounded px-3 py-2">
            <Search className="w-4 h-4 text-brand-muted" />
            <input
              type="text"
              placeholder="Search by Case ID or City..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 bg-transparent text-xs text-brand-text placeholder-brand-muted focus:outline-none"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white px-3 py-2 rounded text-xs font-bold transition cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as any);
              setCurrentPage(1);
            }}
            className="bg-brand-bg border border-brand-border text-brand-text text-xs px-3 py-2 rounded cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="dispatched">Under Review</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => {
              setFilterPriority(e.target.value as any);
              setCurrentPage(1);
            }}
            className="bg-brand-bg border border-brand-border text-brand-text text-xs px-3 py-2 rounded cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-brand-bg border border-brand-border text-brand-text text-xs px-3 py-2 rounded cursor-pointer"
          >
            <option value="priority">Sort by Priority</option>
            <option value="date">Sort by Date</option>
            <option value="aqi">Sort by AQI</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-brand-panel border border-brand-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-brand-bg border-b border-brand-border">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-brand-text">Case ID</th>
                <th className="px-4 py-3 text-left font-bold text-brand-text">City</th>
                <th className="px-4 py-3 text-left font-bold text-brand-text">Date</th>
                <th className="px-4 py-3 text-center font-bold text-brand-text">AQI</th>
                <th className="px-4 py-3 text-center font-bold text-brand-text">Priority</th>
                <th className="px-4 py-3 text-center font-bold text-brand-text">Status</th>
                <th className="px-4 py-3 text-center font-bold text-brand-text">Officer</th>
                <th className="px-4 py-3 text-center font-bold text-brand-text">Action</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-brand-muted">
                      No cases found
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((rec, idx) => {
                    const ward = wards.find(w => w.id === rec.wardId);
                    return (
                      <motion.tr
                        key={rec.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-brand-border/40 hover:bg-brand-bg/50 transition"
                      >
                        <td className="px-4 py-3 font-mono text-brand-accent">{rec.id}</td>
                        <td className="px-4 py-3 text-brand-text font-medium">{ward?.name || "Unknown"}</td>
                        <td className="px-4 py-3 text-brand-muted">{new Date(rec.timestamp).toLocaleString().split(",")[0]}</td>
                        <td className={`px-4 py-3 text-center font-bold ${getAQIColor(rec.aqiValue || 0)}`}>
                          {rec.aqiValue}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase border ${getPriorityColor(rec.priority)}`}>
                            {rec.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase border ${getStatusColor(rec.status)}`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-brand-muted">{rec.assignedOfficer || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setExpandedRow(expandedRow === rec.id ? null : rec.id)}
                            className="text-brand-accent hover:text-brand-accent/80 transition"
                          >
                            <ChevronDown className={`w-4 h-4 transition ${expandedRow === rec.id ? "rotate-180" : ""}`} />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-brand-border/40 flex items-center justify-between bg-brand-bg">
            <span className="text-xs text-brand-muted">
              Page {currentPage} of {totalPages} • Showing {paginatedData.length} of {sorted.length} cases
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-brand-border text-xs font-bold text-brand-text hover:bg-brand-border/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border border-brand-border text-xs font-bold text-brand-text hover:bg-brand-border/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Row Expansion - Details */}
      <AnimatePresence>
        {expandedRow && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-brand-panel border border-brand-border rounded p-4"
          >
            {paginatedData.map(rec => 
              rec.id === expandedRow ? (
                <div key={rec.id} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] text-brand-muted uppercase font-bold">Latitude / Longitude</span>
                      <span className="text-xs text-brand-text font-medium block mt-1">{rec.latitude?.toFixed(4)}, {rec.longitude?.toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-brand-muted uppercase font-bold">PM2.5 / PM10</span>
                      <span className="text-xs text-brand-text font-medium block mt-1">{rec.pm25} / {rec.pm10} µg/m³</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-brand-muted uppercase font-bold">NO₂ / SO₂</span>
                      <span className="text-xs text-brand-text font-medium block mt-1">{rec.no2 || "-"} / {rec.so2 || "-"} ppb</span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {rec.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleStatusChange(rec.id, "dispatched")}
                          className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white px-3 py-2 rounded text-xs font-bold transition cursor-pointer"
                        >
                          <Zap className="w-4 h-4" /> Dispatch
                        </button>
                        <button
                          onClick={() => handleStatusChange(rec.id, "dismissed")}
                          className="flex items-center gap-2 bg-brand-border hover:bg-brand-border/80 text-brand-text px-3 py-2 rounded text-xs font-bold transition cursor-pointer"
                        >
                          <CheckSquare className="w-4 h-4" /> Dismiss
                        </button>
                      </>
                    )}
                    {rec.status === "dispatched" && (
                      <button
                        onClick={() => handleStatusChange(rec.id, "resolved")}
                        className="flex items-center gap-2 bg-brand-success hover:bg-brand-success/90 text-white px-3 py-2 rounded text-xs font-bold transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ) : null
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
