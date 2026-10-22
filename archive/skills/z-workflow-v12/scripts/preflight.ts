import { realpath, readFile, readdir, lstat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { homedir } from "node:os";

function gitProbe(root:string, ...args:string[]) {
  const env={...process.env};
  for(const key of Object.keys(env)) if(key.startsWith("GIT_")) delete env[key];
  env.GIT_OPTIONAL_LOCKS="0";
  return Bun.spawnSync({cmd:["git","--no-optional-locks","-c","core.fsmonitor=false","-C",root,...args],env,stdin:"ignore",stdout:"pipe",stderr:"pipe"});
}
export function gitAt(root:string, ...args:string[]):string {
  const out=gitProbe(root,...args);
  if(out.exitCode) throw new Error("Git: "+out.stderr.toString().trim());
  return out.stdout.toString().trim();
}
export async function locateWorkspace(path:string) {
  const workspaceRoot=await realpath(resolve(path));
  if(!(await lstat(workspaceRoot)).isDirectory()) throw new Error("Workspace must be a directory");
  const repoRoot=await realpath(gitAt(workspaceRoot,"rev-parse","--show-toplevel"));
  const appScope=relative(repoRoot,workspaceRoot);
  const branchRef=gitAt(repoRoot,"symbolic-ref","--quiet","HEAD");
  const baseCommit=gitAt(repoRoot,"rev-parse","--verify","HEAD");
  if(!branchRef.startsWith("refs/heads/")) throw new Error("Checked-out branch required");
  return {workspaceRoot,repoRoot,appScope,branchRef,baseCommit};
}
async function factsOf(roots:string[]) {
  const facts:{path:string;content:string;truncated:boolean}[]=[];
  for(const root of [...new Set(roots)]) for(const name of ["AGENTS.md","TASK.md","package.json","Cargo.toml","pubspec.yaml","components.json"]) {
    try {const file=join(root,name);const stat=await lstat(file);if(stat.isFile()&&!stat.isSymbolicLink()) {const text=await readFile(file,"utf8");facts.push({path:file,content:text.slice(0,16000),truncated:text.length>16000});}}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
  }
  return facts;
}
async function personasOf(roots:string[]) {
  const personas:string[]=[];
  for(const root of [...new Set(roots)]) {
    try {for(const entry of await readdir(root,{withFileTypes:true}))if(entry.isFile()&&entry.name.endsWith(".md"))personas.push(join(root,entry.name));}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
  }
  return personas;
}
export async function preflight(path:string) {
  const workspaceRoot=await realpath(resolve(path));
  if(!(await lstat(workspaceRoot)).isDirectory()) throw new Error("Workspace must be a directory");
  const personaRoots=[join(workspaceRoot,".zcode/agents"),join(homedir(),".zcode/agents")];
  const inside=gitProbe(workspaceRoot,"rev-parse","--is-inside-work-tree");
  if(inside.exitCode!==0||inside.stdout.toString().trim()!=="true")
    return {initialized:false,reason:"no-repo",workspaceRoot,personas:await personasOf(personaRoots),facts:await factsOf([workspaceRoot]),warnings:["Uninitialized workspace (not inside any Git repository): the author may bootstrap it via scripts/bootstrap.ts before preparing a run"]};
  const repoRoot=await realpath(gitAt(workspaceRoot,"rev-parse","--show-toplevel"));
  const appScope=relative(repoRoot,workspaceRoot);
  personaRoots.splice(1,0,join(repoRoot,".zcode/agents"));
  const symbol=gitProbe(repoRoot,"symbolic-ref","--quiet","HEAD");
  const branchRef=symbol.exitCode===0?symbol.stdout.toString().trim():"";
  if(!branchRef.startsWith("refs/heads/")) throw new Error("Detached HEAD on an initialized repository requires a coordinator remedy; bootstrap only targets uninitialized checkouts");
  const head=gitProbe(repoRoot,"rev-parse","--verify","HEAD");
  if(head.exitCode!==0)
    return {initialized:false,reason:"unborn-head",workspaceRoot,repoRoot,appScope,branchRef,personas:await personasOf(personaRoots),facts:await factsOf([workspaceRoot,repoRoot]),warnings:[...(appScope?["Workspace is inside a parent Git checkout; preserve repoRoot anchors and scope app paths under "+appScope]:[]),"Unborn branch (zero commits): the author may bootstrap it via scripts/bootstrap.ts before preparing a run"]};
  const baseCommit=head.stdout.toString().trim();
  const ignored=Bun.spawnSync({cmd:["git","-C",repoRoot,"check-ignore","-q",".zcode/workflow-drafts/probe.json"],stdout:"ignore",stderr:"ignore"}).exitCode===0;
  const clean=!gitAt(repoRoot,"status","--porcelain=v1","--untracked-files=all");
  return {initialized:true,workspaceRoot,repoRoot,appScope,branchRef,baseCommit,clean,draftsIgnored:ignored,draftsRoot:join(repoRoot,".zcode/workflow-drafts"),personas:await personasOf(personaRoots),facts:await factsOf([workspaceRoot,repoRoot]),warnings:[...(appScope?["Workspace is inside a parent Git checkout; preserve repoRoot anchors and scope app paths under "+appScope]:[]),...(!ignored?["Draft directory must be ignored before request creation; do not auto-commit user changes"]:[])]};
}
if(import.meta.main) try{console.log(JSON.stringify(await preflight(process.argv[2]??process.cwd()),null,2));}catch(e){console.error(String(e));process.exitCode=1;}
