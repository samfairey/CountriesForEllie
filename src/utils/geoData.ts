import type { FeatureCollection, Feature, Geometry, Position } from "geojson";

let cachedGeoJson: FeatureCollection | null = null;
let loadingPromise: Promise<FeatureCollection> | null = null;

export async function loadGeoJson(): Promise<FeatureCollection> {
  if (cachedGeoJson) return cachedGeoJson;
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch("/countries.geo.json")
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load GeoJSON: ${r.status}`);
      return r.json() as Promise<FeatureCollection>;
    })
    .then((data) => {
      cachedGeoJson = data;
      return data;
    });

  return loadingPromise;
}

export function getGeoJson(): FeatureCollection | null {
  return cachedGeoJson;
}

export function getCountryFeature(
  geoJson: FeatureCollection,
  isoCode: string
): Feature | null {
  return (
    geoJson.features.find(
      (f) => f.properties?.ISO_A2 === isoCode.toLowerCase()
    ) ?? null
  );
}

/** Extract all coordinate arrays from any geometry type */
function extractCoords(geometry: Geometry): Position[][] {
  switch (geometry.type) {
    case "Polygon":
      return geometry.coordinates;
    case "MultiPolygon":
      return geometry.coordinates.flat();
    case "GeometryCollection":
      return geometry.geometries.flatMap(extractCoords);
    default:
      return [];
  }
}

export interface BBox {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export function computeBBox(geometry: Geometry): BBox {
  const rings = extractCoords(geometry);
  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;

  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }

  return { minLng, maxLng, minLat, maxLat };
}

export function computeCentroid(geometry: Geometry): [number, number] {
  const bbox = computeBBox(geometry);
  return [(bbox.minLat + bbox.maxLat) / 2, (bbox.minLng + bbox.maxLng) / 2];
}

/** Get Leaflet-compatible bounds: [[south, west], [north, east]] */
export function getLeafletBounds(
  geometry: Geometry
): [[number, number], [number, number]] {
  const bbox = computeBBox(geometry);
  return [
    [bbox.minLat, bbox.minLng],
    [bbox.maxLat, bbox.maxLng],
  ];
}

/** Preload the GeoJSON in the background (call from setup screens) */
export function preloadGeoJson(): void {
  loadGeoJson().catch(() => {});
}
