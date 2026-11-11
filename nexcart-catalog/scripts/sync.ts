/**
 * CLI wrapper — runs the catalog sync from the terminal.
 * Usage: npm run sync
 *
 * .env.local is loaded automatically via tsx --env-file .env.local
 */

import { runSync } from "../src/lib/catalog-sync";

runSync()
  .then(({ message }) => {
    console.log(message);
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error("Catalog sync failed:", err);
    process.exit(1);
  });
