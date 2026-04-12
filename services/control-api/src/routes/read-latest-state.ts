import { readFileSync } from "node:fs";

export function readLatestState(statePath: string): unknown {
  const raw = readFileSync(statePath, "utf8");
  const sanitized = raw.replace(/^\uFEFF/, "");

  return JSON.parse(sanitized);
}
