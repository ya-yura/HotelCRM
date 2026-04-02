import { seedPostgresFromJsonSnapshot } from "../services/dataStore";

async function run() {
  const data = await seedPostgresFromJsonSnapshot();
  process.stdout.write(
    `Seeded PostgreSQL with ${data.properties.length} properties, ${data.users.length} users, ${data.reservations.length} reservations.\n`
  );
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
