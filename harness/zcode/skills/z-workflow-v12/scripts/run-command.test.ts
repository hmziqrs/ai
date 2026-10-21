import {expect,test} from 'bun:test';
import {mkdtemp,writeFile,mkdir,readFile,rm,symlink} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
const helper=resolve(import.meta.dir,'run-command.ts');
function git(cwd:string,...args:string[]){const r=Bun.spawnSync(['git',...args],{cwd,stdout:'pipe',stderr:'pipe'});expect(r.exitCode).toBe(0);}
test('command wrapper records real success/failure without rerunning the child or changing source',async()=>{
 const cwd=await mkdtemp(join(tmpdir(),'v12-command-'));
 try{
  git(cwd,'init');await writeFile(join(cwd,'.gitignore'),'.zcode/workflow-drafts/\n');await writeFile(join(cwd,'child.ts'),'console.log("actual output"); process.exitCode=Number(process.argv[2]);');
  for(const code of [0,3]){const r=Bun.spawnSync([process.execPath,'--no-env-file','--config=/dev/null',helper,process.execPath,JSON.stringify(['--no-env-file','--config=/dev/null','child.ts',String(code)]),'probe'],{cwd,stdout:'pipe',stderr:'pipe'});expect(r.exitCode).toBe(code);}
  const records=(await readFile(join(cwd,'.zcode/workflow-drafts/v12-evidence/probe.jsonl'),'utf8')).trim().split('\n').map(s=>JSON.parse(s));expect(records.map(r=>r.exitCode)).toEqual([0,3]);expect(records[0].stdout).toContain('actual output');expect(await readFile(join(cwd,'child.ts'),'utf8')).toContain('console.log');
 }finally{await rm(cwd,{recursive:true,force:true});}
});
test('unignored evidence and symlink outputs fail before executing a command',async()=>{
 const cwd=await mkdtemp(join(tmpdir(),'v12-command-'));
 try{
  git(cwd,'init');const run=()=>Bun.spawnSync([process.execPath,'--no-env-file','--config=/dev/null',helper,process.execPath,JSON.stringify(['--version']),'probe'],{cwd,stdout:'pipe',stderr:'pipe'});
  expect(run().exitCode).not.toBe(0);await writeFile(join(cwd,'.gitignore'),'.zcode/workflow-drafts/\n');const evidence=join(cwd,'.zcode/workflow-drafts/v12-evidence');await mkdir(evidence,{recursive:true});const target=join(cwd,'untouched');await writeFile(target,'keep');await symlink(target,join(evidence,'probe.jsonl'));expect(run().exitCode).not.toBe(0);expect(await readFile(target,'utf8')).toBe('keep');
 }finally{await rm(cwd,{recursive:true,force:true});}
});
