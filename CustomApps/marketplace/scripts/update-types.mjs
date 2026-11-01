import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const source = await readFile(resolve(root, "../../../globals.d.ts"), "utf8");
const spotiqueTypes = source.replace(/\ndeclare const Spicetify: typeof Spotique;\s*$/, "");
await writeFile(resolve(root, "../src/types/spotique.d.ts"), spotiqueTypes);
