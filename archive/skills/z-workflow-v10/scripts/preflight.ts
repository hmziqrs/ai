import { realpath, readFile, readdir, lstat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { homedir } from "node:os";

export function gitAt(root:string, ...args:string[]):string {
  const env={...process.env};
  for(const key of Object.keys(env)) if(key.startsWith("GIT_")) delete env[key];
  env.GIT_OPTIONAL_LOCKS="0";
  const out=Bun.spawnSync({cmd:["git","--no-optional-locks","-c","core.fsmonitor=false","-C",root,...args],env,stdin:"ignore",stdout:"pipe",stderr:"pipe"});
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
export async function preflight(path:string) {
  const found=await locateWorkspace(path);
  const ignored=Bun.spawnSync({cmd:["git","-C",found.repoRoot,"check-ignore","-q",".zcode/workflow-drafts/probe.json"],stdout:"ignore",stderr:"ignore"}).exitCode===0;
  const facts:{path:string;content:string;truncated:boolean}[]=[];
  for(const root of [...new Set([found.workspaceRoot,found.repoRoot])]) for(const name of ["AGENTS.md","TASK.md","package.json","Cargo.toml","pubspec.yaml","components.json"]) {
    try {const file=join(root,name);const stat=await lstat(file);if(stat.isFile()&&!stat.isSymbolicLink()) {const text=await readFile(file,"utf8");facts.push({path:file,content:text.slice(0,16000),truncated:text.length>16000});}}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
  }
  const personas:string[]=[];
  for(const root of [...new Set([join(found.workspaceRoot,".zcode/agents"),join(found.repoRoot,".zcode/agents"),join(homedir(),".zcode/agents")])]) {
    try {for(const entry of await readdir(root,{withFileTypes:true}))if(entry.isFile()&&entry.name.endsWith(".md"))personas.push(join(root,entry.name));}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
  }
  return {...found,clean:!gitAt(found.repoRoot,"status","--porcelain=v1","--untracked-files=all"),draftsIgnored:ignored,draftsRoot:join(found.repoRoot,".zcode/workflow-drafts"),personas,facts,warnings:[...(found.appScope?["Workspace is inside a parent Git checkout; preserve repoRoot anchors and scope app paths under "+found.appScope]:[]),...(!ignored?["Draft directory must be ignored before request creation; do not auto-commit user changes"]:[])]};
}
if(import.meta.main) try{console.log(JSON.stringify(await preflight(process.argv[2]??process.cwd()),null,2));}catch(e){console.error(String(e));process.exitCode=1;}
