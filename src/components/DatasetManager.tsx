import { useState, useRef } from "react";
import { Upload, AlertCircle, CheckCircle2, FileText, Trash2, Clock, BarChart3, Download } from "lucide-react";
import { motion } from "motion/react";

interface UploadLog {
  id: string;
  fileName: string;
  uploadTime: string;
  recordsCount: number;
  validRecords: number;
  invalidRecords: number;
  status: "pending" | "completed" | "failed";
  duplicates: number;
  missingValues: number;
}

interface DatasetManagerProps {
  onUpload?: (file: File) => Promise<void>;
}

export default function DatasetManager({ onUpload }: DatasetManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([
    {
      id: "log-1",
      fileName: "AQI_Data_June_2024.xlsx",
      uploadTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      recordsCount: 15420,
      validRecords: 15350,
      invalidRecords: 70,
      status: "completed",
      duplicates: 45,
      missingValues: 25
    },
    {
      id: "log-2",
      fileName: "Pollution_Hotspots_May.csv",
      uploadTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      recordsCount: 8923,
      validRecords: 8850,
      invalidRecords: 73,
      status: "completed",
      duplicates: 28,
      missingValues: 45
    }
  ]);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [validationReport, setValidationReport] = useState<any>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateFile = (file: File) => {
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      return { valid: false, error: "Only .xlsx, .xls, and .csv files are supported" };
    }
    
    if (file.size > 100 * 1024 * 1024) {
      return { valid: false, error: "File size must be less than 100MB" };
    }

    return { valid: true };
  };

  const processFile = async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate file processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create mock validation report
      const mockReport = {
        totalRecords: Math.floor(Math.random() * 20000) + 5000,
        validRecords: Math.floor(Math.random() * 18000) + 4500,
        duplicates: Math.floor(Math.random() * 100) + 10,
        missingValues: Math.floor(Math.random() * 200) + 5,
        invalidAQI: Math.floor(Math.random() * 50),
        invalidCoordinates: Math.floor(Math.random() * 40),
        validationScore: (Math.random() * 20 + 80).toFixed(1)
      };

      setValidationReport(mockReport);

      // Create new log entry
      const newLog: UploadLog = {
        id: `log-${Date.now()}`,
        fileName: file.name,
        uploadTime: new Date().toISOString(),
        recordsCount: mockReport.totalRecords,
        validRecords: mockReport.validRecords,
        invalidRecords: mockReport.totalRecords - mockReport.validRecords,
        status: "completed",
        duplicates: mockReport.duplicates,
        missingValues: mockReport.missingValues
      };

      setUploadLogs(prev => [newLog, ...prev]);

      // Call parent callback if provided
      if (onUpload) {
        await onUpload(file);
      }
    } catch (error) {
      console.error("File processing error:", error);
      alert("Error processing file. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDeleteLog = (logId: string) => {
    setUploadLogs(prev => prev.filter(log => log.id !== logId));
  };

  const totalRecordsProcessed = uploadLogs.reduce((sum, log) => sum + log.recordsCount, 0);
  const totalValidRecords = uploadLogs.reduce((sum, log) => sum + log.validRecords, 0);
  const totalDuplicates = uploadLogs.reduce((sum, log) => sum + log.duplicates, 0);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Total Uploads</span>
          <span className="text-2xl font-bold text-brand-text">{uploadLogs.length}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.05 }}
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Records Processed</span>
          <span className="text-2xl font-bold text-brand-text">{(totalRecordsProcessed / 1000).toFixed(1)}K</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Valid Records</span>
          <span className="text-2xl font-bold text-brand-success">{(totalValidRecords / 1000).toFixed(1)}K</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.15 }}
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Duplicates Found</span>
          <span className="text-2xl font-bold text-brand-warning">{totalDuplicates}</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="bg-brand-panel border border-brand-border rounded p-3 flex flex-col gap-1"
        >
          <span className="text-[10px] text-brand-muted uppercase font-bold tracking-widest">Validation Score</span>
          <span className="text-2xl font-bold text-brand-accent">
            {validationReport ? `${validationReport.validationScore}%` : "98.2%"}
          </span>
        </motion.div>
      </div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
          isDragging 
            ? "border-brand-accent bg-brand-accent/10" 
            : "border-brand-border bg-brand-bg hover:border-brand-accent/50"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        <motion.div
          animate={{ scale: isDragging ? 1.1 : 1 }}
          className="flex flex-col items-center gap-3"
        >
          <Upload className={`w-8 h-8 ${isDragging ? "text-brand-accent" : "text-brand-muted"}`} />
          <div>
            <p className="text-sm font-bold text-brand-text">
              {isProcessing ? "Processing file..." : "Drag & drop your file here"}
            </p>
            <p className="text-xs text-brand-muted">or click to browse (.xlsx, .xls, .csv)</p>
          </div>
          {isProcessing && (
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ delay: i * 0.2, duration: 1.2, repeat: Infinity }}
                  className="w-2 h-2 bg-brand-accent rounded-full"
                />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Validation Report */}
      {validationReport && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-panel border border-brand-border rounded p-4 space-y-3"
        >
          <h3 className="font-bold text-brand-text flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-accent" /> Validation Report
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-brand-bg border border-brand-border/40 rounded p-3">
              <span className="text-[10px] text-brand-muted uppercase font-bold">Total Records</span>
              <span className="text-lg font-bold text-brand-text block mt-1">{validationReport.totalRecords}</span>
            </div>
            <div className="bg-brand-bg border border-brand-border/40 rounded p-3">
              <span className="text-[10px] text-brand-muted uppercase font-bold">Valid Records</span>
              <span className="text-lg font-bold text-brand-success block mt-1">{validationReport.validRecords}</span>
            </div>
            <div className="bg-brand-bg border border-brand-border/40 rounded p-3">
              <span className="text-[10px] text-brand-muted uppercase font-bold">Duplicates</span>
              <span className="text-lg font-bold text-brand-warning block mt-1">{validationReport.duplicates}</span>
            </div>
            <div className="bg-brand-bg border border-brand-border/40 rounded p-3">
              <span className="text-[10px] text-brand-muted uppercase font-bold">Missing Values</span>
              <span className="text-lg font-bold text-brand-danger block mt-1">{validationReport.missingValues}</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white px-4 py-2 rounded text-xs font-bold transition cursor-pointer">
              <CheckCircle2 className="w-4 h-4" /> Import Data
            </button>
            <button className="flex items-center gap-2 bg-brand-border hover:bg-brand-border/80 text-brand-text px-4 py-2 rounded text-xs font-bold transition cursor-pointer">
              <Download className="w-4 h-4" /> Export Report
            </button>
          </div>
        </motion.div>
      )}

      {/* Upload History */}
      <div className="bg-brand-panel border border-brand-border rounded overflow-hidden">
        <div className="p-4 border-b border-brand-border/40">
          <h3 className="font-bold text-brand-text flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-accent" /> Upload History
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-brand-bg border-b border-brand-border/40">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-brand-text">File Name</th>
                <th className="px-4 py-3 text-center font-bold text-brand-text">Records</th>
                <th className="px-4 py-3 text-center font-bold text-brand-text">Valid</th>
                <th className="px-4 py-3 text-center font-bold text-brand-text">Invalid</th>
                <th className="px-4 py-3 text-center font-bold text-brand-text">Duplicates</th>
                <th className="px-4 py-3 text-center font-bold text-brand-text">Status</th>
                <th className="px-4 py-3 text-center font-bold text-brand-text">Upload Time</th>
                <th className="px-4 py-3 text-center font-bold text-brand-text">Action</th>
              </tr>
            </thead>
            <tbody>
              {uploadLogs.map((log, idx) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-brand-border/40 hover:bg-brand-bg/50 transition"
                >
                  <td className="px-4 py-3 text-brand-text font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-accent" /> {log.fileName}
                  </td>
                  <td className="px-4 py-3 text-center text-brand-text font-bold">{log.recordsCount}</td>
                  <td className="px-4 py-3 text-center text-brand-success font-bold">{log.validRecords}</td>
                  <td className="px-4 py-3 text-center text-brand-danger font-bold">{log.invalidRecords}</td>
                  <td className="px-4 py-3 text-center text-brand-warning font-bold">{log.duplicates}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase border ${
                      log.status === "completed" 
                        ? "bg-brand-success/15 text-brand-success border-brand-success/30"
                        : "bg-brand-warning/15 text-brand-warning border-brand-warning/30"
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-brand-muted">
                    {new Date(log.uploadTime).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="text-brand-danger hover:text-brand-danger/80 transition"
                      title="Delete upload"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
