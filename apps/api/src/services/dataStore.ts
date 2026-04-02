import { getDatabaseUrl } from "../lib/postgres";
import { cloneDefaults } from "./hotelDefaults";
import { loadJsonData, saveJsonData } from "./jsonPersistence";
import { loadPostgresData, savePostgresData } from "./postgresPersistence";
import type { HotelData } from "./hotelDataTypes";

type PersistenceAdapter = {
  mode: "json" | "postgres";
  load(): Promise<HotelData | null>;
  save(data: HotelData): Promise<void>;
};

let cachedData: HotelData | null = null;
let mutationQueue: Promise<unknown> = Promise.resolve();

function createPersistenceAdapter(): PersistenceAdapter {
  const explicitMode = process.env.HOTEL_CRM_STORAGE?.trim().toLowerCase();

  if (explicitMode === "json") {
    return {
      mode: "json",
      load: loadJsonData,
      save: saveJsonData
    };
  }

  if (explicitMode === "postgres") {
    return {
      mode: "postgres",
      load: loadPostgresData,
      save: savePostgresData
    };
  }

  return getDatabaseUrl()
    ? {
        mode: "postgres",
        load: loadPostgresData,
        save: savePostgresData
      }
    : {
        mode: "json",
        load: loadJsonData,
        save: saveJsonData
      };
}

const adapter = createPersistenceAdapter();

async function ensureStoreLoaded() {
  if (cachedData) {
    return cachedData;
  }

  const loaded = await adapter.load();
  cachedData = loaded ?? cloneDefaults();
  if (!loaded) {
    await adapter.save(cachedData);
  }

  return cachedData;
}

export async function getHotelData() {
  return ensureStoreLoaded();
}

export async function updateHotelData<T>(updater: (data: HotelData) => T | Promise<T>) {
  const task = mutationQueue.then(async () => {
    const data = await ensureStoreLoaded();
    const result = await updater(data);
    await adapter.save(data);
    return result;
  });

  mutationQueue = task.then(
    () => undefined,
    () => undefined
  );

  return task;
}

export async function seedPostgresFromJsonSnapshot() {
  const jsonData = (await loadJsonData()) ?? cloneDefaults();
  await savePostgresData(jsonData);
  return jsonData;
}

export function getActivePersistenceMode() {
  return adapter.mode;
}

export type { HotelData, PropertyScoped, PersistedUser } from "./hotelDataTypes";
