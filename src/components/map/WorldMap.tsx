import { useEffect, useRef, useState, useCallback, memo } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
} from "react-leaflet";
import type { FeatureCollection, Feature } from "geojson";
import type { Layer, PathOptions, LeafletMouseEvent } from "leaflet";
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

interface WorldMapProps {
  interactive?: boolean;
  highlightedCountries?: string[];
  selectedCountry?: string | null;
  correctCountry?: string | null;
  wrongCountry?: string | null;
  onCountryClick?: (countryId: string) => void;
  zoomToCountry?: string | null;
  showBorders?: boolean;
  showLabels?: boolean;
  className?: string;
}

const DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const DARK_TILES_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

const DEFAULT_STYLE: PathOptions = {
  color: "#334155",
  weight: 1,
  fillColor: "transparent",
  fillOpacity: 0,
};

const HIGHLIGHT_STYLE: PathOptions = {
  fillColor: "#0ea5e9",
  fillOpacity: 0.35,
  color: "#0ea5e9",
  weight: 2,
};

const SELECTED_STYLE: PathOptions = {
  fillColor: "#0ea5e9",
  fillOpacity: 0.5,
  color: "#38bdf8",
  weight: 2.5,
};

const CORRECT_STYLE: PathOptions = {
  fillColor: "#10b981",
  fillOpacity: 0.5,
  color: "#10b981",
  weight: 2.5,
};

const WRONG_STYLE: PathOptions = {
  fillColor: "#f43f5e",
  fillOpacity: 0.5,
  color: "#f43f5e",
  weight: 2.5,
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
  className = "",
}: WorldMapProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const highlightSet = new Set(highlightedCountries.map((id) => id.toLowerCase()));

  useEffect(() => {
    loadGeoJson().then(setGeoData);
  }, []);

  const getStyle = useCallback(
    (feature?: Feature): PathOptions => {
      if (!feature) return DEFAULT_STYLE;
      const iso = (feature.properties?.ISO_A2 || "").toLowerCase();

      if (correctCountry && iso === correctCountry.toLowerCase()) return CORRECT_STYLE;
      if (wrongCountry && iso === wrongCountry.toLowerCase()) return WRONG_STYLE;
      if (selectedCountry && iso === selectedCountry.toLowerCase()) return SELECTED_STYLE;
      if (highlightSet.has(iso)) return HIGHLIGHT_STYLE;

      if (!showBorders) {
        return { ...DEFAULT_STYLE, color: "transparent", weight: 0 };
      }

      return DEFAULT_STYLE;
    },
    [highlightSet, selectedCountry, correctCountry, wrongCountry, showBorders]
  );

  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      if (!interactive) return;

      const pathLayer = layer as L.Path;
      const iso = (feature.properties?.ISO_A2 || "").toLowerCase();

      layer.on({
        mouseover: () => {
          // Don't override correct/wrong/selected styles
          if (
            iso === correctCountry?.toLowerCase() ||
            iso === wrongCountry?.toLowerCase() ||
            iso === selectedCountry?.toLowerCase()
          )
            return;
          pathLayer.setStyle({
            ...getStyle(feature),
            ...HOVER_STYLE,
          });
        },
        mouseout: () => {
          pathLayer.setStyle(getStyle(feature));
        },
        click: (e: LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          onCountryClick?.(iso);
        },
      });
    },
    [interactive, onCountryClick, getStyle, correctCountry, wrongCountry, selectedCountry]
  );

  // Use a key that changes when style-affecting props change, forcing GeoJSON re-render
  const geoKey = `${selectedCountry}-${correctCountry}-${wrongCountry}-${highlightedCountries.join(",")}-${showBorders}`;

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
    >
      <TileLayer url={DARK_TILES} attribution={DARK_TILES_ATTR} />
      <ScrollZoomManager />
      <ZoomController zoomToCountry={zoomToCountry} />
      {geoData && (
        <GeoJSON
          key={geoKey}
          data={geoData}
          style={getStyle}
          onEachFeature={onEachFeature}
        />
      )}
    </MapContainer>
  );
});
