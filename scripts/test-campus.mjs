import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {Vector3} from 'three';
const out=path.resolve('.sites-runtime/campus-tests');fs.mkdirSync(out,{recursive:true});
const compile=(input,output,replace=[])=>{let code=fs.readFileSync(input,'utf8');for(const [a,b]of replace)code=code.replaceAll(a,b);fs.writeFileSync(path.join(out,output),ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);};
compile('lib/education/model.ts','model.mjs');compile('components/education/SpatialCampus.ts','scene.mjs',[["@/lib/education/model","./model.mjs"]]);
const {TrainingSession,canEnter,moveWithCollision,spaces}=await import(pathToFileURL(path.join(out,'model.mjs')));
const state=new TrainingSession();assert.equal(canEnter('reception',state.role),true);assert.equal(canEnter('gallery',state.role),true);assert.equal(canEnter('education',state.role),false);assert.equal(state.beginIncident(),false);assert.equal(state.solveCTF('SOOVERS{198.51.100.23}'),false);
state.setRole('student');for(const room of Object.keys(spaces))assert.equal(canEnter(room,state.role),true);
assert.equal(state.contain('block-source'),false);assert.equal(state.review('preserve-evidence'),false);assert.equal(state.beginIncident(),true);assert.equal(state.identify('10.10.0.31'),false);assert.equal(state.phase,'alert');assert.equal(state.score,0);assert.equal(state.identify('198.51.100.23'),true);assert.equal(state.contain('delete-logs'),false);assert.equal(state.phase,'identified');assert.equal(state.contain('block-source'),true);assert.equal(state.review('preserve-evidence'),true);assert.equal(state.solveCTF('wrong'),false);assert.equal(state.solveCTF(' SOOVERS{198.51.100.23} '),true);assert.equal(state.quiz('verify'),true);assert.equal(state.score,100);
state.solveCTF('SOOVERS{198.51.100.23}');state.quiz('verify');state.beginIncident();state.identify('198.51.100.23');state.contain('block-source');state.review('preserve-evidence');assert.equal(state.score,100);assert.equal(new Set(state.report().completed).size,5);assert.equal(state.report().mode,'single-user-local-demo');
assert.equal(state.route(['endpoint','firewall','siem']),true);assert.equal(state.route(['siem','endpoint','firewall']),false);
const box=[{minX:-1,maxX:1,minZ:-1,maxZ:1}];const blocked=moveWithCollision(-1.4,0,.2,0,box);assert.equal(blocked.x,-1.4);const slide=moveWithCollision(-1.4,0,.2,.2,box);assert.equal(slide.x,-1.4);assert.equal(slide.z,.2);assert.equal(moveWithCollision(15.4,0,1,0,[]).x,15.5);
// Real Three.js scene graph with a no-op canvas drawing context; not a GPU/browser visual test.
const context=new Proxy({measureText:t=>({width:t.length*14})},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});
globalThis.document={createElement:tag=>{assert.equal(tag,'canvas');return {width:0,height:0,getContext:()=>context};}};
const {SpatialCampus}=await import(pathToFileURL(path.join(out,'scene.mjs')));
const counts={};for(const room of Object.keys(spaces)){
 const scene=new SpatialCampus(room);scene.group.updateMatrixWorld(true);assert.ok(scene.targets.length>0);assert.ok(scene.obstacles.every(b=>b.minX<b.maxX&&b.minZ<b.maxZ));assert.deepEqual(moveWithCollision(scene.spawn.x,scene.spawn.z,0,0,scene.obstacles),{x:scene.spawn.x,z:scene.spawn.z});
 let meshes=0;scene.group.traverse(o=>{if(o.isMesh){meshes++;assert.ok(o.position.toArray().every(Number.isFinite));}});counts[room]=meshes;
 // Flood-fill accessible floor cells; every interactive surface needs a reachable approach.
 const visited=new Set(),queue=[[0,10]],reachable=[];const free=(x,z)=>!scene.obstacles.some(b=>x>b.minX-.33&&x<b.maxX+.33&&z>b.minZ-.33&&z<b.maxZ+.33);
 for(let cursor=0;cursor<queue.length;cursor++){const [x,z]=queue[cursor],key=x+','+z;if(visited.has(key)||Math.abs(x)>15||Math.abs(z)>12||!free(x,z))continue;visited.add(key);reachable.push([x,z]);for(const [dx,dz]of [[.5,0],[-.5,0],[0,.5],[0,-.5]])if(!visited.has((x+dx)+','+(z+dz)))queue.push([x+dx,z+dz]);}
 assert.ok(reachable.length>100,room+' should have free circulation');
 for(const target of scene.targets){const position=target.getWorldPosition(new Vector3());assert.ok(reachable.some(([x,z])=>Math.hypot(x-position.x,z-position.z)<4),room+' reachable approach to '+target.userData.action.id);const action=target.userData.action;assert.ok(action.id&&action.label);if(action.id.startsWith('nav:'))assert.ok(spaces[action.id.slice(4)]);}
 if(room==='classroom'){assert.ok(scene.targets.some(t=>t.userData.action.id==='whiteboard'));assert.ok(scene.targets.some(t=>t.userData.action.id==='lesson'));scene.setSlide(2);scene.setWhiteboard({});}
 if(room==='lab'||room==='soc'){for(const p of ['idle','alert','identified','contained','reviewed']){scene.setIncident(p);scene.update(20,false);}}
 scene.setScore(100);scene.update(0,true);scene.dispose();assert.equal(scene.group.children.length,0);
}
console.log('PASS: visitor/student access, complete learning sequence, wrong answers, idempotent 100-point scoring, report, collision, all eight scene graphs and disposal.');console.log('Mesh counts:',counts);
