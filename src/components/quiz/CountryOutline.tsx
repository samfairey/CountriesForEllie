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
}: CountryOutlineProps) {
  const { paths, viewBox } = useMemo(
    () => projectAndScale(extractRings(geometry), width, height),
    [geometry, width, height]
  );

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
