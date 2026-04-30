import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations, runWipe } from "./migrate";

const port = Number(process.env["PORT"] ?? 3000);

async function main() {
  await runMigrations();
  if (process.env["WIPE_ON_START"] === "true") {
    await runWipe();
  }
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal error during startup");
  process.exit(1);
});
