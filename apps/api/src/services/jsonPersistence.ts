import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hydrateData } from "./hotelDefaults";
import type { HotelData } from "./hotelDataTypes";

const dataDir = path.resolve(process.cwd(), "apps", "api", "data");
const dataFile = path.join(dataDir, "hotel-data.json");

export async function loadJsonData(): Promise<HotelData | null> {
  await mkdir(dataDir, { recursive: true });
  try {
    const content = await readFile(dataFile, "utf8");
    return hydrateData(JSON.parse(content) as Partial<HotelData>);
  } catch {
    return null;
  }
}

export async function saveJsonData(data: HotelData) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(data, null, 2), "utf8");
}
