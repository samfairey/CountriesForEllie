import { useEffect, useRef, useState, useCallback, memo } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { Layer, PathOptions, LeafletMouseEvent, LatLngBoundsExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  loadGeoJson,
  getCountryFeature,
  getLeafletBounds,
} from "../../utils/geoData";

// Fix Leaflet's default icon paths (needed for Vite builds)
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Shared canvas renderer — much faster than SVG for 195 features
const canvasRenderer = L.canvas({ padding: 0.5 });

export interface CapitalMarker {
  lat: number;
  lng: number;
  name: string;
}

interface WorldMapProps {
  interactive?: boolean;
  highlightedCountries?: string[];
  selectedCountry?: string | null;
  correctCountry?: string | null;
  wrongCountry?: string | null;
  onCountryClick?: (countryId: string, latlng?: { lat: number; lng: number }) => void;
  zoomToCountry?: string | null;
  showBorders?: boolean;
  showLabels?: boolean;
  /** Show capital city markers on the map */
  capitals?: CapitalMarker[];
  /** Initial bounds to fit the map to (e.g. region bounds) */
  initialBounds?: LatLngBoundsExpression | null;
  /** Use clean mode (no tile layer, just GeoJSON land) */
  cleanMap?: boolean;
  /** Fly to these bounds (changes trigger animation). Use a counter key to re-trigger. */
  flyToBounds?: { bounds: LatLngBoundsExpression; key: number } | null;
  /** Use blue highlight instead of green for the correct country */
  correctAsHighlight?: boolean;
  className?: string;
}

const DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png";
const LIGHT_TILES =
  "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png";

/** Pick a map tile URL that matches the active theme. Called at render time
 *  so theme changes refresh the map on next mount. */
function tileUrlForTheme(): string {
  if (typeof document === "undefined") return DARK_TILES;
  const t = document.documentElement.getAttribute("data-theme");
  return t === "daylight" ? LIGHT_TILES : DARK_TILES;
}
const DARK_TILES_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

const DEFAULT_STYLE: PathOptions = {
  color: "#334155",
  weight: 1,
  fillColor: "#1e293b",
  fillOpacity: 0.6,
  renderer: canvasRenderer,
};

const CLEAN_DEFAULT_STYLE: PathOptions = {
  color: "#475569",
  weight: 1,
  fillColor: "#1e293b",
  fillOpacity: 1,
  renderer: canvasRenderer,
};

const HIGHLIGHT_STYLE: PathOptions = {
  fillColor: "#0ea5e9",
  fillOpacity: 0.35,
  color: "#0ea5e9",
  weight: 2,
  renderer: canvasRenderer,
};

const SELECTED_STYLE: PathOptions = {
  fillColor: "#0ea5e9",
  fillOpacity: 0.5,
  color: "#38bdf8",
  weight: 2.5,
  renderer: canvasRenderer,
};

const CORRECT_STYLE: PathOptions = {
  fillColor: "#10b981",
  fillOpacity: 0.5,
  color: "#10b981",
  weight: 2.5,
  renderer: canvasRenderer,
};

const WRONG_STYLE: PathOptions = {
  fillColor: "#f43f5e",
  fillOpacity: 0.5,
  color: "#f43f5e",
  weight: 2.5,
  renderer: canvasRenderer,
};

const HOVER_STYLE: PathOptions = {
  fillColor: "#94a3b8",
  fillOpacity: 0.15,
};

/** Sub-component that handles zooming via map ref */
function ZoomController({ zoomToCountry }: { zoomToCountry?: string | null }) {
  const map = useMap();
  const geoJsonRef = useRef<FeatureCollection | null>(null);

  useEffect(() => {
    loadGeoJson().then((data) => {
      geoJsonRef.current = data;
    });
  }, []);

  useEffect(() => {
    if (!zoomToCountry || !geoJsonRef.current) return;
    const feature = getCountryFeature(geoJsonRef.current, zoomToCountry);
    if (!feature || !feature.geometry) return;

    const bounds = getLeafletBounds(feature.geometry);
    map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 6, duration: 0.8 });
  }, [zoomToCountry, map]);

  return null;
}

