// Fails if the HTML report holds a credential or a session token, so it is safe to publish.
// The report keeps its test data in a zip inside index.html, and attachments under data/.
// Prints only which secret matched and where, never the value.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = process.argv[2] ?? "playwright-report";
const secrets = ["E2E_USER_EMAIL", "E2E_USER_PASSWORD", "E2E_LOGIN_USER_EMAIL", "E2E_LOGIN_USER_PASSWORD"]
  .map((name): [string, string] => [name, process.env[name] ?? ""])
  .filter(([, value]) => value !== "");
if (secrets.length < 4) throw new Error("Set all four E2E_* variables: the check needs the values it looks for.");
const patterns: [string, RegExp][] = [
  ["token", /eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/],
  ["session cookie value", /sb-[a-z0-9]+-auth-token[^\n]{0,40}base64-/],
];

const sources: [string, string][] = [];
const html = readFileSync(join(dir, "index.html"), "utf8");
sources.push(["index.html", html]);
const embedded = html.match(/data:application\/zip;base64,([A-Za-z0-9+/=]+)/)?.[1];
// Without it there is nothing to check, which must not read as clean.
if (!embedded) throw new Error(`No embedded report data in ${dir}/index.html: the report format changed.`);
const zip = join(mkdtempSync(join(tmpdir(), "report-")), "report.zip");
writeFileSync(zip, Buffer.from(embedded, "base64"));
sources.push(["embedded report data", execFileSync("unzip", ["-p", zip], { maxBuffer: 1 << 30 }).toString("utf8")]);
const walk = (path: string): string[] =>
  statSync(path).isDirectory() ? readdirSync(path).flatMap((f) => walk(join(path, f))) : [path];
for (const file of walk(dir))
  if (file !== join(dir, "index.html")) sources.push([file, readFileSync(file).toString("latin1")]);

const leaks: string[] = [];
for (const [where, text] of sources) {
  for (const [name, value] of secrets) if (text.includes(value)) leaks.push(`${name} in ${where}`);
  for (const [name, pattern] of patterns) if (pattern.test(text)) leaks.push(`${name} in ${where}`);
}
if (leaks.length) {
  console.error(`Not safe to publish:\n${leaks.map((l) => `  ${l}`).join("\n")}`);
  process.exit(1);
}
console.log(`Report checked: ${sources.length} sources, no credentials or session tokens.`);
