import React from "react";
import { MapPin, Wind, Thermometer, Droplets, Compass, BarChart3, CloudRain, Sun, ShieldAlert, Sparkles, Building, Globe } from "lucide-react";

interface GisTelemetryHudProps {
  telemetry: any;
  isLoading: boolean;
  onFileComplaint: () => void;
  onResetPin?: () => void;
  isPinned: boolean;
}

export default function GisTelemetryHud({
  telemetry,
  isLoading,
  onFileComplaint,
  onResetPin,
  isPinned
}: GisTelemetryHudProps) {
  if (isLoading) {
    return (
      <div className="bg-brand-panel border border-brand-border rounded p-6 text-center shadow-lg flex flex-col items-center justify-center gap-3">
        <div className="w-7 h-7 border-3 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-brand-muted animate-pulse">Retrieving Real-Time Satellite & Station Environmental Telemetry...</p>
      </div>
    );
  }

  if (!telemetry) {
    return (
      <div className="bg-brand-panel border border-brand-border rounded p-5 text-center text-xs font-semibold text-brand-muted">
        Select a ward or pin any coordinate on the map to initialize environmental intelligence scanning.
      </div>
    );
  }

  const {
    latitude, longitude, country, state, district, city, municipality, ward, postalCode, formattedAddress,
    aqi, pm25, pm10, no2, so2, co, o3, nh3,
    temperature, humidity, windSpeed, windDirection, windDirectionCompass, pressure, rainfall, uvIndex
  } = telemetry;

  // Determine AQI category styling
  let aqiColor = "text-brand-success bg-brand-success/10 border-brand-success/25";
  let aqiLabel = "Good";
  let aqiDesc = "Air quality is satisfactory, and air pollution poses little or no risk.";
  
  if (aqi > 300) {
    aqiColor = "text-brand-danger bg-brand-danger/15 border-brand-danger/30 animate-pulse";
    aqiLabel = "Hazardous / Critical";
    aqiDesc = "Health warning of emergency conditions: everyone is more likely to experience serious health effects.";
  } else if (aqi > 200) {
    aqiColor = "text-brand-danger bg-brand-danger/10 border-brand-danger/20";
    aqiLabel = "Very Poor";
    aqiDesc = "Health alert: everyone may experience more serious health effects.";
  } else if (aqi > 150) {
    aqiColor = "text-orange-500 bg-orange-500/10 border-orange-500/20";
    aqiLabel = "Unhealthy / Poor";
    aqiDesc = "Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.";
  } else if (aqi > 100) {
    aqiColor = "text-brand-warning bg-brand-warning/10 border-brand-warning/20";
    aqiLabel = "Moderate / Unhealthy for Sensitive";
    aqiDesc = "Members of sensitive groups may experience health effects. The general public is less likely to be affected.";
  }

  return (
    <div className="bg-brand-panel border border-brand-border rounded p-4 flex flex-col gap-4 shadow-xl text-left" id="live-gis-telemetry-hud">
      {/* HUD Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-brand-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-brand-accent" />
          <div>
            <h4 className="font-extrabold text-xs text-brand-text flex items-center gap-1.5 uppercase tracking-wider">
              Live GIS Telemetry HUB
            </h4>
            <p className="text-[9px] text-brand-muted font-semibold mt-0.5">Official Satellite and Station Observations Feed</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 self-end">
          <span className="text-[9px] font-mono bg-brand-bg border border-brand-border px-2 py-0.5 rounded font-bold text-brand-muted">
            GPS: {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </span>
          {isPinned && onResetPin && (
            <button
              onClick={onResetPin}
              className="text-[9px] font-black bg-brand-danger/15 border border-brand-danger/30 hover:bg-brand-danger/25 text-brand-danger px-2 py-0.5 rounded transition cursor-pointer"
            >
              RESET PIN
            </button>
          )}
        </div>
      </div>

      {/* Address Geocode Breadcrumb */}
      <div className="bg-brand-bg/50 border border-brand-border/60 rounded p-2.5 flex flex-col gap-1 text-[11px] font-semibold">
        <div className="flex flex-wrap gap-1.5 text-brand-muted items-center">
          <span className="text-brand-accent flex items-center gap-1"><MapPin className="w-3 h-3" /> {country}</span>
          <span className="opacity-40">&bull;</span>
          <span>{state}</span>
          {district && (
            <>
              <span className="opacity-40">&bull;</span>
              <span>{district} District</span>
            </>
          )}
          {city && (
            <>
              <span className="opacity-40">&bull;</span>
              <span>{city} City</span>
            </>
          )}
        </div>
        {formattedAddress && (
          <p className="text-brand-text mt-1 text-[10px] font-medium leading-relaxed bg-brand-panel/40 p-1.5 rounded border border-brand-border/30 truncate" title={formattedAddress}>
            {formattedAddress}
          </p>
        )}
      </div>

      {/* Main Stats: AQI and Weather */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Air Quality Index Card */}
        <div className={`p-3.5 rounded border flex flex-col gap-1.5 ${aqiColor}`}>
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase tracking-wider opacity-85">Live Air Quality Index</span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-brand-panel border border-brand-border text-brand-text font-mono">
              US-AQI
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight font-display">{aqi}</span>
            <span className="text-xs font-black uppercase tracking-wide">{aqiLabel}</span>
          </div>
          <p className="text-[10px] leading-relaxed font-semibold opacity-85">{aqiDesc}</p>
        </div>

        {/* Meteorology Quick Glance */}
        <div className="border border-brand-border p-3 rounded bg-brand-bg/40 flex flex-col justify-between gap-1.5">
          <span className="text-[9px] font-black uppercase tracking-wider text-brand-muted">Local Weather Observations</span>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-brand-danger" />
              <div className="flex flex-col text-[10px]">
                <span className="text-brand-muted font-bold">Temperature</span>
                <strong className="text-brand-text font-black font-mono">{temperature}&deg;C</strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-brand-accent" />
              <div className="flex flex-col text-[10px]">
                <span className="text-brand-muted font-bold">Humidity</span>
                <strong className="text-brand-text font-black font-mono">{humidity}%</strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-brand-success" />
              <div className="flex flex-col text-[10px]">
                <span className="text-brand-muted font-bold">Wind Speed</span>
                <strong className="text-brand-text font-black font-mono">{windSpeed} km/h</strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-brand-warning" />
              <div className="flex flex-col text-[10px]">
                <span className="text-brand-muted font-bold">Wind Direction</span>
                <strong className="text-brand-text font-black font-mono">{windDirectionCompass} ({windDirection}&deg;)</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Particulate Matter details */}
      <div className="flex flex-col gap-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-brand-muted">Observed Particulates & Gases (&micro;g/m&sup3;)</span>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {[
            { label: "PM2.5", val: pm25, limit: 60, unit: "µg" },
            { label: "PM10", val: pm10, limit: 100, unit: "µg" },
            { label: "NO2", val: no2, limit: 80, unit: "µg" },
            { label: "SO2", val: so2, limit: 80, unit: "µg" },
            { label: "CO", val: co, limit: 2, unit: "mg" },
            { label: "O3", val: o3, limit: 100, unit: "µg" },
            { label: "NH3", val: nh3, limit: 400, unit: "µg" },
            { label: "UV Index", val: uvIndex, limit: 11, unit: "UV" }
          ].map((param, index) => {
            const isOver = param.val > param.limit;
            return (
              <div key={index} className={`p-2 rounded border text-center flex flex-col justify-center items-center ${isOver ? "border-brand-danger/30 bg-brand-danger/5" : "border-brand-border bg-brand-bg/30"}`}>
                <span className="text-[8px] font-bold text-brand-muted block">{param.label}</span>
                <strong className={`text-[11px] font-mono font-black ${isOver ? "text-brand-danger" : "text-brand-text"}`}>
                  {param.val}
                </strong>
                <span className="text-[7px] text-brand-muted/70">{param.unit}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Weather metrics */}
      <div className="grid grid-cols-2 gap-3 text-[10px] font-medium text-brand-muted border-t border-brand-border/30 pt-3">
        <div className="flex justify-between items-center bg-brand-bg/30 px-2.5 py-1.5 rounded border border-brand-border/40">
          <span className="flex items-center gap-1"><CloudRain className="w-3.5 h-3.5 text-brand-accent" /> Rain Precipitation</span>
          <strong className="text-brand-text font-black font-mono">{rainfall} mm</strong>
        </div>
        <div className="flex justify-between items-center bg-brand-bg/30 px-2.5 py-1.5 rounded border border-brand-border/40">
          <span className="flex items-center gap-1"><Compass className="w-3.5 h-3.5 text-brand-warning" /> Atmospheric Pressure</span>
          <strong className="text-brand-text font-black font-mono">{pressure} hPa</strong>
        </div>
      </div>

      {/* Primary Actions */}
      <button
        type="button"
        onClick={onFileComplaint}
        className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-extrabold py-2.5 rounded text-xs transition cursor-pointer shadow-md text-center flex items-center justify-center gap-1.5 uppercase tracking-wide"
      >
        <Sparkles className="w-4 h-4 animate-pulse" />
        <span>File Environmental Complaint At Location</span>
      </button>
    </div>
  );
}