/** Sub-component that fits the map to initial bounds on mount */
function InitialBoundsController({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  const applied = useRef(false);

  useEffect(() => {
    if (!applied.current) {
      applied.current = true;
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 5 });
    }
  }, [bounds, map]);

  return null;
}

/** Sub-component that flies to bounds on key change */
function FlyToBoundsController({ bounds, triggerKey }: { bounds: LatLngBoundsExpression; triggerKey: number }) {
  const map = useMap();
  const prevKey = useRef(triggerKey);

  useEffect(() => {
    if (triggerKey !== prevKey.current) {
      prevKey.current = triggerKey;
      map.flyToBounds(bounds, { padding: [20, 20], maxZoom: 5, duration: 0.8 });
    }
  }, [triggerKey, bounds, map]);

  return null;
}

/** Sub-component that manages scroll-zoom behavior */
function ScrollZoomManager() {
  const map = useMap();

  useEffect(() => {
    map.scrollWheelZoom.disable();

    const enable = () => map.scrollWheelZoom.enable();
    const disable = () => map.scrollWheelZoom.disable();

    const container = map.getContainer();
    container.addEventListener("focus", enable);
    container.addEventListener("blur", disable);
    container.addEventListener("mouseenter", enable);
    container.addEventListener("mouseleave", disable);

    return () => {
      container.removeEventListener("focus", enable);
      container.removeEventListener("blur", disable);
      container.removeEventListener("mouseenter", enable);
      container.removeEventListener("mouseleave", disable);
    };
  }, [map]);

  return null;
}

/**
 * Sub-component that imperatively updates GeoJSON layer styles
 * without re-mounting the entire layer tree.
 */
function StyleUpdater({
  layerRef,
  highlightedCountries,
  selectedCountry,
  correctCountry,
  wrongCountry,
  showBorders,
  cleanMap,
  correctAsHighlight,
}: {
  layerRef: React.RefObject<L.GeoJSON | null>;
  highlightedCountries: string[];
  selectedCountry: string | null;
  correctCountry: string | null;
  wrongCountry: string | null;
  showBorders: boolean;
  cleanMap: boolean;
  correctAsHighlight: boolean;
}) {
  const baseStyle = cleanMap ? CLEAN_DEFAULT_STYLE : DEFAULT_STYLE;
  const highlightSet = new Set(highlightedCountries.map((id) => id.toLowerCase()));

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    layer.eachLayer((l) => {
      const featureLayer = l as L.Path & { feature?: Feature };
      const iso = (featureLayer.feature?.properties?.ISO_A2 || "").toLowerCase();

      let style: PathOptions;
      if (correctCountry && iso === correctCountry.toLowerCase()) {
        style = correctAsHighlight
          ? { ...HIGHLIGHT_STYLE, fillOpacity: 0.6, weight: 3 }
          : CORRECT_STYLE;
      } else if (wrongCountry && iso === wrongCountry.toLowerCase()) {
        style = WRONG_STYLE;
      } else if (selectedCountry && iso === selectedCountry.toLowerCase()) {
        style = SELECTED_STYLE;
      } else if (highlightSet.has(iso)) {
        style = HIGHLIGHT_STYLE;
      } else if (!showBorders) {
        style = { ...baseStyle, color: "transparent", weight: 0 };
      } else {
        style = baseStyle;
      }
      featureLayer.setStyle(style);
    });
  }, [highlightedCountries, selectedCountry, correctCountry, wrongCountry, showBorders, cleanMap, correctAsHighlight, baseStyle, layerRef]);

  return null;
}

