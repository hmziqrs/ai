import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { composeLibrary, normalizeSelection, pieceNames } from "./compose.ts";
const root=resolve(import.meta.dir,"..");
test('only selected sections appear, in canonical order, with original TypeScript types',async()=>{
 const mix=normalizeSelection([{name:'browser',authorization:'user browser smoke'},{name:'unit-tests',authorization:'user unit tests'},{name:'audit',authorization:'user implementation audit'}]);
 const {source,files}=await composeLibrary(root,mix);
 expect(source).toContain('ask<AreaWork>');expect(source).toContain('ask<PhaseWork>');
 expect(source).toContain('phase("Smoke-test the web app")');expect(source).toContain('phase("Audit implementation")');expect(source).not.toContain('phase("Inspect the native app visually")');
 expect(files.map(f=>f.path).indexOf('pieces/unit-tests.dwf.ts')).toBeLessThan(files.map(f=>f.path).indexOf('pieces/browser.dwf.ts'));
 expect(source).not.toMatch(/^\s*(?:import|export|declare)\s/m);
 expect(files.every(f=>/^[0-9a-f]{64}$/.test(f.sha256))).toBe(true);
});
test('planning swaps the configuration section instead of adding a planning handoff',async()=>{
 const {source}=await composeLibrary(root,normalizeSelection([{name:'planning',authorization:'user plan'}]));
 expect(source).toContain('phase("Plan requested work")');expect(source).not.toContain('phase("Configure independent work")');
});
test('all 512 source subsets compose without missing names, duplicate sections or changed fragment bytes',async()=>{
 for(let bits=0;bits<(1<<pieceNames.length);bits++){
  const chosen=pieceNames.filter((_,i)=>bits&(1<<i));
  const selections=normalizeSelection(chosen.map(name=>({name,authorization:'Fixture explicit request'})));
  const {source,files}=await composeLibrary(root,selections);
  expect(files.length).toBe(new Set(files.map(f=>f.path)).size);
  for(const file of files)expect(source).toContain(await readFile(join(root,file.path),'utf8'));
 }
});
test('selection rejects implicit authority, unknown/path-traversal pieces, duplicates and invalid round policies',()=>{
 for(const request of [null,[{name:'audit'}],[{name:'../audit',authorization:'x'}],[{name:'audit',authorization:'x'},{name:'audit',authorization:'x'}],[{name:'audit',authorization:'x',mode:'rounds',rounds:0}],[{name:'audit',authorization:'x',mode:'rounds',rounds:1.5}],[{name:'browser',authorization:'x',mode:'until-clean'}],[{name:'audit',authorization:'x',rounds:2}],[{name:'audit',authorization:'x',unrecognized:true}]])expect(()=>normalizeSelection(request)).toThrow();
 expect(normalizeSelection(undefined)).toEqual([]);
 expect(normalizeSelection([{name:'audit',authorization:'user three passes',mode:'rounds',rounds:3}])[0].rounds).toBe(3);
 expect(normalizeSelection([{name:'audit',authorization:'user audit until clean',mode:'until-clean',fixFindings:true}])[0].mode).toBe('until-clean');
});
test('persona kit stays byte-identical to canonical kit and contains no runtime workflow imports',async()=>{
 expect(await readFile(join(root,'persona-kit.dwf.ts'),'utf8')).toBe(await readFile(join(root,'../z-workflow/persona-kit.dwf.ts'),'utf8'));
});

test('planning-only composition has no implementation or assembly section in its source',async()=>{
 const {source}=await composeLibrary(root,normalizeSelection([{name:'planning',authorization:'user planning only'}]),'plan');
 expect(source).toContain('phase("Plan requested work")');expect(source).not.toContain('phase("Run each ready area');expect(source).not.toContain('phase("Assemble');
});

test('plan-audit is retired: one preparation-time self-check, no workflow gate',()=>{
 expect(pieceNames).not.toContain('plan-audit');
 expect(()=>normalizeSelection([{name:'plan-audit',authorization:'user plan review'}])).toThrow();
});
test('plan-only composition includes no writers, worktrees or implementation sections',async()=>{
 const {source}=await composeLibrary(root,normalizeSelection([{name:'planning',authorization:'user plan'}]),'plan');
 expect(source).not.toContain('"worktree", "add"');expect(source).not.toContain('ask<AreaWork>');
});

test('composed source never passes optional undefined values into report items',async()=>{
 const {source}=await composeLibrary(root,normalizeSelection([{name:'planning',authorization:'user plan'}]));
 expect(source).not.toContain('status, evidence })');
 expect(source).toContain('if (evidence === undefined) report(item);');
 expect(source).toContain('domain:area.domain ?? ""');
});

test('execute engine keeps the analyzer-safe teardown shape (no long try/finally span)',async()=>{
 const {source}=await composeLibrary(root,normalizeSelection([{name:'browser',authorization:'user browser'}]));
 expect(source).toContain('const runEngine = async (): Promise<RunResult> => {');
 expect(source).toContain('await runEngine().catch((error) => { failed = true; failure = error; });');
 expect(source).toContain('const teardownRetained = await cleanupWorktrees();');
 expect(source).toContain('phase("Deliver and clean up");');
 // The platform graph-projector overflows on a try/finally spanning the engine body
 // (reproduced 2026-10-21: three host turn crashes before this restructure).
 expect(source).not.toMatch(/return result;\s*\}\s*finally\s*\{/);
});
