'use client';
import {useState,useRef,useEffect} from 'react';
import {Terminal,ArrowLeft} from 'lucide-react';
import type {TrainingSession} from '@/lib/education/model';
import {executeTrainingCommand} from '@/lib/education/workstation';
export default function Workstation({session,onSync,onSOC}:{session:TrainingSession;onSync:()=>void;onSOC:()=>void}){
 const [input,setInput]=useState(''),[history,setHistory]=useState<{command:string;output:string}[]>([]);const end=useRef<HTMLDivElement>(null);
 const run=(text:string)=>{if(!text.trim())return;if(text.trim()==='clear')setHistory([]);else{const result=executeTrainingCommand(text,session);setHistory(h=>[...h.slice(-39),{command:text,output:result.output}]);if(result.changed)onSync();}setInput('');};
 useEffect(()=>{end.current?.scrollIntoView({block:'nearest'});},[history]);
 return <><div className="terminal-header"><Terminal size={18}/><bdi>WS-12 / TRAINING TERMINAL</bdi><span className="demo-dot"/></div><p>لاگ را بخوان، مبدأ را پیدا کن و تصمیم را در پرونده ثبت کن.</p><div className="terminal-output" role="log" aria-label="خروجی پایانه" dir="ltr"><div className="terminal-welcome">SooVers Workstation · SV-042<br/>Type help to begin.</div>{history.map((h,i)=><div key={i}><strong>student@lab:~$ {h.command}</strong><pre>{h.output}</pre></div>)}<div ref={end}/></div><form className="terminal-form" onSubmit={e=>{e.preventDefault();run(input);}}><label htmlFor="terminal-command" dir="ltr">student@lab:~$</label><input id="terminal-command" autoComplete="off" spellCheck={false} dir="ltr" value={input} onChange={e=>setInput(e.target.value)} placeholder="help"/><button type="submit">اجرا</button></form><div className="terminal-shortcuts">{['help','whoami','cat auth.log','events --type alert'].map(cmd=><button key={cmd} onClick={()=>run(cmd)} dir="ltr">{cmd}</button>)}</div><div className="panel-actions"><button onClick={onSOC}>ادامهٔ پرونده در SOC<ArrowLeft size={15}/></button></div></>;
}
