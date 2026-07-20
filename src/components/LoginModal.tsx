import React, { useState } from "react";
import { Shield, User, Key, Lock } from "lucide-react";
import { UserRole } from "../types.js";

interface LoginModalProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginModal({ onLoginSuccess }: LoginModalProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("••••••••");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const seededRoles = [
    { label: "Administrator", username: "admin", role: UserRole.ADMINISTRATOR, name: "Dr. Sandeep Kumar", color: "border-indigo-600 bg-indigo-50/20 text-indigo-700" },
    { label: "Smart City Officer", username: "officer_smartcity", role: UserRole.MUNICIPAL_OFFICER, name: "Ramesh Gowda", color: "border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400" },
    { label: "Pollution Officer", username: "officer_pollution", role: UserRole.POLLUTION_CONTROL_OFFICER, name: "Priya Sharma", color: "border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400" },
    { label: "Research Analyst", username: "analyst_science", role: UserRole.ANALYST, name: "Dr. Anjali Rao", color: "border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400" },
    { label: "Citizen", username: "citizen_demo", role: UserRole.CITIZEN, name: "Srinivasan S", color: "border-slate-300 bg-slate-50 text-slate-700 hover:border-slate-400" }
  ];

  const handleQuickSelect = (uname: string) => {
    setUsername(uname);
    setErrorMsg("");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (data.success) {
        onLoginSuccess(data.user);
      } else {
        setErrorMsg(data.message || "Invalid credentials.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to communicate with authentication server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-2xl max-w-lg w-full flex flex-col gap-5 text-gray-800">
        
        {/* Branding Title */}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-md">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-extrabold text-gray-900 text-xl tracking-tight">Access AirTrace AI Platform</h2>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">National Level Environmental Intelligence Command Portal</p>
          </div>
        </div>

        {/* Demo Fast Account Chooser */}
        <div className="flex flex-col gap-2 bg-slate-50 border border-slate-100/50 p-4 rounded-2xl">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
            Judge Testing Quick-Select Role (Zero friction simulation)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {seededRoles.map(role => {
              const isSelected = username === role.username;
              return (
                <button
                  type="button"
                  key={role.username}
                  onClick={() => handleQuickSelect(role.username)}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                    isSelected 
                      ? "border-indigo-600 bg-indigo-50/20 text-indigo-800 shadow-inner" 
                      : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-slate-50 text-gray-700"
                  }`}
                >
                  <span className="text-[10px] font-extrabold leading-none">{role.label}</span>
                  <span className="text-[9px] text-gray-400 font-medium truncate mt-1">{role.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Login Inputs */}
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-3.5 text-xs font-semibold">
          {errorMsg && (
            <div className="bg-red-50 border border-red-100 text-red-700 px-3 py-2 rounded-xl text-[11px] font-bold">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-400 uppercase">Username Address</label>
            <div className="flex items-center gap-2 border border-gray-100 px-3 py-2 rounded-xl bg-gray-50/50">
              <User className="w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                required
                className="w-full bg-transparent outline-none border-none text-gray-800 font-bold placeholder-gray-400 text-xs h-6"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-400 uppercase">Secure Password Key</label>
            <div className="flex items-center gap-2 border border-gray-100 px-3 py-2 rounded-xl bg-gray-50/50">
              <Lock className="w-4 h-4 text-gray-400" />
              <input 
                type="password" 
                required
                className="w-full bg-transparent outline-none border-none text-gray-800 font-bold placeholder-gray-400 text-xs h-6"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold py-2.5 rounded-xl shadow-lg cursor-pointer transition text-center text-xs mt-2"
          >
            {isLoading ? "Authenticating Platform Security..." : "Initialize Command Node Access"}
          </button>
        </form>
      </div>
    </div>
  );
}
