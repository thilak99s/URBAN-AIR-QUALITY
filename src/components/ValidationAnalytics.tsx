import { useState } from "react";
import { AlertCircle, TrendingUp, BarChart3, LineChart as LineChartIcon, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

interface ValidationMetrics {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicates: number;
  missingValues: number;
  errorRate: number;
  validationScore: number;
}

interface ValidationCheck {
  name: string;
  count: number;
  severity: "critical" | "high" | "medium" | "low";
}

export default function ValidationAnalytics() {
  const [dateRange, setDateRange] = useState("7days");
  const [selectedCheck, setSelectedCheck] = useState<string | null>(null);

  // Mock data
  const metrics: ValidationMetrics = {
    totalRecords: 127453,
    validRecords: 126120,
    invalidRecords: 1333,
    duplicates: 234,
    missingValues: 1099,
    errorRate: 1.05,
    validationScore: 98.95
  };

  const validationChecks: ValidationCheck[] = [
    { name: "Missing AQI", count: 156, severity: "critical" },
    { name: "Invalid AQI", count: 234, severity: "high" },
    { name: "Missing Coordinates", count: 89, severity: "critical" },
    { name: "Invalid Coordinates", count: 142, severity: "high" },
    { name: "Invalid Date", count: 67, severity: "medium" },
    { name: "Duplicate Timestamp", count: 234, severity: "medium" },
    { name: "Duplicate Locations", count: 156, severity: "low" },
    { name: "Missing Pollutant Values", count: 412, severity: "high" }
  ];

  // Trend data for last 7 days
  const validationTrend = [
    { date: "Mon", valid: 18200, invalid: 145, duplicates: 28 },
    { date: "Tue", valid: 18450, invalid: 168, duplicates: 32 },
    { date: "Wed", valid: 17890, invalid: 178, duplicates: 31 },
    { date: "Thu", valid: 19120, invalid: 156, duplicates: 35 },
    { date: "Fri", valid: 18600, invalid: 189, duplicates: 38 },
    { date: "Sat", valid: 17950, invalid: 142, duplicates: 29 },
    { date: "Sun", valid: 17110, invalid: 155, duplicates: 31 }
  ];

  // Data quality distribution
  const qualityData = [
    { name: "Valid Records", value: metrics.validRecords, fill: "#10b981" },
    { name: "Invalid Records", value: metrics.invalidRecords, fill: "#ef4444" },
    { name: "Duplicates", value: metrics.duplicates, fill: "#f59e0b" }
  ];

  // Error distribution
  const errorData = [
    { name: "Missing Values", value: 412 },
    { name: "Invalid Data", value: 376 },
    { name: "Duplicates", value: 234 },
    { name: "Coordinate Issues", value: 231 },
    { name: "Date Issues", value: 67 }
  ];

  // Upload history
  const uploadHistory = [
    { date: "Jul 19", uploads: 3, records: 18200, validation: 99.2 },
    { date: "Jul 18", uploads: 2, records: 18450, validation: 98.8 },
    { date: "Jul 17", uploads: 4, records: 17890, validation: 98.5 },
    { date: "Jul 16", uploads: 3, records: 19120, validation: 99.1 },
    { date: "Jul 15", uploads: 2, records: 18600, validation: 98.9 },
    { date: "Jul 14", uploads: 5, records: 17950, validation: 98.3 },
    { date: "Jul 13", uploads: 2, records: 17110, validation: 99.0 }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-brand-danger/15 text-brand-danger border-brand-danger/30";
      case "high": return "bg-brand-danger/10 text-brand-danger border-brand-danger/20";
      case "medium": return "bg-brand-warning/15 text-brand-warning border-brand-warning/30";
      default: return "bg-brand-success/15 text-brand-success border-brand-success/30";
    }
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === "critical") return "🔴";
    if (severity === "high") return "🟠";
    if (severity === "medium") return "🟡";
    return "🟢";
  };

  return (
    <div className="space-y-5">
      {/* Dataset Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Total Records</span>
          <span className="text-xl font-bold text-brand-text">{(metrics.totalRecords / 1000).toFixed(0)}K</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Valid Records</span>
          <span className="text-xl font-bold text-brand-success">{(metrics.validRecords / 1000).toFixed(0)}K</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Invalid Records</span>
          <span className="text-xl font-bold text-brand-danger">{metrics.invalidRecords}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Duplicates</span>
          <span className="text-xl font-bold text-brand-warning">{metrics.duplicates}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Missing Values</span>
          <span className="text-xl font-bold text-brand-accent">{metrics.missingValues}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Error Rate</span>
          <span className="text-xl font-bold text-brand-danger">{metrics.errorRate.toFixed(2)}%</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Validation Score</span>
          <span className="text-xl font-bold text-brand-success">{metrics.validationScore.toFixed(2)}%</span>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Validation Trend */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-panel border border-brand-border rounded p-4"
        >
          <h3 className="font-bold text-brand-text flex items-center gap-2 mb-4">
            <LineChartIcon className="w-5 h-5 text-brand-accent" /> Validation Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={validationTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="#999" style={{ fontSize: "12px" }} />
              <YAxis stroke="#999" style={{ fontSize: "12px" }} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                labelStyle={{ color: "#fff" }}
              />
              <Legend />
              <Line type="monotone" dataKey="valid" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="invalid" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="duplicates" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Quality Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-brand-panel border border-brand-border rounded p-4"
        >
          <h3 className="font-bold text-brand-text flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-brand-accent" /> Data Quality Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={qualityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {qualityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Upload Activity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-brand-panel border border-brand-border rounded p-4"
        >
          <h3 className="font-bold text-brand-text flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-brand-accent" /> Daily Upload Activity
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={uploadHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="#999" style={{ fontSize: "12px" }} />
              <YAxis stroke="#999" style={{ fontSize: "12px" }} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                labelStyle={{ color: "#fff" }}
              />
              <Legend />
              <Bar dataKey="uploads" fill="#3b82f6" />
              <Bar dataKey="records" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Error Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-brand-panel border border-brand-border rounded p-4"
        >
          <h3 className="font-bold text-brand-text flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-brand-danger" /> Error Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={errorData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" stroke="#999" style={{ fontSize: "12px" }} />
              <YAxis dataKey="name" type="category" width={150} stroke="#999" style={{ fontSize: "12px" }} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                labelStyle={{ color: "#fff" }}
              />
              <Bar dataKey="value" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Validation Checks Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-brand-panel border border-brand-border rounded overflow-hidden"
      >
        <div className="p-4 border-b border-brand-border/40">
          <h3 className="font-bold text-brand-text flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-brand-warning" /> Validation Checks
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-brand-bg border-b border-brand-border/40">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-brand-text">Check Name</th>
                <th className="px-4 py-3 text-center font-bold text-brand-text">Count</th>
                <th className="px-4 py-3 text-center font-bold text-brand-text">Severity</th>
                <th className="px-4 py-3 text-left font-bold text-brand-text">Status</th>
              </tr>
            </thead>
            <tbody>
              {validationChecks.map((check, idx) => (
                <motion.tr
                  key={check.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-brand-border/40 hover:bg-brand-bg/50 transition cursor-pointer"
                  onClick={() => setSelectedCheck(selectedCheck === check.name ? null : check.name)}
                >
                  <td className="px-4 py-3 text-brand-text font-medium">{check.name}</td>
                  <td className="px-4 py-3 text-center text-brand-text font-bold">{check.count}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase border ${getSeverityColor(check.severity)}`}>
                      {getSeverityIcon(check.severity)} {check.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-left">
                    {check.count > 100 ? (
                      <span className="text-brand-danger flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Requires Attention
                      </span>
                    ) : (
                      <span className="text-brand-success flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Under Control
                      </span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Quality Score Gauge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-brand-panel border border-brand-border rounded p-4"
      >
        <h3 className="font-bold text-brand-text flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-brand-success" /> Overall Data Quality Score
        </h3>
        
        <div className="flex items-center justify-center gap-8">
          <div className="flex-1">
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" fill="none" stroke="#374151" strokeWidth="8" />
                <circle 
                  cx="64" 
                  cy="64" 
                  r="56" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="8"
                  strokeDasharray={`${(metrics.validationScore / 100) * 351.9} 351.9`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-3xl font-bold text-brand-success">{metrics.validationScore.toFixed(1)}%</span>
                <span className="text-xs text-brand-muted">Excellent</span>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-brand-muted">Completeness</span>
                <span className="text-xs font-bold text-brand-text">98%</span>
              </div>
              <div className="w-full bg-brand-bg rounded h-2">
                <div className="bg-brand-success h-full rounded" style={{ width: "98%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-brand-muted">Accuracy</span>
                <span className="text-xs font-bold text-brand-text">99%</span>
              </div>
              <div className="w-full bg-brand-bg rounded h-2">
                <div className="bg-brand-success h-full rounded" style={{ width: "99%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-brand-muted">Consistency</span>
                <span className="text-xs font-bold text-brand-text">97%</span>
              </div>
              <div className="w-full bg-brand-bg rounded h-2">
                <div className="bg-brand-success h-full rounded" style={{ width: "97%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-brand-muted">Timeliness</span>
                <span className="text-xs font-bold text-brand-text">99.5%</span>
              </div>
              <div className="w-full bg-brand-bg rounded h-2">
                <div className="bg-brand-success h-full rounded" style={{ width: "99.5%" }} />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
