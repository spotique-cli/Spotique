import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");

async function rebrandJavaScript(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await rebrandJavaScript(path);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      const source = await readFile(path, "utf8");
      const rebranded = source.replace(/\bSpicetify\b/g, "Spotique");
      if (source !== rebranded) await writeFile(path, rebranded);
    }
  }
}

await rebrandJavaScript(dist);

const manifestPath = join(dist, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.name = { ...manifest.name, en: "Spotique Marketplace", ru: "Маркетплейс Spotique" };
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
