import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
const root=resolve(import.meta.dir,'..');const dirs:string[]=[];
afterEach(async()=>{for(const d of dirs.splice(0))await rm(d,{recursive:true,force:true});});
function git(cwd:string,args:string[]){const r=Bun.spawnSync({cmd:['git',...args],cwd,stdout:'pipe',stderr:'pipe'});if(r.exitCode)throw new Error(r.stderr.toString());return r.stdout.toString().trim();}
async function fixture(){const dir=await mkdtemp(join(tmpdir(),'zv8 preparation '));dirs.push(dir);const repo=join(dir,'repo');await mkdir(repo);git(repo,['init','-b','main']);git(repo,['config','user.name','Fixture']);git(repo,['config','user.email','fixture@example.invalid']);await writeFile(join(repo,'README.md'),'seed');await writeFile(join(repo,'.gitignore'),'.zcode/workflow-drafts/\n');git(repo,['add','.']);git(repo,['commit','-m','seed']);const drafts=join(repo,'.zcode/workflow-drafts');await mkdir(drafts,{recursive:true});const request=join(drafts,'request.json'),output=join(drafts,'run.dwf.ts');return {dir,repo,drafts,request,output,head:git(repo,['rev-parse','HEAD'])};}
function prepare(request:string,output:string){const r=Bun.spawnSync({cmd:[process.execPath,'--no-env-file','--config=/dev/null',join(root,'scripts/prepare-run.ts'),request,output],stdout:'pipe',stderr:'pipe',stdin:'ignore'});return {code:r.exitCode,text:r.stdout.toString()+r.stderr.toString()};}
test('launcher captures anchors, composes only requested pieces, keeps task data inert and checks once',async()=>{
 const f=await fixture();const task='User text `$(touch /tmp/do-not-run)` "; throw new Error("injected"); //';
 await writeFile(f.request,JSON.stringify({repoRoot:f.repo,task,pieces:[{name:'audit',authorization:'user implementation audit'}]}));
 const r=prepare(f.request,f.output);expect(r.code).toBe(0);expect(r.text.match(/Strict facade check passed/g)?.length).toBe(1);
 const s=await readFile(f.output,'utf8');expect(s).toContain(JSON.stringify(task));expect(s).toContain('phase("Audit implementation")');expect(s).not.toContain('phase("Smoke-test the web app")');expect(s).toContain(f.head);expect(git(f.repo,['status','--porcelain'])).toBe('');
});
test('launcher refuses dirty checkout and symlink/unowned output without modifying product files',async()=>{
 const f=await fixture();await writeFile(f.request,JSON.stringify({repoRoot:f.repo,task:'Implement'}));await writeFile(join(f.repo,'README.md'),'user edit');expect(prepare(f.request,f.output).text).toContain('must be clean');git(f.repo,['checkout','--','README.md']);
 const target=join(f.dir,'keep.txt');await writeFile(target,'keep');await symlink(target,f.output);expect(prepare(f.request,f.output).code).not.toBe(0);expect(await readFile(target,'utf8')).toBe('keep');
});
test('changed generated drafts are preserved and planning mode rejects implementation checks',async()=>{
 const f=await fixture();await writeFile(f.request,JSON.stringify({repoRoot:f.repo,task:'Implement'}));expect(prepare(f.request,f.output).code).toBe(0);await writeFile(f.output,(await readFile(f.output,'utf8'))+'\n// manual repair\n');expect(prepare(f.request,f.output).text).toContain('Refusing to overwrite');
 await writeFile(f.request,JSON.stringify({repoRoot:f.repo,task:'Plan',mode:'plan',pieces:[{name:'browser',authorization:'x'}]}));expect(prepare(f.request,join(f.drafts,'plan.dwf.ts')).code).not.toBe(0);
});
