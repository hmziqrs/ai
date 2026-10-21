import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export interface Selection {
  name: string;
  authorization: string;
  mode: "once" | "rounds" | "until-clean";
  rounds: number;
  fixFindings: boolean;
}
export const pieceNames = ["planning", "unit-tests", "audit", "browser", "native-vision", "mobile-vision"] as const;
export function normalizeSelection(value: unknown): Selection[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("pieces must be an array of authorized selections");
  const seen = new Set<string>();
  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("piece selection must be an object");
    const data = entry as Record<string, unknown>;
    if (Object.keys(data).some((key) => !["name", "authorization", "mode", "rounds", "fixFindings"].includes(key))) throw new Error("Unknown piece selection field");
    const name = data.name as string;
    if (!pieceNames.includes(name as typeof pieceNames[number]) || seen.has(name)) throw new Error("Unknown or duplicate piece: " + name);
    seen.add(name);
    if (typeof data.authorization !== "string" || !data.authorization.trim()) throw new Error("Each piece requires the user's explicit authorization text");
    const mode = data.mode ?? (data.fixFindings && name === "unit-tests" ? "until-clean" : "once");
    if (!["once", "rounds", "until-clean"].includes(mode as string)) throw new Error("Unknown round policy");
    const rounds = data.rounds ?? 1;
    if (!Number.isSafeInteger(rounds) || Number(rounds) <= 0 || (mode !== "rounds" && data.rounds !== undefined)) throw new Error("rounds must be a positive integer supplied only with mode rounds");
    if (data.fixFindings !== undefined && typeof data.fixFindings !== "boolean") throw new Error("fixFindings must be boolean");
    if (name !== "audit" && name !== "unit-tests" && (mode !== "once" || data.fixFindings)) throw new Error(name + " is a one-pass observation piece; use owner-scoped follow-up for findings");
    if (name === "planning" && data.fixFindings) throw new Error("planning does not authorize an audit or correction campaign");
    return { name, authorization: data.authorization, mode: mode as Selection["mode"], rounds: Number(rounds), fixFindings: data.fixFindings === true };
  });
}
export async function composeLibrary(root: string, selections: Selection[], mode: "execute" | "plan" = "execute"): Promise<{ source: string; files: { path: string; sha256: string }[] }> {
  const planning = selections.some((piece) => piece.name === "planning");
  const selected = pieceNames.filter((name) => name !== "planning" && selections.some((piece) => piece.name === name));
  const paths = mode === "plan" ? ["fragments/core-before-config.dwf.ts", "pieces/planning.dwf.ts", "fragments/planning-body.dwf.ts"] : ["fragments/core-before-config.dwf.ts", planning ? "pieces/planning.dwf.ts" : "pieces/configure.dwf.ts", "fragments/core-before-checks.dwf.ts", ...selected.map((name) => "pieces/" + name + ".dwf.ts"), "fragments/core-after-checks.dwf.ts"];

  const contents = await Promise.all(paths.map((path) => readFile(join(resolve(root), path), "utf8")));
  return { source: contents.join("\n"), files: paths.map((path, index) => ({ path, sha256: createHash("sha256").update(contents[index]).digest("hex") })) };
}
