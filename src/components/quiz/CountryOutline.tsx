import { memo, useMemo } from "react";
import type { Geometry, Position } from "geojson";

interface CountryOutlineProps {
  geometry: Geometry;
  width?: number;
  height?: number;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  rotation?: number;
  onClick?: () => void;
  className?: string;
  /** Capital city coordinates — when provided, filters out distant island
   *  groups so the outline focuses on the capital region + nearby islands */
  capitalCoords?: { lat: number; lng: number };
}

/** Extract all rings of coordinates from a geometry */
function extractRings(geometry: Geometry): Position[][] {
  switch (geometry.type) {
    case "Polygon":
      return geometry.coordinates;
    case "MultiPolygon":
      return geometry.coordinates.flat();
    case "GeometryCollection":
      return geometry.geometries.flatMap(extractRings);
    default:
      return [];
  }
}

const DEG2RAD = Math.PI / 180;

/** Approximate distance in km between two lat/lng points (Haversine) */
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLng = (lng2 - lng1) * DEG2RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Centroid of a polygon ring (simple average) */
function ringCentroid(ring: Position[]): [number, number] {
  let sumLng = 0, sumLat = 0;
  for (const [lng, lat] of ring) {
    sumLng += lng;
    sumLat += lat;
  }
  return [sumLat / ring.length, sumLng / ring.length];
}

/**
 * Filter rings to only those within a reasonable radius of the capital.
 * Keeps the capital's island + nearby islands, drops distant outliers.
 * Only filters when the full extent spans > 500km (i.e. spread-out archipelagos).
 */
function filterNearCapital(
  rings: Position[][],
  capital: { lat: number; lng: number }
): Position[][] {
  if (rings.length <= 1) return rings;

  // Check full extent — if the country isn't very spread out, keep everything
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
  }
  const extentKm = haversineKm(minLat, minLng, maxLat, maxLng);
  if (extentKm < 500) return rings;

  // Compute distance from each ring to the capital
  const withDist = rings.map((ring) => {
    const [lat, lng] = ringCentroid(ring);
    const dist = haversineKm(lat, lng, capital.lat, capital.lng);
    return { ring, dist };
  });

  // Always include rings within 300km of the capital
  // Then extend to 500km if that captures significantly more area
  const NEAR = 300;
  const FAR = 500;

  const nearRings = withDist.filter((r) => r.dist <= NEAR);
  const farRings = withDist.filter((r) => r.dist <= FAR);

  // Use the larger set if it's not too much more spread out
  const result = farRings.length > nearRings.length ? farRings : nearRings;

  // Fallback: if nothing is near the capital (data quirk), keep everything
  if (result.length === 0) return rings;

  return result.map((r) => r.ring);
}

/** Project longitude to Mercator x (radians) */
function mercatorX(lng: number): number {
  return lng * DEG2RAD;
}

/** Project latitude to Mercator y (radians, north = negative for SVG) */
function mercatorY(lat: number): number {
  const clamped = Math.max(-85, Math.min(85, lat));
  const radLat = clamped * DEG2RAD;
  return -Math.log(Math.tan(Math.PI / 4 + radLat / 2));
}

/**
 * Mercator projection — both axes in the same radian coordinate space
 * so country aspect ratios are preserved correctly.
 */
function projectAndScale(
  rings: Position[][],
  width: number,
  height: number,
  padding: number = 10
): { paths: string[]; viewBox: string } {
  if (rings.length === 0) return { paths: [], viewBox: `0 0 ${width} ${height}` };

  // Find bounds in projected (radian) space
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      const mx = mercatorX(lng);
      const my = mercatorY(lat);
      if (mx < minX) minX = mx;
      if (mx > maxX) maxX = mx;
      if (my < minY) minY = my;
      if (my > maxY) maxY = my;
    }
  }

  const geoW = maxX - minX || 1;
  const geoH = maxY - minY || 1;
  const drawW = width - padding * 2;
  const drawH = height - padding * 2;
  const scale = Math.min(drawW / geoW, drawH / geoH);

  const offsetX = padding + (drawW - geoW * scale) / 2;
  const offsetY = padding + (drawH - geoH * scale) / 2;

  const paths = rings.map((ring) => {
    const points = ring.map(([lng, lat]) => {
      const x = (mercatorX(lng) - minX) * scale + offsetX;
      const y = (mercatorY(lat) - minY) * scale + offsetY;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M${points.join("L")}Z`;
  });

  return { paths, viewBox: `0 0 ${width} ${height}` };
}

export const CountryOutline = memo(function CountryOutline({
  geometry,
  width = 400,
  height = 300,
  fillColor = "#0ea5e9",
  strokeColor = "#334155",
  strokeWidth = 1,
  rotation = 0,
  onClick,
  className = "",
  capitalCoords,
}: CountryOutlineProps) {
  const { paths, viewBox } = useMemo(() => {
    let rings = extractRings(geometry);
    if (capitalCoords) {
      rings = filterNearCapital(rings, capitalCoords);
    }
    return projectAndScale(rings, width, height);
  }, [geometry, width, height, capitalCoords]);

  const transform = rotation !== 0
    ? `rotate(${rotation} ${width / 2} ${height / 2})`
    : undefined;

  return (
    <svg
      viewBox={viewBox}
      width={width}
      height={height}
      className={className}
      onClick={onClick}
      role={onClick ? "button" : "img"}
      aria-label="Country outline"
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <g transform={transform}>
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  );
});
