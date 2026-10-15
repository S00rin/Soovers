import path from "node:path";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";
import { createApplication } from "./app.mjs";
const root = fileURLToPath(new URL("../local-dist", import.meta.url));
const production = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 8080);
if (production && !process.env.APP_ORIGIN)
  throw new Error("Set APP_ORIGIN to your HTTPS public origin.");
await stat(path.join(root, "index.html"));
const app = await createApplication({
  root,
  database: path.resolve(process.env.DATABASE_PATH || "data/soovers.sqlite"),
  origin: process.env.APP_ORIGIN || `http://127.0.0.1:${port}`,
  production,
  registration: process.env.REGISTRATION_OPEN !== "false",
});
app.server.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(`SooVers Academy 1.0 listening on port ${port}`),
);
app.server.on("error", (error) => {
  console.error(error.message);
  app.db.close();
  process.exitCode = 1;
});
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
