import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../lib/education/f5-course.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {assessLab,labCases,parseCourse,initialCourse}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
assert.deepEqual(parseCourse('{'),initialCourse());
assert.deepEqual(parseCourse(JSON.stringify({chapter:99,parts:[0,0,2,-1,'1'],solved:['monitor','monitor','fake'],answers:{0:1,1:-1,2:'0'}})),{chapter:0,parts:[0,2],solved:['monitor'],answers:{0:1}});
for(const c of labCases){
 assert.equal(assessLab(c,[],c.cause,c.fix).ok,false,'Cannot pass without evidence');
 assert.equal(assessLab(c,[0,0],c.cause,c.fix).ok,false,'Duplicate evidence does not count twice');
 assert.equal(assessLab(c,[0,99],c.cause,c.fix).ok,false,'Invalid evidence is ignored');
 assert.equal(assessLab(c,[0,1],(c.cause+1)%3,c.fix).ok,false,'Wrong diagnosis must fail');
 assert.equal(assessLab(c,[0,1],c.cause,(c.fix+1)%3).ok,false,'Wrong remediation must fail');
 assert.equal(assessLab(c,[0,1],c.cause,c.fix).ok,true,'Evidence-based diagnosis and fix pass');
}
console.log('PASS F5 persistence validation and 18 evidence/diagnosis/remediation checks');
