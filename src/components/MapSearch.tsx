import React, { useState } from "react";
import { Search, MapPin, Loader2, X } from "lucide-react";

interface MapSearchProps {
  onLocationSelect: (lat: number, lng: number, displayName: string) => void;
}

export default function MapSearch({ onLocationSelect }: MapSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setShowDropdown(true);

    try {
      const res = await fetch(`/api/gis/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error("Failed to fetch location suggestions");
      }
      const data = await res.json();
      setResults(data);
      if (data.length === 0) {
        setError("No locations found. Try a different query in India.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to reach geospatial indexing server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setError(null);
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full" id="map-location-search-bar">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, district, state or ward in India..."
            className="w-full bg-brand-bg border border-brand-border px-3 py-1.5 pl-9 text-xs font-semibold rounded outline-none focus:border-brand-accent text-brand-text placeholder-brand-muted/70 shadow-inner"
          />
          <Search className="w-3.5 h-3.5 text-brand-muted absolute left-3 top-2.5" />
          
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-2.5 text-brand-muted hover:text-brand-text cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="bg-brand-accent hover:bg-brand-accent/90 text-white font-extrabold px-3.5 py-1.5 rounded text-xs transition cursor-pointer flex items-center gap-1 shadow disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          <span>Search</span>
        </button>
      </form>

      {/* Dropdown Suggestions List */}
      {showDropdown && (query || results.length > 0 || error) && (
        <div className="absolute left-0 right-0 mt-1.5 bg-brand-panel border border-brand-border rounded shadow-2xl z-50 max-h-[220px] overflow-y-auto divide-y divide-brand-border/40">
          {isLoading && (
            <div className="p-3 text-center text-xs font-semibold text-brand-muted flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-accent" />
              <span>Querying Live GIS Registry...</span>
            </div>
          )}
          
          {!isLoading && error && (
            <div className="p-3 text-center text-xs font-medium text-brand-danger bg-brand-danger/5">
              {error}
            </div>
          )}

          {!isLoading && !error && results.length === 0 && query && (
            <div className="p-3 text-center text-xs font-semibold text-brand-muted">
              Type or click search to search live records.
            </div>
          )}

          {!isLoading && results.map((item, index) => (
            <div
              key={index}
              onClick={() => {
                onLocationSelect(item.latitude, item.longitude, item.displayName);
                setShowDropdown(false);
                setResults([]);
              }}
              className="p-2.5 hover:bg-brand-bg cursor-pointer transition flex gap-2.5 items-start text-left text-xs"
            >
              <MapPin className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
              <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                <span className="font-extrabold text-brand-text truncate leading-snug">
                  {item.displayName.split(",")[0]}
                </span>
                <span className="text-[10px] text-brand-muted truncate">
                  {item.displayName}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
