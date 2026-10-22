// V12: deterministic initialization of an UNINITIALIZED checkout (a workspace inside no Git
// repository, or a repository whose checked-out branch has zero commits). Refuses initialized
// and detached checkouts; never stashes/resets/cleans/checkouts/deletes or forces anything.
// A baseline that would sweep unignored dependency/build directories into history, or that
// contains an embedded repository (a gitlink at best, unindexable at worst), is refused before
// anything is staged: the author adds ignore rules (or reports the nested repository) and
// re-runs; a partial init is resumed, never redone.
import { realpath, readFile, writeFile, lstat } from "node:fs/promises";
import { join, resolve } from "node:path";

const DRAFTS_IGNORE=".zcode/workflow-drafts/";
// Never baseline material. `target` counts only beside a root Cargo.toml.
const DEPENDENCY_DIRS=new Set(["node_modules",".venv","venv","__pycache__",".dart_tool",".gradle","Pods"]);
function git(root:string, ...args:string[]) {
  const env={...process.env};
  for(const key of Object.keys(env)) if(key.startsWith("GIT_")) delete env[key];
  env.GIT_OPTIONAL_LOCKS="0";
  return Bun.spawnSync({cmd:["git","--no-optional-locks","-c","core.fsmonitor=false","-C",root,...args],env,stdin:"ignore",stdout:"pipe",stderr:"pipe"});
}
const out=(result:{stdout:Uint8Array}):string=>result.stdout.toString().trim();
const err=(result:{stderr:Uint8Array}):string=>result.stderr.toString().trim();
function fail(message:string):never {console.error(message);process.exit(1);}
async function exists(path:string):Promise<boolean> {
  try {await lstat(path);return true;}
  catch(e){const code=(e as NodeJS.ErrnoException).code;if(code==="ENOENT"||code==="ENOTDIR")return false;throw e;}
}
// Untracked, non-ignored entries exactly as Git sees them: files individually, and a nested
// repository (with or without commits) as a single "dir/" entry that `git add -A` would either
// record as a gitlink or refuse to index.
function untrackedEntries(root:string):string[] {
  const list=git(root,"ls-files","--others","--exclude-standard","-z");
  if(list.exitCode!==0) fail("git ls-files failed: "+err(list));
  return list.stdout.toString().split("\0").filter((entry)=>entry!=="");
}
async function baselineHazards(root:string):Promise<string[]> {
  const entries=untrackedEntries(root);
  const cargo=await exists(join(root,"Cargo.toml"));
  const dependencies=new Set<string>();
  for(const entry of entries) {
    const segments=entry.split("/");
    for(let i=0;i<segments.length-1;i++) {
      if(DEPENDENCY_DIRS.has(segments[i])||(cargo&&i===0&&segments[i]==="target")) {dependencies.add(segments.slice(0,i+1).join("/")+"/");break;}
    }
  }
  const flagged=[...dependencies].sort();
  const embedded=entries.filter((entry)=>entry.endsWith("/")&&!flagged.some((prefix)=>entry.startsWith(prefix))).sort();
  const hazards:string[]=[];
  if(flagged.length) hazards.push("unignored dependency/build directories would enter the baseline: "+flagged.join(", "));
  if(embedded.length) hazards.push("embedded Git repositories cannot be baselined (gitlink or unindexable): "+embedded.join(", "));
  return hazards;
}

async function main() {
  const [workspaceArg,...extra]=process.argv.slice(2);
  if(!workspaceArg||extra.length) fail("Usage: bun --no-env-file --config=/dev/null bootstrap.ts <workspace>");
  const workspace=await realpath(resolve(workspaceArg));
  if(!(await lstat(workspace)).isDirectory()) fail("Workspace must be a directory");
  let repoRoot=workspace, mustInit=false;
  const inside=git(workspace,"rev-parse","--is-inside-work-tree");
  if(inside.exitCode!==0||out(inside)!=="true") mustInit=true;
  else {
    repoRoot=await realpath(out(git(workspace,"rev-parse","--show-toplevel")));
    const symbol=git(repoRoot,"symbolic-ref","--quiet","HEAD");
    const branchRef=symbol.exitCode===0?out(symbol):"";
    if(!branchRef.startsWith("refs/heads/")) fail("detached HEAD requires a coordinator remedy; refusing to bootstrap: "+workspace);
    if(git(repoRoot,"rev-parse","--verify","HEAD").exitCode===0) fail("already initialized; V12 bootstrap only targets uninitialized checkouts: "+repoRoot);
  }
  if(mustInit) {
    const defaultBranch=out(git(workspace,"config","--get","init.defaultBranch"));
    const init=git(workspace,"init",...(defaultBranch?[]:["-b","main"]));
    if(init.exitCode!==0) fail("git init failed: "+err(init));
    repoRoot=await realpath(out(git(workspace,"rev-parse","--show-toplevel")));
  }
  let gitignoreTouched=false;
  if(git(repoRoot,"check-ignore","-q",DRAFTS_IGNORE+"probe.json").exitCode!==0) {
    const gitignore=join(repoRoot,".gitignore");
    let existing="";
    try {existing=await readFile(gitignore,"utf8");}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
    await writeFile(gitignore,(existing===""||existing.endsWith("\n")?existing:existing+"\n")+DRAFTS_IGNORE+"\n");
    gitignoreTouched=true;
  }
  const hazards=await baselineHazards(repoRoot);
  if(hazards.length) fail("refusing baseline commit — "+hazards.join("; ")+". Add ignore rules for dependency/build directories, or report the embedded repository to the coordinator, then re-run bootstrap; it resumes from the current state and redoes nothing.");
  const add=git(repoRoot,"add","-A");
  if(add.exitCode!==0) fail("git add failed: "+err(add));
  const commit=git(repoRoot,"commit","--allow-empty","-m","V12: initialize project baseline");
  if(commit.exitCode!==0) fail("baseline commit failed: "+err(commit));
  const status=git(repoRoot,"status","--porcelain=v1","--untracked-files=all");
  if(status.exitCode!==0||out(status)!=="") fail("verification failed: checkout is not clean after bootstrap");
  const symbol=git(repoRoot,"symbolic-ref","--quiet","HEAD");
  const branchRef=symbol.exitCode===0?out(symbol):"";
  if(!branchRef.startsWith("refs/heads/")) fail("verification failed: HEAD is not on a branch after bootstrap");
  if(git(repoRoot,"check-ignore","-q",DRAFTS_IGNORE+"probe.json").exitCode!==0) fail("verification failed: workflow drafts are not Git-ignored after bootstrap");
  console.log(JSON.stringify({repoRoot,branchRef,baseCommit:out(git(repoRoot,"rev-parse","--verify","HEAD")),initialized:true,gitignoreTouched}));
}
if(import.meta.main) try{await main();}catch(e){console.error(String(e));process.exitCode=1;}
