import { randomBytes } from "node:crypto";
import { appendFile, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const keyPattern = /^[A-Z][A-Z0-9_]*$/;

function decodeValue(raw) {
  const value = raw.trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseEnvironmentFiles(entries, contract) {
  const allowed = new Set([...contract.required, ...contract.optional]);
  const values = new Map();

  for (const { name, content } of entries) {
    for (const [index, sourceLine] of content.split(/\r?\n/).entries()) {
      const line = sourceLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) {
        throw new Error(`${name}:${index + 1} is not KEY=VALUE syntax.`);
      }
      const key = line.slice(0, separator).trim();
      if (!keyPattern.test(key)) {
        throw new Error(`${name}:${index + 1} has an invalid variable name.`);
      }
      if (!allowed.has(key)) {
        throw new Error(`${name}:${index + 1} contains unexpected variable ${key}.`);
      }
      if (values.has(key)) {
        throw new Error(`${key} is defined more than once.`);
      }
      const value = decodeValue(line.slice(separator + 1));
      if (value.includes("\0") || value.includes("\n") || value.includes("\r")) {
        throw new Error(`${key} must be a single-line value.`);
      }
      values.set(key, value);
    }
  }

  for (const key of contract.required) {
    if (!values.get(key)) throw new Error(`Required variable ${key} is missing or empty.`);
  }
  return values;
}

function mask(value) {
  return value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

async function main() {
  const [directory, contractPath] = process.argv.slice(2);
  const output = process.env.GITHUB_OUTPUT;
  if (!directory || !contractPath || !output) {
    throw new Error("Usage: load-env-files.mjs DIRECTORY CONTRACT with GITHUB_OUTPUT set.");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const names = (await readdir(directory))
    .filter((name) => name === ".env" || name.endsWith(".env"))
    .sort();
  if (names.length === 0) throw new Error(`No environment files found in ${directory}.`);

  const entries = await Promise.all(
    names.map(async (name) => ({
      name,
      content: await readFile(path.join(directory, name), "utf8"),
    })),
  );
  const values = parseEnvironmentFiles(entries, contract);

  for (const [key, value] of values) {
    process.stdout.write(`::add-mask::${mask(value)}\n`);
    const delimiter = `STATSTRADE_${randomBytes(16).toString("hex")}`;
    await appendFile(output, `${key}<<${delimiter}\n${value}\n${delimiter}\n`, {
      mode: 0o600,
    });
  }
  process.stdout.write(`Loaded ${values.size} allowlisted deployment variables.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
