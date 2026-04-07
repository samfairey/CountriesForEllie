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
  /** When true, polygons smaller than MIN_POLYGON_PX are rendered as visible dots */
  dotSmallIslands?: boolean;
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
/** Minimum rendered size (in SVG units) for a polygon to be drawn as a path.
 *  Smaller polygons are drawn as circles so tiny atolls remain visible. */
const MIN_POLYGON_PX = 6;

interface ProjectedRing {
  path: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
}

function projectAndScale(
  rings: Position[][],
  width: number,
  height: number,
  padding: number = 10
): { projected: ProjectedRing[]; viewBox: string } {
  if (rings.length === 0) return { projected: [], viewBox: `0 0 ${width} ${height}` };

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

  const projected = rings.map((ring) => {
    let rMinX = Infinity, rMaxX = -Infinity, rMinY = Infinity, rMaxY = -Infinity;
    const points = ring.map(([lng, lat]) => {
      const x = (mercatorX(lng) - minX) * scale + offsetX;
      const y = (mercatorY(lat) - minY) * scale + offsetY;
      if (x < rMinX) rMinX = x;
      if (x > rMaxX) rMaxX = x;
      if (y < rMinY) rMinY = y;
      if (y > rMaxY) rMaxY = y;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return {
      path: `M${points.join("L")}Z`,
      cx: (rMinX + rMaxX) / 2,
      cy: (rMinY + rMaxY) / 2,
      w: rMaxX - rMinX,
      h: rMaxY - rMinY,
    };
  });

  return { projected, viewBox: `0 0 ${width} ${height}` };
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
  dotSmallIslands = false,
}: CountryOutlineProps) {
  const { projected, viewBox } = useMemo(
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
        {projected.map((ring, i) => {
          const tooSmall = dotSmallIslands && ring.w < MIN_POLYGON_PX && ring.h < MIN_POLYGON_PX;
          if (tooSmall) {
            return (
              <circle
                key={i}
                cx={ring.cx}
                cy={ring.cy}
                r={MIN_POLYGON_PX / 2}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
              />
            );
          }
          return (
            <path
              key={i}
              d={ring.path}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
            />
          );
        })}
      </g>
    </svg>
  );
});
