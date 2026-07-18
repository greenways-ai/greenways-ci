import test from "node:test";
import assert from "node:assert/strict";
import { parseEnvironmentFiles } from "./load-env-files.mjs";

const contract = {
  required: ["TOKEN", "HOST"],
  optional: ["SITE"],
};

test("parses allowlisted single-line values", () => {
  const values = parseEnvironmentFiles(
    [
      { name: ".env", content: "# comment\nTOKEN='secret=value'\n" },
      { name: "netlify.env", content: 'HOST="example.test"\nSITE=site-id\n' },
    ],
    contract,
  );
  assert.deepEqual(Object.fromEntries(values), {
    TOKEN: "secret=value",
    HOST: "example.test",
    SITE: "site-id",
  });
});

test("rejects duplicates, unexpected variables, and missing required values", () => {
  assert.throws(
    () =>
      parseEnvironmentFiles(
        [{ name: ".env", content: "TOKEN=a\nTOKEN=b\nHOST=host\n" }],
        contract,
      ),
    /more than once/,
  );
  assert.throws(
    () =>
      parseEnvironmentFiles(
        [{ name: ".env", content: "TOKEN=a\nHOST=host\nUNKNOWN=value\n" }],
        contract,
      ),
    /unexpected variable UNKNOWN/,
  );
  assert.throws(
    () => parseEnvironmentFiles([{ name: ".env", content: "TOKEN=a\n" }], contract),
    /HOST is missing/,
  );
});
