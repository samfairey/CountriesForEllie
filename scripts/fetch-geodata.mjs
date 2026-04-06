/**
 * Downloads world country boundaries GeoJSON from Natural Earth (via GitHub),
 * simplifies geometries, normalises ISO_A2 codes, and writes the result to
 * src/data/countries.geo.json.
 *
 * Usage:  node scripts/fetch-geodata.mjs
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import * as turf from "@turf/turf";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/countries.geo.json");
const SRC_URL =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

// ISO_A2 overrides for countries whose Natural-Earth property is "-99" or wrong
const ISO_OVERRIDES = {
  France: "FR",
  Norway: "NO",
  Kosovo: "XK", // not a UN member but included in many datasets
  "N. Cyprus": "XX", // will be filtered out
  Somaliland: "XX",
  "W. Sahara": "EH",
  "S. Sudan": "SS",
  "Dem. Rep. Congo": "CD",
  "Central African Rep.": "CF",
  "Eq. Guinea": "GQ",
  "S. Africa": "ZA", // shouldn't be needed but just in case
  eSwatini: "SZ",
  "Solomon Is.": "SB",
  "Marshall Is.": "MH",
  "Dominican Rep.": "DO",
  "Bosnia and Herz.": "BA",
  "Czech Rep.": "CZ",
  Macedonia: "MK",
  "Timor-Leste": "TL",
  "Côte d'Ivoire": "CI",
  "São Tomé and Principe": "ST",
};

/**
 * Countries whose MultiPolygon contains distant overseas territories.
 * For each, we define a bounding box [minLng, minLat, maxLng, maxLat] that
 * covers only the main landmass. Any polygon whose centroid falls outside
 * this box is stripped.
 */
const MAINLAND_BBOX = {
  fr: [-5.5, 41.2, 9.7, 51.2],       // Metropolitan France
  pt: [-10, 36.9, -6, 42.2],          // Continental Portugal (excludes Azores, Madeira)
  es: [-9.4, 35.9, 4.4, 43.8],       // Peninsular Spain + Balearics (excludes Canary Is.)
  no: [4, 57, 31.5, 71.5],            // Mainland Norway (excludes Svalbard, Jan Mayen)
  nl: [3.3, 50.7, 7.3, 53.6],         // European Netherlands (excludes Caribbean)
  dk: [7.5, 54.5, 15.5, 58],          // Denmark proper (excludes Greenland, Faroe Is.)
  us: [-130, 24, -65, 50],            // Contiguous US (excludes Alaska, Hawaii, territories)
  gb: [-8.7, 49.8, 2, 61],            // Great Britain + Northern Ireland (excludes overseas)
  cl: [-76, -56, -66, -17],           // Continental Chile (excludes Easter Is., Juan Fernández)
  ec: [-81.1, -5.1, -75, 1.5],       // Continental Ecuador (excludes Galápagos)
  in: [68, 6, 97.5, 37],              // Mainland India (excludes Andaman/Nicobar)
  jp: [127, 30, 146, 46],             // Main Japanese islands
  my: [99, 0.8, 119.5, 7.5],          // Peninsular + Borneo Malaysia
  nz: [165, -48, 179, -34],           // Main NZ islands
  au: [112, -44, 154, -10],           // Mainland Australia + Tasmania
  ru: [27, 41, 190, 82],              // Russia (wide enough for Far East)
};

// Load our country IDs for filtering
const countriesJson = JSON.parse(
  readFileSync(resolve(__dirname, "../src/data/countries.json"), "utf8")
);
const validIds = new Set(countriesJson.map((c) => c.id));

/** Compute centroid of a single polygon ring set */
function polygonCentroid(coords) {
  let sumLng = 0, sumLat = 0, count = 0;
  for (const ring of coords) {
    for (const [lng, lat] of ring) {
      sumLng += lng;
      sumLat += lat;
      count++;
    }
  }
  return count > 0 ? [sumLng / count, sumLat / count] : [0, 0];
}

/** Strip overseas territory polygons from a MultiPolygon */
function stripOverseas(geometry, iso) {
  const bbox = MAINLAND_BBOX[iso];
  if (!bbox) return geometry;
  if (geometry.type !== "MultiPolygon") return geometry;

  const [bMinLng, bMinLat, bMaxLng, bMaxLat] = bbox;
  const kept = geometry.coordinates.filter((polygonCoords) => {
    const [cLng, cLat] = polygonCentroid(polygonCoords);
    return cLng >= bMinLng && cLng <= bMaxLng && cLat >= bMinLat && cLat <= bMaxLat;
  });

  if (kept.length === 0) return geometry; // safety: don't remove everything
  if (kept.length === 1) {
    return { type: "Polygon", coordinates: kept[0] };
  }
  return { type: "MultiPolygon", coordinates: kept };
}

async function main() {
  console.log("Fetching GeoJSON from GitHub...");
  const resp = await fetch(SRC_URL);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const raw = await resp.json();
  console.log(`  Downloaded ${raw.features.length} features`);

  const kept = [];
  const missing = new Set(validIds);

  for (const feature of raw.features) {
    const props = feature.properties || {};
    const rawIso = props["ISO3166-1-Alpha-2"] || props.ISO_A2 || props.ISO_A2_EH || null;
    let iso =
      (rawIso && rawIso !== "-99" && rawIso !== "-1") ? rawIso :
      ISO_OVERRIDES[props.ADMIN] ||
      ISO_OVERRIDES[props.NAME] ||
      ISO_OVERRIDES[props.name] ||
      null;

    if (iso) iso = iso.toLowerCase();
    if (!iso || iso === "xx") continue;
    if (!validIds.has(iso)) continue;

    missing.delete(iso);

    // Simplify geometry — tolerance in degrees (~0.015 ≈ ~1.7 km)
    let simplified;
    try {
      simplified = turf.simplify(feature, {
        tolerance: 0.015,
        highQuality: true,
      });
    } catch {
      simplified = feature;
    }

    const finalGeometry = stripOverseas(simplified.geometry, iso);

    kept.push({
      type: "Feature",
      properties: { ISO_A2: iso },
      geometry: finalGeometry,
    });
  }

  console.log(`  Kept ${kept.length} features`);
  if (missing.size > 0) {
    console.log(`  Missing ISO codes: ${[...missing].join(", ")}`);
  }

  const collection = {
    type: "FeatureCollection",
    features: kept,
  };

  writeFileSync(OUT, JSON.stringify(collection));
  const sizeMb = (Buffer.byteLength(JSON.stringify(collection)) / 1e6).toFixed(
    2
  );
  console.log(`  Written to ${OUT} (${sizeMb} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
