import { fetchHistoricalPrice } from "../lib/fetch-historical-price.ts";

const payload = await fetchHistoricalPrice();
// Fall back to a shape the conclusions page can still destructure when the
// Alchemy key is absent: { data: [] } disables the Historical preset without
// failing the build.
process.stdout.write(
  JSON.stringify(payload ?? { data: [], fetchedAt: new Date().toISOString() }),
);
