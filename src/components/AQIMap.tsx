import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Ward, Station, PollutionHotspot, IndustryRecord, CitizenComplaint } from "../types.js";

// Resolve Leaflet's default marker icon assets in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
});

interface AQIMapProps {
  wards: Ward[];
  stations: Station[];
  hotspots: PollutionHotspot[];
  industries: IndustryRecord[];
  complaints: CitizenComplaint[];
  selectedWardId: string | null;
  onWardSelect: (wardId: string) => void;
  activeLayer: "aqi" | "hotspots" | "industrial" | "complaints";
  onMapClick?: (lat: number, lng: number) => void;
  complaintMarkerCoords?: [number, number] | null;
}

export default function AQIMap({
  wards,
  stations,
  hotspots,
  industries,
  complaints,
  selectedWardId,
  onWardSelect,
  activeLayer,
  onMapClick,
  complaintMarkerCoords
}: AQIMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{
    wards: L.FeatureGroup;
    stations: L.FeatureGroup;
    hotspots: L.FeatureGroup;
    industries: L.FeatureGroup;
    complaints: L.FeatureGroup;
    complaintSelection: L.FeatureGroup;
  } | null>(null);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  const lastDataRef = useRef("");

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Centered around Bengaluru
    const map = L.map(mapContainerRef.current, {
      center: [12.9716, 77.5946],
      zoom: 11.5,
      scrollWheelZoom: true
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    // Create feature groups
    const groups = {
      wards: L.featureGroup().addTo(map),
      stations: L.featureGroup().addTo(map),
      hotspots: L.featureGroup().addTo(map),
      industries: L.featureGroup().addTo(map),
      complaints: L.featureGroup().addTo(map),
      complaintSelection: L.featureGroup().addTo(map)
    };

    layersRef.current = groups;
    mapRef.current = map;

    // Handle clicks to select coords for complaints
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Redraw layers when properties or activeLayer changes
  useEffect(() => {
    const map = mapRef.current;
    const groups = layersRef.current;
    if (!map || !groups) return;

    // Stop continuous map refresh and map blinking completely
    const currentDataStr = JSON.stringify({
      wards: wards.map(w => w.id),
      stations: stations.map(s => s.id),
      hotspots: hotspots.map(h => ({ id: h.id, val: h.aqiValue, risk: h.riskLevel })),
      industries: industries.map(i => i.id),
      complaints: complaints.map(c => ({ id: c.id, status: c.status })),
      selectedWardId,
      activeLayer,
      complaintMarkerCoords
    });

    if (lastDataRef.current === currentDataStr) {
      return;
    }
    lastDataRef.current = currentDataStr;

    // Clear all layers
    groups.wards.clearLayers();
    groups.stations.clearLayers();
    groups.hotspots.clearLayers();
    groups.industries.clearLayers();
    groups.complaints.clearLayers();
    groups.complaintSelection.clearLayers();

    // 1. Draw Ward Boundaries
    wards.forEach(ward => {
      const isSelected = ward.id === selectedWardId;
      
      // Compute ward AQI to color boundary
      const currentHotspot = hotspots.find(h => h.wardId === ward.id);
      const aqi = currentHotspot ? currentHotspot.aqiValue : 100;
      
      // AQI Color Scheme
      let color = "#10B981"; // Good: Green
      if (aqi > 300) color = "#EF4444"; // Severe: Deep Red
      else if (aqi > 200) color = "#F59E0B"; // Very Poor: Amber/Orange
      else if (aqi > 150) color = "#EC4899"; // Poor: Pink/Red
      else if (aqi > 100) color = "#3B82F6"; // Moderate: Blue

      const polygon = L.polygon(ward.coordinates as [number, number][], {
        color: isSelected ? "#4F46E5" : color,
        weight: isSelected ? 3.5 : 1.5,
        fillColor: color,
        fillOpacity: activeLayer === "aqi" ? (isSelected ? 0.45 : 0.25) : 0.05,
        dashArray: isSelected ? "" : "3"
      });

      polygon.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onWardSelect(ward.id);
      });

      // Simple HTML popup
      polygon.bindTooltip(`
        <div class="p-1.5 font-sans">
          <p class="font-bold text-gray-900">${ward.name} (${ward.code})</p>
          <p class="text-xs text-gray-600">Density: ${ward.populationDensity.toLocaleString()} pop/km²</p>
          <p class="text-xs text-indigo-600 font-medium">Click to examine details</p>
        </div>
      `, { sticky: true });

      groups.wards.addLayer(polygon);
    });

    // 2. Monitoring Stations
    stations.forEach(st => {
      const icon = L.divIcon({
        className: "bg-white border-2 border-indigo-600 rounded-full flex items-center justify-center shadow-lg",
        html: `<div class="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-ping"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([st.latitude, st.longitude], { icon });
      marker.bindPopup(`
        <div class="font-sans text-xs">
          <p class="font-bold text-indigo-900 text-sm">${st.name}</p>
          <p class="text-gray-600 font-medium">CACQMS Monitor Station</p>
          <p class="text-green-600 flex items-center mt-1">● Operating Online</p>
        </div>
      `);
      groups.stations.addLayer(marker);
    });

    // 3. Hotspots - rendered always as requested to show all available places
    hotspots.forEach(hp => {
      if (hp.riskLevel === "low") return;
      
      let color = "#EC4899"; // Moderate/Poor
      if (hp.riskLevel === "critical") color = "#EF4444";
      else if (hp.riskLevel === "high") color = "#F59E0B";

      const circle = L.circle([hp.latitude, hp.longitude], {
        radius: hp.sizeRadiusMeters,
        color: color,
        fillColor: color,
        fillOpacity: 0.35,
        weight: 1
      });

      circle.bindTooltip(`
        <div class="font-sans text-xs">
          <span class="font-bold text-red-700 uppercase">🚨 Hotspot Risk: ${hp.riskLevel}</span>
          <p class="text-gray-900 mt-0.5">AQI Center: <strong>${hp.aqiValue}</strong></p>
          <p class="text-gray-600">Dominant: ${hp.dominantPollutant}</p>
        </div>
      `);
      groups.hotspots.addLayer(circle);
    });

    // 4. Industrial Emission Clusters - rendered always as requested to show all available places
    industries.forEach(ind => {
      const icon = L.divIcon({
        className: "bg-amber-100 border border-amber-600 rounded-md flex items-center justify-center shadow-sm",
        html: `<span class="text-xs font-bold text-amber-800">🏭</span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([ind.latitude, ind.longitude], { icon });
      marker.bindPopup(`
        <div class="font-sans text-xs">
          <p class="font-bold text-amber-900">${ind.name}</p>
          <p class="text-gray-600">Type: ${ind.industryType}</p>
          <span class="inline-block bg-red-100 text-red-800 font-bold px-1 rounded text-[10px] mt-1">
            EMISSIONS: ${ind.emissionCategory.toUpperCase()}
          </span>
        </div>
      `);
      groups.industries.addLayer(marker);
    });

    // 5. Citizen Complaints - rendered always as requested to show all available places
    complaints.forEach(cmp => {
      let typeEmoji = "🔥";
      if (cmp.complaintType === "construction_dust") typeEmoji = "🏗️";
      else if (cmp.complaintType === "heavy_traffic") typeEmoji = "🚗";
      else if (cmp.complaintType === "industrial_smoke") typeEmoji = "🏭";

      const icon = L.divIcon({
        className: "bg-red-50 border border-red-500 rounded-full flex items-center justify-center shadow",
        html: `<span class="text-xs">${typeEmoji}</span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([cmp.latitude, cmp.longitude], { icon });
      marker.bindPopup(`
        <div class="font-sans text-xs max-w-[200px]">
          <p class="font-bold text-red-900">${cmp.complaintType.replace("_", " ").toUpperCase()}</p>
          <p class="text-gray-600 italic mt-0.5">"${cmp.description}"</p>
          <div class="flex justify-between items-center mt-2">
            <span class="text-[9px] text-gray-500">${new Date(cmp.timestamp).toLocaleDateString()}</span>
            <span class="px-1 rounded bg-orange-100 text-orange-800 font-bold text-[9px] uppercase">${cmp.status}</span>
          </div>
        </div>
      `);
      groups.complaints.addLayer(marker);
    });

    // 6. Draw currently clicked position for a new complaint
    if (complaintMarkerCoords) {
      const marker = L.marker(complaintMarkerCoords, { draggable: true });
      marker.on("dragend", (event) => {
        const pos = event.target.getLatLng();
        if (onMapClickRef.current) {
          onMapClickRef.current(pos.lat, pos.lng);
        }
      });
      marker.bindTooltip('<div class="p-1 text-xs font-bold bg-brand-panel border border-brand-border rounded text-brand-text">Incident Pin selected! Drag to adjust position.</div>', { permanent: true, direction: "top" });
      groups.complaintSelection.addLayer(marker);
    }

  }, [wards, stations, hotspots, industries, complaints, selectedWardId, activeLayer, complaintMarkerCoords]);

  // Center on selected ward boundary when user changes selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedWardId) return;

    const ward = wards.find(w => w.id === selectedWardId);
    if (ward) {
      map.setView(ward.centroid, 13, { animate: true });
    }
  }, [selectedWardId, wards]);

  return (
    <div className="relative w-full h-full rounded overflow-hidden border border-brand-border bg-brand-bg shadow-sm" id="gis-map-view">
      <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />
      <div className="absolute top-3 right-3 bg-brand-panel/90 backdrop-blur px-3 py-2 rounded border border-brand-border shadow-lg z-10 flex flex-col gap-1.5 pointer-events-auto">
        <p className="text-[10px] font-bold text-brand-muted tracking-wider uppercase">GIS Overlays</p>
        <div className="flex gap-1.5 items-center">
          <div className="w-2 h-2 bg-brand-success rounded-full"></div>
          <span className="text-[10px] text-brand-text font-medium">Good AQI (&le; 100)</span>
        </div>
        <div className="flex gap-1.5 items-center">
          <div className="w-2 h-2 bg-brand-accent rounded-full"></div>
          <span className="text-[10px] text-brand-text font-medium">Poor (101-200)</span>
        </div>
        <div className="flex gap-1.5 items-center">
          <div className="w-2 h-2 bg-brand-warning rounded-full"></div>
          <span className="text-[10px] text-brand-text font-medium">Very Poor (201-300)</span>
        </div>
        <div className="flex gap-1.5 items-center">
          <div className="w-2 h-2 bg-brand-danger rounded-full animate-pulse"></div>
          <span className="text-[10px] text-brand-text font-medium">Severe / Critical (&gt; 300)</span>
        </div>
      </div>
    </div>
  );
}
