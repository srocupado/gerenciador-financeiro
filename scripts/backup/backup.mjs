import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "out");
const OUT_FILE = join(OUT_DIR, "gerenciador-backup.json");

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT env var is required (JSON content of the service account key).",
    );
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT is not valid JSON: ${e.message}`);
  }
}

function serializeValue(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === "object") {
    if (typeof value.toDate === "function") return value.toDate().toISOString();
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = serializeValue(v);
    return out;
  }
  return value;
}

async function exportUsers(db) {
  const snap = await db.collection("users").get();
  const users = {};
  for (const doc of snap.docs) {
    users[doc.id] = serializeValue(doc.data());
  }
  return users;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const credential = cert(parseServiceAccount());
  const app = initializeApp({ credential });
  const db = getFirestore(app);

  const users = await exportUsers(db);
  const payload = {
    exportedAt: new Date().toISOString(),
    project: app.options.projectId || null,
    count: Object.keys(users).length,
    users,
  };

  const json = JSON.stringify(payload, null, 2);
  const sizeKb = (Buffer.byteLength(json, "utf8") / 1024).toFixed(2);

  console.log(`Exported users: ${payload.count}`);
  console.log(`JSON size: ${sizeKb} KB`);
  console.log(`Project: ${payload.project}`);

  if (dryRun) {
    console.log("[dry-run] skipping file write");
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, json, "utf8");
  console.log(`Wrote ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
