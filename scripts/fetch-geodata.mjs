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
const OUT = resolve(__dirname, "../src/data/countries.geo.json");
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

// Load our country IDs for filtering
const countriesJson = JSON.parse(
  readFileSync(resolve(__dirname, "../src/data/countries.json"), "utf8")
);
const validIds = new Set(countriesJson.map((c) => c.id));

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

    kept.push({
      type: "Feature",
      properties: { ISO_A2: iso },
      geometry: simplified.geometry,
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
