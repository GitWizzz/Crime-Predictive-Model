import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const getArg = (key, def) => {
  const idx = args.indexOf(key);
  if (idx === -1 || idx + 1 >= args.length) return def;
  return args[idx + 1];
};

const count = parseInt(getArg("--count", "200"), 10);
const outPath = getArg("--out", path.join("backend", "scripts", "dummy_firs.json"));
const bboxArg = getArg("--bbox", "24.3,83.2,27.5,88.5");
const [minLat, minLon, maxLat, maxLon] = bboxArg.split(",").map(Number);

if ([minLat, minLon, maxLat, maxLon].some(Number.isNaN)) {
  console.error("Invalid --bbox. Expected: minLat,minLon,maxLat,maxLon");
  process.exit(1);
}

const crimeTypes = [
  "THEFT",
  "ASSAULT",
  "ROBBERY",
  "BURGLARY",
  "FRAUD",
  "KIDNAPPING",
  "NARCOTICS",
  "VANDALISM",
];

const ipcSections = [
  "IPC 379",
  "IPC 323",
  "IPC 392",
  "IPC 457",
  "IPC 420",
  "IPC 363",
  "NDPS 21",
  "IPC 427",
];

const stations = [
  "Central Station",
  "North Station",
  "East Station",
  "West Station",
  "South Station",
];

const zones = ["ZONE_A", "ZONE_B", "ZONE_C", "ZONE_D"];

const randomInRange = (min, max) => min + Math.random() * (max - min);
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const now = Date.now();
const oneYearMs = 365 * 24 * 60 * 60 * 1000;

const firs = Array.from({ length: count }).map((_, i) => {
  const timestamp = new Date(now - Math.random() * oneYearMs);
  const firNo = `FIR-${String(i + 1).padStart(6, "0")}`;

  return {
    fir_no: firNo,
    crime_type: randomFrom(crimeTypes),
    section: randomFrom(ipcSections),
    date_time: timestamp.toISOString(),
    latitude: parseFloat(randomInRange(minLat, maxLat).toFixed(6)),
    longitude: parseFloat(randomInRange(minLon, maxLon).toFixed(6)),
    police_station: randomFrom(stations),
    zone: randomFrom(zones),
  };
});

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(firs, null, 2));

console.log(`Generated ${count} dummy FIR records -> ${outPath}`);
