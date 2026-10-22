import { mkdir, open, lstat, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { constants } from 'node:fs';
import { gitAt } from './preflight.ts';

// An external evidence boundary keeps command output out of the analyzer's shared
// symbolic state. The JSONL is actual execution output, not model-authored evidence.
async function main() {
 const [tool,encoded,tag='gates',...extra]=process.argv.slice(2);
 if(extra.length||!tool||!/^[A-Za-z0-9_./+-]+$/.test(tool)||/(^|\/)git$/.test(tool)||! /^[a-z][a-z0-9-]*$/.test(tag)) throw Error('Invalid engine command or evidence ID');
 const args:unknown=JSON.parse(encoded);
 if(!Array.isArray(args)||args.some(a=>typeof a!=='string'||a.includes('\0')))throw Error('Expected string argv');
 const cwd=await realpath(process.cwd()),drafts=join(cwd,'.zcode/workflow-drafts');
 try {gitAt(cwd,'check-ignore','--quiet','--',join(drafts,'v12-evidence',tag+'.jsonl'));} catch {throw Error('Engine evidence must be Git-ignored before command execution');}
 await mkdir(drafts,{recursive:true});
 if(await realpath(drafts)!==drafts)throw Error('Evidence directory must not traverse symlinks');
 const directory=join(drafts,'v12-evidence');await mkdir(directory,{recursive:true});
 if(await realpath(directory)!==directory)throw Error('Evidence directory must not traverse symlinks');
 const path=join(directory,tag+'.jsonl');
 try {const stat=await lstat(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1)throw Error('Unsafe evidence file');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 const file=await open(path,constants.O_APPEND|constants.O_CREAT|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);
 try {
  if((await file.stat()).nlink!==1)throw Error('Unsafe linked evidence file');
  const startedAt=new Date().toISOString();
  const child=Bun.spawnSync({cmd:[tool,...args as string[]],cwd,stdin:'ignore',stdout:'pipe',stderr:'pipe'});
  const stdout=child.stdout.toString(),stderr=child.stderr.toString();
  await file.write(JSON.stringify({tool,args,cwd,startedAt,completedAt:new Date().toISOString(),exitCode:child.exitCode,stdout:stdout.slice(-18000),stderr:stderr.slice(-12000)})+'\n');
  process.stdout.write(stdout);process.stderr.write(stderr);process.exitCode=child.exitCode??1;
 } finally {await file.close();}
}
try{await main();}catch(e){console.error(String(e));process.exitCode=1;}