export const WorldMap = memo(function WorldMap({
  interactive = true,
  highlightedCountries = [],
  selectedCountry = null,
  correctCountry = null,
  wrongCountry = null,
  onCountryClick,
  zoomToCountry = null,
  showBorders = true,
  showLabels: _showLabels = false,
  capitals = [],
  initialBounds = null,
  cleanMap = false,
  flyToBounds = null,
  correctAsHighlight = false,
  className = "",
}: WorldMapProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    loadGeoJson().then(setGeoData);
  }, []);

  const baseStyle = cleanMap ? CLEAN_DEFAULT_STYLE : DEFAULT_STYLE;

  // Initial style callback (used only on first mount of GeoJSON layer)
  // When interactive is false (reverse mode), mark features as non-interactive
  // so the Canvas renderer won't capture pointer events, allowing map pan/zoom.
  const getInitialStyle = useCallback(
    (_feature?: Feature): PathOptions => {
      const base = !showBorders
        ? { ...baseStyle, color: "transparent", weight: 0 }
        : baseStyle;
      return interactive
        ? base
        : ({ ...base, interactive: false } as PathOptions);
    },
    [showBorders, baseStyle, interactive]
  );

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      if (!interactive) return;

      const pathLayer = layer as L.Path;
      const iso = (feature.properties?.ISO_A2 || "").toLowerCase();

      layer.on({
        mouseover: () => {
          const currentStyle = (pathLayer.options as PathOptions);
          // Don't override special styles (check fill color)
          const fill = currentStyle.fillColor;
          if (
            fill === CORRECT_STYLE.fillColor ||
            fill === WRONG_STYLE.fillColor ||
            fill === SELECTED_STYLE.fillColor ||
            fill === HIGHLIGHT_STYLE.fillColor
          )
            return;
          pathLayer.setStyle({
            ...currentStyle,
            ...HOVER_STYLE,
          });
        },
        mouseout: () => {
          // Reset to base style — StyleUpdater will correct if needed
          pathLayer.setStyle(
            !showBorders
              ? { ...baseStyle, color: "transparent", weight: 0 }
              : baseStyle
          );
        },
        click: (e: LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          onCountryClick?.(iso, { lat: e.latlng.lat, lng: e.latlng.lng });
        },
      });
    },
    [interactive, onCountryClick, showBorders, baseStyle]
  );

  // Stable key — only changes if geoData itself changes (load), never on style changes
  const geoKey = geoData ? "geo-loaded" : "geo-pending";

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      maxZoom={8}
      zoomControl={false}
      attributionControl={false}
      className={`w-full h-full ${className}`}
      style={{ background: "#0f172a" }}
      renderer={canvasRenderer}
    >
      {!cleanMap && (
        <TileLayer
          url={tileUrlForTheme()}
          attribution={DARK_TILES_ATTR}
          updateWhenZooming={false}
          updateWhenIdle={true}
          keepBuffer={4}
        />
      )}
      <ScrollZoomManager />
      <ZoomController zoomToCountry={zoomToCountry} />
      {initialBounds && <InitialBoundsController bounds={initialBounds} />}
      {flyToBounds && <FlyToBoundsController bounds={flyToBounds.bounds} triggerKey={flyToBounds.key} />}
      {geoData && (
        <GeoJSON
          key={geoKey}
          ref={geoLayerRef}
          data={geoData}
          style={getInitialStyle}
          onEachFeature={onEachFeature}
        />
      )}
      <StyleUpdater
        layerRef={geoLayerRef}
        highlightedCountries={highlightedCountries}
        selectedCountry={selectedCountry}
        correctCountry={correctCountry}
        wrongCountry={wrongCountry}
        showBorders={showBorders}
        cleanMap={cleanMap}
        correctAsHighlight={correctAsHighlight}
      />
      {capitals.map((cap) => (
        <CircleMarker
          key={`${cap.lat}-${cap.lng}`}
          center={[cap.lat, cap.lng]}
          radius={3}
          pathOptions={{ color: "#fbbf24", fillColor: "#fbbf24", fillOpacity: 1, weight: 1 }}
        >
          <Tooltip
            direction="top"
            offset={[0, -5]}
            className="capital-tooltip"
            permanent={false}
          >
            {cap.name}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
});
