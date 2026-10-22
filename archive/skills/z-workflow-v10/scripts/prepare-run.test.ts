import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { preflight } from './preflight.ts';
const root=resolve(import.meta.dir,'..');const dirs:string[]=[];
afterEach(async()=>{for(const d of dirs.splice(0))await rm(d,{recursive:true,force:true});});
function git(cwd:string,args:string[]){const r=Bun.spawnSync({cmd:['git',...args],cwd,stdout:'pipe',stderr:'pipe'});if(r.exitCode)throw new Error(r.stderr.toString());return r.stdout.toString().trim();}
async function fixture(){const dir=await mkdtemp(join(tmpdir(),'zv10 preparation '));dirs.push(dir);const repo=join(dir,'repo');await mkdir(repo);git(repo,['init','-b','main']);git(repo,['config','user.name','Fixture']);git(repo,['config','user.email','fixture@example.invalid']);await writeFile(join(repo,'README.md'),'seed');await writeFile(join(repo,'.gitignore'),'.zcode/workflow-drafts/\n');git(repo,['add','.']);git(repo,['commit','-m','seed']);const drafts=join(repo,'.zcode/workflow-drafts');await mkdir(drafts,{recursive:true});return {dir,repo,drafts,request:join(drafts,'request.json'),output:join(drafts,'run.dwf.ts'),head:git(repo,['rev-parse','HEAD'])};}
function request(f:any,extra:any={}){return {repoRoot:f.repo,task:'Implement',requirements:{minimumAreas:1},plan:{sharedContract:'Own src',areas:[{id:'app',title:'App',personaPath:join(root,'personas/workflow-author-v10.md'),ownedPaths:['src'],dependsOn:[],instructions:'Implement app',setup:[],assembly:[],phases:(extra.pieces??[]).filter((p:any)=>!['planning'].includes(p.name)).map((p:any)=>({id:p.name,kind:p.name,commands:[],personaPath:join(root,'personas/workflow-author-v10.md'),instructions:p.authorization}))}],setup:[],assembly:[],blockers:[],notes:[]},...extra};}
function prepare(request:string,output:string){const r=Bun.spawnSync({cmd:[process.execPath,'--no-env-file','--config=/dev/null',join(root,'scripts/prepare-run.ts'),request,output],stdout:'pipe',stderr:'pipe',stdin:'ignore'});return {code:r.exitCode,text:r.stdout.toString()+r.stderr.toString()};}
test('launcher captures anchors, composes only requested pieces, keeps task data inert and checks once',async()=>{
 const f=await fixture();const task='User text `$(touch /tmp/do-not-run)` "; throw new Error("injected"); //';
 await writeFile(f.request,JSON.stringify(request(f,{task,pieces:[{name:'audit',authorization:'user implementation audit'}]})));
 const r=prepare(f.request,f.output);expect(r.text).toContain('Strict facade check passed');expect(r.code).toBe(0);expect(r.text.match(/Strict facade check passed/g)?.length).toBe(1);
 const s=await readFile(f.output,'utf8');expect(s).toContain(JSON.stringify(task));expect(s).toContain('phase("Audit implementation")');expect(s).not.toContain('phase("Smoke-test the web app")');expect(s).toContain(f.head);expect(git(f.repo,['status','--porcelain'])).toBe('');
});
test('launcher refuses dirty checkout and symlink/unowned output without modifying product files',async()=>{
 const f=await fixture();await writeFile(f.request,JSON.stringify(request(f)));await writeFile(join(f.repo,'README.md'),'user edit');expect(prepare(f.request,f.output).text).toContain('must be clean');git(f.repo,['checkout','--','README.md']);
 const target=join(f.dir,'keep.txt');await writeFile(target,'keep');await symlink(target,f.output);expect(prepare(f.request,f.output).code).not.toBe(0);expect(await readFile(target,'utf8')).toBe('keep');
});
test('changed generated drafts are preserved and planning mode rejects implementation checks',async()=>{
 const f=await fixture();await writeFile(f.request,JSON.stringify(request(f)));expect(prepare(f.request,f.output).code).toBe(0);await writeFile(f.output,(await readFile(f.output,'utf8'))+'\n// manual repair\n');expect(prepare(f.request,f.output).text).toContain('Refusing to overwrite');
 await writeFile(f.request,JSON.stringify(request(f,{mode:'plan',pieces:[{name:'browser',authorization:'x'}]})));expect(prepare(f.request,join(f.drafts,'plan.dwf.ts')).code).not.toBe(0);
});
test('nested workspace resolves its parent git root in preflight and embedded input',async()=>{
 const f=await fixture(),nested=join(f.repo,'nested app');await mkdir(nested);const facts=await preflight(nested);expect(facts.repoRoot).toBe(await realpath(f.repo));expect(facts.appScope).toBe('nested app');expect(facts.draftsIgnored).toBe(true);
 await writeFile(f.request,JSON.stringify(request(f,{repoRoot:nested})));const r=prepare(f.request,f.output);expect(r.code).toBe(0);const source=await readFile(f.output,'utf8');expect(source).toContain(JSON.stringify(await realpath(f.repo)));expect(source).toContain('"workspaceRoot":'+JSON.stringify(await realpath(nested)));
});
test('omitted selected checks and nonexistent personas fail before a runnable draft',async()=>{
 const f=await fixture();const data=request(f,{pieces:[{name:'audit',authorization:'User audit'}]});data.plan.areas[0].phases=[];await writeFile(f.request,JSON.stringify(data));expect(prepare(f.request,f.output).text).toContain('Requested piece omitted');
 data.pieces=[];data.plan.areas[0].personaPath='/no/such/agent.md';await writeFile(f.request,JSON.stringify(data));expect(prepare(f.request,f.output).code).not.toBe(0);
});
test('explicit minimum implementation areas cannot be satisfied with fake verification area counts',async()=>{
 const f=await fixture();await writeFile(f.request,JSON.stringify(request(f,{requirements:{minimumAreas:4}})));expect(prepare(f.request,f.output).text).toContain('at least 4 implementation areas');
});
