import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../lib/soovers-motion.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {SooVersMotion}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const advance=(motion,seconds,hz=60)=>{for(let i=0;i<seconds*hz;i++)motion.advance(1/hz);};
// Completion and expansion must not depend on the display refresh rate.
const a=new SooVersMotion(),b=new SooVersMotion();advance(a,6,30);advance(b,6,120);
assert.ok(a.assembled&&b.assembled);for(let i=0;i<8;i++)assert.equal(a.reveal(i),1);
assert.ok(Math.abs(a.elapsed-b.elapsed)<1e-8);
a.expandTarget=b.expandTarget=true;advance(a,2,30);advance(b,2,120);assert.ok(Math.abs(a.expanded-b.expanded)<1e-8);
// User input cancels the scripted camera without restarting the floor reveal.
const interrupted=new SooVersMotion();advance(interrupted,2);interrupted.interrupt();assert.equal(interrupted.cinematic,false);advance(interrupted,4);assert.ok(interrupted.assembled);
// Pause, replay, entering, and returning must not leak exploded state into rooms.
a.playing=false;const clock=a.time;advance(a,1);assert.equal(a.time,clock);a.replay();assert.equal(a.elapsed,0);assert.equal(a.expandTarget,false);assert.equal(a.playing,true);advance(a,10);assert.equal(a.cinematic,false);
a.expandTarget=true;advance(a,1);a.enter();assert.equal(a.expanded,0);assert.equal(a.showcase,false);assert.equal(a.reveal(7),1);a.returnToTower();assert.equal(a.showcase,true);assert.equal(a.cinematic,false);
// Reduced motion is a complete static tower, and explicit structure exploration still works.
const reduced=new SooVersMotion(true);assert.equal(reduced.playing,false);assert.equal(reduced.cinematic,false);assert.equal(reduced.reveal(7),1);reduced.expandTarget=true;reduced.advance(1/60);assert.equal(reduced.expanded,1);reduced.replay();assert.equal(reduced.playing,false);assert.equal(reduced.reveal(7),1);
console.log('SooVers: timeline, interruption, replay, pause, room transitions and reduced motion passed.');
