import React, { useState } from "react";
import { Search, Plus, Trash2, Edit, FileDown, Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import { Ward, CitizenComplaint } from "../types.js";

interface DataManagementProps {
  wards: Ward[];
  aqiRecords: any[];
  weatherRecords: any[];
  trafficRecords: any[];
  constructionRecords: any[];
  wasteBurningRecords: any[];
  industries: any[];
  onAddRecord: (type: string, record: any) => void;
  onUpdateRecord: (type: string, id: string, record: any) => void;
  onDeleteRecord: (type: string, id: string) => void;
  complaints?: CitizenComplaint[];
}

export default function DataManagement({
  wards,
  aqiRecords,
  weatherRecords,
  trafficRecords,
  constructionRecords,
  wasteBurningRecords,
  industries,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord,
  complaints = []
}: DataManagementProps) {
  const [activeDataset, setActiveDataset] = useState<"aqi" | "weather" | "traffic" | "construction" | "waste" | "industry" | "complaints">("aqi");
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWardFilter, setSelectedWardFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);

  // Form Fields state
  const [formWardId, setFormWardId] = useState(wards.length > 0 ? wards[0].id : "");
  const [formAqi, setFormAqi] = useState("100");
  const [formPm25, setFormPm25] = useState("35");
  const [formPm10, setFormPm10] = useState("75");
  const [formTemp, setFormTemp] = useState("26");
  const [formWind, setFormWind] = useState("12");
  const [formTrafficScore, setFormTrafficScore] = useState("50");
  const [formSites, setFormSites] = useState("1");
  const [formIncidents, setFormIncidents] = useState("0");
  const [formSeverity, setFormSeverity] = useState<"low" | "medium" | "high">("low");
  const [formIndustryName, setFormIndustryName] = useState("");
  const [formIndustryType, setFormIndustryType] = useState("");
  const [formEmission, setFormEmission] = useState<"low" | "medium" | "high">("low");

  // Citizen Complaint form fields
  const [formCitizenName, setFormCitizenName] = useState("");
  const [formCitizenPhone, setFormCitizenPhone] = useState("");
  const [formComplaintType, setFormComplaintType] = useState<"waste_burning" | "construction_dust" | "industrial_smoke" | "heavy_traffic" | "other">("waste_burning");
  const [formComplaintStatus, setFormComplaintStatus] = useState<"submitted" | "in_investigation" | "resolved">("submitted");
  const [formDescription, setFormDescription] = useState("");

  // Grievance Lookup states
  const [lookupRef, setLookupRef] = useState("");
  const [foundComplaint, setFoundComplaint] = useState<CitizenComplaint | null>(null);
  const [hasSearchedLookup, setHasSearchedLookup] = useState(false);

  const [notification, setNotification] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const getActiveArray = () => {
    switch (activeDataset) {
      case "weather": return weatherRecords;
      case "traffic": return trafficRecords;
      case "construction": return constructionRecords;
      case "waste": return wasteBurningRecords;
      case "industry": return industries;
      case "complaints": return complaints;
      default: return aqiRecords;
    }
  };

  const getWardName = (wardId: string) => {
    const w = wards.find(item => item.id === wardId);
    return w ? w.name : "Unknown Ward";
  };

  const handleLookup = () => {
    if (!lookupRef.trim()) {
      triggerNotification("Please enter a Reference Number", "error");
      return;
    }
    const cleanRef = lookupRef.trim().toLowerCase();
    const match = complaints.find(c => c.id.toLowerCase() === cleanRef || c.id.toLowerCase().includes(cleanRef));
    setFoundComplaint(match || null);
    setHasSearchedLookup(true);
  };

  const clearLookup = () => {
    setLookupRef("");
    setFoundComplaint(null);
    setHasSearchedLookup(false);
  };

  // Processing Search and Filtering
  const data = getActiveArray();
  const filteredData = data.filter(item => {
    const wardName = getWardName(item.wardId).toLowerCase();
    let matchesSearch = wardName.includes(searchTerm.toLowerCase()) || 
                          (item.id && item.id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeDataset === "complaints") {
      const citizenName = (item.citizenName || "").toLowerCase();
      const complaintType = (item.complaintType || "").toLowerCase();
      const description = (item.description || "").toLowerCase();
      const status = (item.status || "").toLowerCase();
      matchesSearch = matchesSearch || 
                      citizenName.includes(searchTerm.toLowerCase()) ||
                      complaintType.includes(searchTerm.toLowerCase()) ||
                      description.includes(searchTerm.toLowerCase()) ||
                      status.includes(searchTerm.toLowerCase());
    }

    const matchesWard = selectedWardFilter === "" || item.wardId === selectedWardFilter;
    return matchesSearch && matchesWard;
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const triggerNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Form Reset
  const resetForm = () => {
    setFormWardId(wards.length > 0 ? wards[0].id : "");
    setFormAqi("100");
    setFormPm25("35");
    setFormPm10("75");
    setFormTemp("26");
    setFormWind("12");
    setFormTrafficScore("50");
    setFormSites("1");
    setFormIncidents("0");
    setFormSeverity("low");
    setFormIndustryName("");
    setFormIndustryType("");
    setFormEmission("low");
    setFormCitizenName("");
    setFormCitizenPhone("");
    setFormComplaintType("waste_burning");
    setFormComplaintStatus("submitted");
    setFormDescription("");
    setEditingRecord(null);
  };

  // Submit Add or Edit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ward = wards.find(w => w.id === formWardId)!;

    const baseRecord: any = {
      wardId: formWardId,
      timestamp: new Date().toISOString()
    };

    if (activeDataset === "aqi") {
      baseRecord.latitude = ward.centroid[0];
      baseRecord.longitude = ward.centroid[1];
      baseRecord.aqi = Number(formAqi);
      baseRecord.pm25 = Number(formPm25);
      baseRecord.pm10 = Number(formPm10);
      baseRecord.no2 = Math.round(Number(formAqi) * 0.15);
      baseRecord.so2 = Math.round(Number(formAqi) * 0.05);
      baseRecord.co = Number((Number(formAqi) * 0.005).toFixed(2));
      baseRecord.o3 = 25;
    } else if (activeDataset === "weather") {
      baseRecord.temperature = Number(formTemp);
      baseRecord.humidity = 60;
      baseRecord.windSpeed = Number(formWind);
      baseRecord.windDirection = "N";
      baseRecord.windAngle = 0;
      baseRecord.rainfall = 0;
    } else if (activeDataset === "traffic") {
      baseRecord.densityScore = Number(formTrafficScore);
      baseRecord.congestionIndex = Number((1.0 + Number(formTrafficScore) / 25).toFixed(1));
      baseRecord.averageSpeed = Math.max(10, Math.floor(45 - (Number(formTrafficScore) / 2.5)));
    } else if (activeDataset === "construction") {
      baseRecord.activeSites = Number(formSites);
      baseRecord.complianceScore = 80;
      baseRecord.latitude = ward.centroid[0];
      baseRecord.longitude = ward.centroid[1];
      baseRecord.description = "Compliance checked site";
    } else if (activeDataset === "waste") {
      baseRecord.reportedIncidents = Number(formIncidents);
      baseRecord.estimatedSeverity = formSeverity;
      baseRecord.latitude = ward.centroid[0];
      baseRecord.longitude = ward.centroid[1];
    } else if (activeDataset === "industry") {
      baseRecord.name = formIndustryName;
      baseRecord.industryType = formIndustryType;
      baseRecord.emissionCategory = formEmission;
      baseRecord.latitude = ward.centroid[0];
      baseRecord.longitude = ward.centroid[1];
      baseRecord.status = "active";
    } else if (activeDataset === "complaints") {
      baseRecord.citizenName = formCitizenName;
      baseRecord.citizenPhone = formCitizenPhone;
      baseRecord.complaintType = formComplaintType;
      baseRecord.status = formComplaintStatus;
      baseRecord.description = formDescription;
      baseRecord.latitude = editingRecord ? editingRecord.latitude : ward.centroid[0];
      baseRecord.longitude = editingRecord ? editingRecord.longitude : ward.centroid[1];
      baseRecord.imageUrl = editingRecord ? editingRecord.imageUrl : null;
    }

    if (editingRecord) {
      onUpdateRecord(activeDataset, editingRecord.id, { ...editingRecord, ...baseRecord });
      triggerNotification("Record updated successfully!");
    } else {
      onAddRecord(activeDataset, baseRecord);
      triggerNotification("Record added successfully!");
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleEditClick = (record: any) => {
    setEditingRecord(record);
    setFormWardId(record.wardId);
    
    if (activeDataset === "aqi") {
      setFormAqi(String(record.aqi));
      setFormPm25(String(record.pm25));
      setFormPm10(String(record.pm10));
    } else if (activeDataset === "weather") {
      setFormTemp(String(record.temperature));
      setFormWind(String(record.windSpeed));
    } else if (activeDataset === "traffic") {
      setFormTrafficScore(String(record.densityScore));
    } else if (activeDataset === "construction") {
      setFormSites(String(record.activeSites));
    } else if (activeDataset === "waste") {
      setFormIncidents(String(record.reportedIncidents));
      setFormSeverity(record.estimatedSeverity);
    } else if (activeDataset === "industry") {
      setFormIndustryName(record.name);
      setFormIndustryType(record.industryType);
      setFormEmission(record.emissionCategory);
    } else if (activeDataset === "complaints") {
      setFormCitizenName(record.citizenName || "");
      setFormCitizenPhone(record.citizenPhone || "");
      setFormComplaintType(record.complaintType || "waste_burning");
      setFormComplaintStatus(record.status || "submitted");
      setFormDescription(record.description || "");
    }

    setShowAddModal(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      onDeleteRecord(activeDataset, id);
      triggerNotification("Record deleted.", "error");
    }
  };

  // Simulating CSV Import
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim() !== "");
      if (lines.length < 2) {
        triggerNotification("Invalid CSV file structure.", "error");
        return;
      }

      // Simulated CSV Processing
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",");
        if (parts.length >= 3) {
          // Just import into active dataset with some mock parsing
          const wardId = wards[0].id; // Fallback ward
          const baseRecord: any = {
            wardId,
            timestamp: new Date().toISOString()
          };

          if (activeDataset === "aqi") {
            baseRecord.aqi = Number(parts[2]) || 100;
            baseRecord.pm25 = Math.round(baseRecord.aqi * 0.35);
            baseRecord.pm10 = Math.round(baseRecord.aqi * 0.75);
            baseRecord.latitude = wards[0].centroid[0];
            baseRecord.longitude = wards[0].centroid[1];
          } else if (activeDataset === "weather") {
            baseRecord.temperature = Number(parts[2]) || 25;
            baseRecord.windSpeed = 10;
          }

          onAddRecord(activeDataset, baseRecord);
          count++;
        }
      }
      triggerNotification(`Successfully imported ${count} records from CSV.`);
    };
    reader.readAsText(file);
  };

  // Sync workbook link
  const downloadExcel = () => {
    window.open("/api/reports/excel", "_blank");
  };

  const downloadCSV = () => {
    window.open("/api/reports/csv", "_blank");
  };

  const exportComplaintsCSV = () => {
    if (!complaints || complaints.length === 0) {
      triggerNotification("No complaints available to export.", "error");
      return;
    }

    // Standard reporting format header row matching the standard reporting format
    const headers = [
      "Complaint ID",
      "Citizen Name",
      "Citizen Phone",
      "Ward ID",
      "Ward Name",
      "Latitude",
      "Longitude",
      "Category",
      "Status",
      "Description",
      "Created Time"
    ];

    // Map each complaint to CSV line
    const rows = complaints.map(c => {
      const wardName = getWardName(c.wardId);
      return [
        c.id,
        c.citizenName,
        c.citizenPhone,
        c.wardId,
        wardName,
        c.latitude,
        c.longitude,
        c.complaintType,
        c.status,
        c.description,
        c.timestamp
      ].map(val => {
        if (val === null || val === undefined) return "";
        let strVal = String(val);
        // Handle values containing commas, double-quotes, or newlines by escaping them
        if (strVal.includes(",") || strVal.includes('"') || strVal.includes("\n") || strVal.includes("\r")) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      });
    });

    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `AirTrace_AI_Citizen_Complaints_Export_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    triggerNotification("Successfully exported complaints to CSV!");
  };

  return (
    <div className="bg-brand-panel rounded border border-brand-border p-4 flex flex-col gap-4">
      {/* Notifications */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded border text-xs font-bold flex items-center gap-2 shadow-2xl ${
          notification.type === "success" 
            ? "bg-brand-panel border-brand-success text-brand-success" 
            : "bg-brand-panel border-brand-danger text-brand-danger"
        }`}>
          {notification.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="text-left">
          <h3 className="font-bold text-brand-text text-sm">Administrative Datasets</h3>
          <p className="text-[10px] text-brand-muted font-medium mt-0.5">Verified CRUD, synchronisation with state environmental reporting registers</p>
        </div>

        {/* Excel Sync and Exports */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
          <button
            onClick={downloadExcel}
            className="flex-1 sm:flex-none border border-brand-border hover:bg-brand-border/50 text-brand-text text-xs font-bold px-3 py-2 rounded flex items-center justify-center gap-2 cursor-pointer transition shadow"
          >
            <FileSpreadsheet className="w-4 h-4 text-brand-success" /> Excel Sync (xlsx)
          </button>
          <button
            onClick={downloadCSV}
            className="flex-1 sm:flex-none border border-brand-border hover:bg-brand-border/50 text-brand-text text-xs font-bold px-3 py-2 rounded flex items-center justify-center gap-2 cursor-pointer transition shadow"
          >
            <FileDown className="w-4 h-4 text-brand-accent" /> CSV Dump
          </button>
          <button
            onClick={exportComplaintsCSV}
            className="flex-1 sm:flex-none border border-brand-border hover:bg-brand-border/50 text-brand-text text-xs font-bold px-3 py-2 rounded flex items-center justify-center gap-2 cursor-pointer transition shadow bg-brand-warning/10 text-brand-warning hover:bg-brand-warning/20 border-brand-warning/30"
          >
            <FileDown className="w-4 h-4" /> Export to CSV
          </button>
        </div>
      </div>

      {/* Dataset Selection Tabs */}
      <div className="flex overflow-x-auto gap-1 border-b border-brand-border pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { id: "aqi", label: "AQI & Pollutants" },
          { id: "weather", label: "Meteorology" },
          { id: "traffic", label: "Traffic Scores" },
          { id: "construction", label: "Construction" },
          { id: "waste", label: "Waste Burning" },
          { id: "industry", label: "Industrial Zones" },
          { id: "complaints", label: "Citizen Complaints" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveDataset(tab.id as any);
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-[11px] font-bold rounded cursor-pointer transition whitespace-nowrap ${
              activeDataset === tab.id 
                ? "bg-brand-accent text-white" 
                : "text-brand-muted hover:text-brand-text hover:bg-brand-border/30"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grievance Reference Number Lookup */}
      <div className="border border-brand-border bg-brand-bg/50 rounded-lg p-4 text-left shadow-sm flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h4 className="font-bold text-xs text-brand-text flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></span>
              Grievance Reference Number Lookup
            </h4>
            <p className="text-[10px] text-brand-muted mt-0.5 font-medium">Verify official environmental complaints and view real-time remediation status.</p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="e.g. AQI-2026-123456"
              className="text-xs border border-brand-border px-3 py-1.5 rounded bg-brand-bg text-brand-text placeholder-brand-muted outline-none font-mono font-bold w-full sm:w-60 h-8"
              value={lookupRef}
              onChange={(e) => setLookupRef(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLookup();
                }
              }}
            />
            <button
              onClick={handleLookup}
              className="bg-brand-accent hover:bg-brand-accent/90 text-white text-[11px] font-bold px-3 py-1.5 rounded cursor-pointer transition whitespace-nowrap h-8"
            >
              Search Reference
            </button>
            {hasSearchedLookup && (
              <button
                onClick={clearLookup}
                className="border border-brand-border hover:bg-brand-border/40 text-brand-text text-[11px] font-bold px-2 py-1.5 rounded cursor-pointer transition h-8"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Lookup Results */}
        {hasSearchedLookup && (
          <div className="mt-1 p-3 bg-brand-border/10 border border-brand-border/30 rounded-md animate-fade-in">
            {foundComplaint ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded border border-brand-accent/20">
                      {foundComplaint.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      foundComplaint.status === "resolved" || foundComplaint.status === "Resolved"
                        ? "bg-brand-success/10 text-brand-success border-brand-success/20"
                        : foundComplaint.status === "in_investigation" || foundComplaint.status === "In_investigation" || foundComplaint.status === "Dispatched"
                        ? "bg-brand-warning/10 text-brand-warning border-brand-warning/20"
                        : "bg-brand-accent/10 text-brand-accent border-brand-accent/20"
                    }`}>
                      Status: {foundComplaint.status}
                    </span>
                    <span className="text-[10px] font-bold bg-brand-border/40 px-2 py-0.5 rounded text-brand-muted">
                      Type: {foundComplaint.complaintType?.replace("_", " ")}
                    </span>
                  </div>

                  <div className="text-xs text-brand-text mt-1">
                    <strong className="text-brand-muted font-bold mr-1">Citizen:</strong> {foundComplaint.citizenName} ({foundComplaint.citizenPhone})
                  </div>
                  <div className="text-xs text-brand-text">
                    <strong className="text-brand-muted font-bold mr-1">Location:</strong> Ward {getWardName(foundComplaint.wardId)} (Coords: {foundComplaint.latitude?.toFixed(4)}, {foundComplaint.longitude?.toFixed(4)})
                  </div>
                  <div className="text-xs text-brand-text bg-brand-bg p-2 rounded border border-brand-border/40 mt-1 max-h-24 overflow-y-auto">
                    <strong className="text-brand-muted font-bold mr-1 block mb-0.5 text-[10px]">Description:</strong>
                    <p className="text-xs leading-relaxed text-brand-text/90 font-medium">{foundComplaint.description || "No description provided."}</p>
                  </div>
                </div>

                <div className="md:col-span-4 flex flex-col justify-between items-stretch md:items-end gap-3 border-t md:border-t-0 md:border-l border-brand-border/40 pt-3 md:pt-0 md:pl-4">
                  <div className="text-left md:text-right">
                    <div className="text-[10px] text-brand-muted font-medium">Filed Date</div>
                    <div className="text-xs font-mono font-semibold text-brand-text mt-0.5">
                      {new Date(foundComplaint.timestamp).toLocaleString()}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setActiveDataset("complaints");
                      setSearchTerm(foundComplaint.id);
                      setCurrentPage(1);
                      triggerNotification(`Navigated to Complaints for reference ${foundComplaint.id}`);
                    }}
                    className="w-full bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent text-[11px] font-bold py-1.5 rounded cursor-pointer transition border border-brand-accent/30 text-center flex items-center justify-center gap-1.5"
                  >
                    View & Edit in Citizen Complaints Tab
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-brand-danger font-semibold flex items-center gap-1.5 py-1">
                <span>⚠️</span> No grievance matching Reference Number "{lookupRef}" was found in our system. Please check the spelling.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filtering and Adding Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-left">
        {/* Search */}
        <div className="sm:col-span-5 border border-brand-border px-3 py-1.5 rounded bg-brand-bg flex items-center gap-2">
          <Search className="w-4 h-4 text-brand-muted" />
          <input 
            type="text" 
            placeholder="Search by Ward name..." 
            className="text-xs bg-transparent border-none outline-none text-brand-text placeholder-brand-muted w-full font-semibold"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Ward Filter */}
        <div className="sm:col-span-3">
          <select
            value={selectedWardFilter}
            onChange={(e) => {
              setSelectedWardFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full border border-brand-border px-3 py-1.5 rounded text-xs font-bold outline-none bg-brand-bg text-brand-text h-9"
          >
            <option value="">All Wards</option>
            {wards.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        {/* CSV Import */}
        <div className="sm:col-span-2 relative">
          <label className="border border-brand-border hover:bg-brand-border/50 text-brand-text text-xs font-bold px-3 py-1.5 rounded flex items-center justify-center gap-2 cursor-pointer transition h-9 shadow">
            <Upload className="w-3.5 h-3.5 text-brand-accent" /> CSV Import
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleCSVImport}
            />
          </label>
        </div>

        {/* Add Record */}
        <div className="sm:col-span-2">
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center justify-center gap-2 cursor-pointer transition h-9 shadow"
          >
            <Plus className="w-4 h-4" /> Add Row
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-brand-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-brand-bg border-b border-brand-border text-brand-muted font-bold">
                <th className="p-3">ID</th>
                <th className="p-3">Ward Name</th>
                <th className="p-3">Timestamp</th>
                
                {activeDataset === "aqi" && (
                  <>
                    <th className="p-3">AQI</th>
                    <th className="p-3">PM2.5</th>
                    <th className="p-3">PM10</th>
                  </>
                )}
                {activeDataset === "weather" && (
                  <>
                    <th className="p-3">Temp (°C)</th>
                    <th className="p-3">Wind Speed</th>
                  </>
                )}
                {activeDataset === "traffic" && (
                  <>
                    <th className="p-3">Density Score</th>
                    <th className="p-3">Congestion Index</th>
                  </>
                )}
                {activeDataset === "construction" && (
                  <>
                    <th className="p-3">Active Sites</th>
                    <th className="p-3">Dust Compliance</th>
                  </>
                )}
                {activeDataset === "waste" && (
                  <>
                    <th className="p-3">Incidents</th>
                    <th className="p-3">Severity</th>
                  </>
                )}
                {activeDataset === "industry" && (
                  <>
                    <th className="p-3">Industry Name</th>
                    <th className="p-3">Emissions Category</th>
                  </>
                )}
                {activeDataset === "complaints" && (
                  <>
                    <th className="p-3">Citizen Name</th>
                    <th className="p-3">Complaint Type</th>
                    <th className="p-3">Status</th>
                  </>
                )}

                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40 font-medium text-brand-text">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-brand-muted italic">No records matching filters found.</td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-brand-bg/30">
                    <td className="p-3 font-mono text-brand-muted text-[10px]">{row.id || "N/A"}</td>
                    <td className="p-3 font-bold text-brand-text">{getWardName(row.wardId)}</td>
                    <td className="p-3 text-brand-muted">{new Date(row.timestamp || row.installationDate).toLocaleDateString()}</td>

                    {activeDataset === "aqi" && (
                      <>
                        <td className="p-3 font-bold text-brand-text">{row.aqi}</td>
                        <td className="p-3 font-mono text-brand-muted">{row.pm25}</td>
                        <td className="p-3 font-mono text-brand-muted">{row.pm10}</td>
                      </>
                    )}
                    {activeDataset === "weather" && (
                      <>
                        <td className="p-3 text-brand-text">{row.temperature}°C</td>
                        <td className="p-3 text-brand-muted">{row.windSpeed} km/h</td>
                      </>
                    )}
                    {activeDataset === "traffic" && (
                      <>
                        <td className="p-3 text-brand-text">{row.densityScore}%</td>
                        <td className="p-3 text-brand-muted">x{row.congestionIndex}</td>
                      </>
                    )}
                    {activeDataset === "construction" && (
                      <>
                        <td className="p-3 text-brand-text">{row.activeSites} sites</td>
                        <td className="p-3 text-brand-muted">{row.complianceScore}%</td>
                      </>
                    )}
                    {activeDataset === "waste" && (
                      <>
                        <td className="p-3 text-brand-text">{row.reportedIncidents} incidents</td>
                        <td className="p-3 uppercase text-[10px] font-bold text-brand-warning">{row.estimatedSeverity}</td>
                      </>
                    )}
                    {activeDataset === "industry" && (
                      <>
                        <td className="p-3 text-brand-text">{row.name}</td>
                        <td className="p-3 uppercase text-[10px] font-bold text-brand-danger">{row.emissionCategory}</td>
                      </>
                    )}
                    {activeDataset === "complaints" && (
                      <>
                        <td className="p-3 text-brand-text">
                          <div className="font-bold">{row.citizenName}</div>
                          <div className="text-[10px] text-brand-muted font-semibold">{row.citizenPhone}</div>
                        </td>
                        <td className="p-3">
                          <span className="bg-brand-border/40 px-2 py-0.5 rounded text-[10px] font-bold text-brand-text">
                            {(row.complaintType || "other").replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            row.status === "resolved" || row.status === "Resolved"
                              ? "bg-brand-success/10 text-brand-success border-brand-success/20"
                              : row.status === "in_investigation" || row.status === "In_investigation" || row.status === "Dispatched"
                              ? "bg-brand-warning/10 text-brand-warning border-brand-warning/20"
                              : "bg-brand-accent/10 text-brand-accent border-brand-accent/20"
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </>
                    )}

                    <td className="p-3 text-right flex gap-1 justify-end">
                      <button
                        onClick={() => handleEditClick(row)}
                        className="p-1 border border-brand-border hover:border-brand-accent rounded hover:text-brand-accent bg-brand-bg transition cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(row.id)}
                        className="p-1 border border-brand-border hover:border-brand-danger rounded hover:text-brand-danger bg-brand-bg transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center text-xs text-brand-muted font-medium">
        <span>Showing **{paginatedData.length}** of **{filteredData.length}** records</span>
        <div className="flex gap-1.5 items-center">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="border border-brand-border bg-brand-bg hover:bg-brand-border/30 px-2.5 py-1 rounded transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-brand-text"
          >
            Previous
          </button>
          <span className="text-brand-text">Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="border border-brand-border bg-brand-bg hover:bg-brand-border/30 px-2.5 py-1 rounded transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-brand-text"
          >
            Next
          </button>
        </div>
      </div>

      {/* Creation / Editing Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-brand-panel rounded p-5 border border-brand-border shadow-2xl max-w-md w-full flex flex-col gap-4 text-left">
            <div>
              <h3 className="font-extrabold text-brand-text text-sm">
                {editingRecord ? "Edit Record" : `Add New ${activeDataset.toUpperCase()} Entry`}
              </h3>
              <p className="text-[10px] text-brand-muted font-medium mt-0.5">Input validated environmental indicators</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs font-semibold">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-brand-muted uppercase">Target Ward Location</label>
                <select
                  value={formWardId}
                  onChange={(e) => setFormWardId(e.target.value)}
                  className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none"
                >
                  {wards.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {activeDataset === "aqi" && (
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-brand-muted uppercase">AQI</label>
                    <input 
                      type="number" 
                      required
                      className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none"
                      value={formAqi}
                      onChange={(e) => setFormAqi(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-brand-muted uppercase">PM2.5</label>
                    <input 
                      type="number" 
                      required
                      className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none"
                      value={formPm25}
                      onChange={(e) => setFormPm25(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-brand-muted uppercase">PM10</label>
                    <input 
                      type="number" 
                      required
                      className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none"
                      value={formPm10}
                      onChange={(e) => setFormPm10(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {activeDataset === "weather" && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-brand-muted uppercase">Temperature (°C)</label>
                    <input 
                      type="number" 
                      required
                      className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none"
                      value={formTemp}
                      onChange={(e) => setFormTemp(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-brand-muted uppercase">Wind Speed (km/h)</label>
                    <input 
                      type="number" 
                      required
                      className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none"
                      value={formWind}
                      onChange={(e) => setFormWind(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {activeDataset === "traffic" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-brand-muted uppercase">Traffic Density Score (0-100%)</label>
                  <input 
                    type="number" 
                    min={0} 
                    max={100} 
                    required
                    className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none"
                    value={formTrafficScore}
                    onChange={(e) => setFormTrafficScore(e.target.value)}
                  />
                </div>
              )}

              {activeDataset === "construction" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-brand-muted uppercase">Active Construction Sites</label>
                  <input 
                    type="number" 
                    required
                    className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none"
                    value={formSites}
                    onChange={(e) => setFormSites(e.target.value)}
                  />
                </div>
              )}

              {activeDataset === "waste" && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-brand-muted uppercase">Incidents Reported</label>
                    <input 
                      type="number" 
                      required
                      className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none"
                      value={formIncidents}
                      onChange={(e) => setFormIncidents(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-brand-muted uppercase">Severity</label>
                    <select
                      value={formSeverity}
                      onChange={(e: any) => setFormSeverity(e.target.value)}
                      className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              )}

              {activeDataset === "industry" && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-brand-muted uppercase">Industry Corporation Name</label>
                    <input 
                      type="text" 
                      required
                      className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none font-semibold"
                      value={formIndustryName}
                      onChange={(e) => setFormIndustryName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-brand-muted uppercase">Sector / Type</label>
                      <input 
                        type="text" 
                        required
                        className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none font-semibold"
                        value={formIndustryType}
                        onChange={(e) => setFormIndustryType(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-brand-muted uppercase">Emissions Category</label>
                      <select
                        value={formEmission}
                        onChange={(e: any) => setFormEmission(e.target.value)}
                        className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeDataset === "complaints" && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-brand-muted uppercase">Citizen Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Ramesh Kumar"
                      className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none font-semibold"
                      value={formCitizenName}
                      onChange={(e) => setFormCitizenName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-brand-muted uppercase">Citizen Phone</label>
                      <input 
                        type="tel" 
                        required
                        placeholder="e.g. +91 98765 43210"
                        className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none font-semibold"
                        value={formCitizenPhone}
                        onChange={(e) => setFormCitizenPhone(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-brand-muted uppercase">Complaint Type</label>
                      <select
                        value={formComplaintType}
                        onChange={(e: any) => setFormComplaintType(e.target.value)}
                        className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none font-bold"
                      >
                        <option value="waste_burning">Waste Burning</option>
                        <option value="construction_dust">Construction Dust</option>
                        <option value="industrial_smoke">Industrial Smoke</option>
                        <option value="heavy_traffic">Heavy Traffic</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-brand-muted uppercase">Status</label>
                    <select
                      value={formComplaintStatus}
                      onChange={(e: any) => setFormComplaintStatus(e.target.value)}
                      className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none font-bold"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="in_investigation">In Investigation</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-brand-muted uppercase">Incident Description</label>
                    <textarea 
                      required
                      placeholder="Provide precise description of the issue..."
                      className="border border-brand-border px-3 py-2 rounded bg-brand-bg text-brand-text outline-none font-semibold min-h-[60px] resize-none"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="border border-brand-border hover:bg-brand-border/40 text-brand-text font-bold px-4 py-2 rounded cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-accent hover:bg-brand-accent/90 text-white font-bold px-5 py-2 rounded shadow cursor-pointer transition"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
