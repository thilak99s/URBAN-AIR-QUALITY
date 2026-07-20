import { Ward } from "../types.js";

// Ray-casting algorithm to determine if lat/lng is inside a polygon
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  if (!polygon || polygon.length === 0) return false;
  const x = point[0];
  const y = point[1];
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y))
        && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Haversine distance or standard Euclidean distance in degrees
export function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export interface GeocodeResult {
  isOutOfBounds: boolean;
  nearestWard: Ward | null;
  landmarkLabel: string;
}

// Identify if coordinate is in-bounds and geocode nearest landmark
export function reverseGeocode(lat: number, lng: number, wards: Ward[]): GeocodeResult {
  if (wards.length === 0) {
    return { isOutOfBounds: false, nearestWard: null, landmarkLabel: "Unknown Territory" };
  }

  // Check if inside any polygon
  let containingWard: Ward | null = null;
  for (const ward of wards) {
    if (isPointInPolygon([lat, lng], ward.coordinates)) {
      containingWard = ward;
      break;
    }
  }

  if (containingWard) {
    return {
      isOutOfBounds: false,
      nearestWard: containingWard,
      landmarkLabel: `Inside ${containingWard.name}`
    };
  }

  // If not inside, find nearest ward by centroid
  let nearestWard: Ward = wards[0];
  let minDistance = Infinity;

  for (const ward of wards) {
    const dist = getDistance(lat, lng, ward.centroid[0], ward.centroid[1]);
    if (dist < minDistance) {
      minDistance = dist;
      nearestWard = ward;
    }
  }

  // Generate realistic label based on distance thresholds
  let label = `Adjacent to ${nearestWard.name}`;
  if (minDistance > 0.05) {
    label = `Outer ${nearestWard.name} Bypass`;
  } else if (minDistance > 0.02) {
    label = `${nearestWard.name} Suburbs`;
  }

  return {
    isOutOfBounds: true,
    nearestWard,
    landmarkLabel: label
  };
}
