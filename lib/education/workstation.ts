import {TrainingSession,sampleLogs} from './model';
export type CommandResult={output:string;changed?:boolean};
/** A deterministic learning terminal; no shell evaluation and no network side effects. */
export function executeTrainingCommand(command:string,session:TrainingSession):CommandResult {
 const cmd=command.trim().replace(/\s+/g,' ');
 if(session.role==='visitor')return {output:'کارت دانشجو لازم است.'};
 if(cmd==='help')return {output:'whoami\nip addr\ncat auth.log\nevents --type alert\nfilter src <IP>\nidentify <IP>\nblock <IP>\ncase save\nclear'};
 if(cmd==='whoami')return {output:`${session.role}@soovers-lab\npermissions: read-evidence, investigate, contain-training-source`};
 if(cmd==='ip addr')return {output:'eth0  10.10.0.12/24  training-server\ngateway  10.10.0.1\nsensor   10.10.0.20'};
 if(cmd==='cat auth.log'||cmd==='events --type alert'){
  if(session.phase==='idle')session.beginIncident();
  return {output:cmd.startsWith('events')?JSON.stringify({event_type:'alert',flow_id:42001,src_ip:'198.51.100.23',dest_ip:'10.10.0.12',alert:{signature:'Training authentication burst'}},null,2):sampleLogs.join('\n'),changed:true};
 }
 if(cmd.startsWith('filter src ')){const ip=cmd.slice(11);if(!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip))return {output:'قالب: filter src 198.51.100.23'};return {output:sampleLogs.filter(l=>l.includes('src='+ip+' ')).join('\n')||'هیچ رویدادی برای این مبدأ پیدا نشد.'};}
 if(cmd.startsWith('identify '))return {output:session.identify(cmd.slice(9))?'مبدأ در پروندهٔ SV-042 ثبت شد. قدم بعد: block <IP>':'ابتدا لاگ را باز کن و مبدأ ورودهای ناموفق را پیدا کن.',changed:true};
 if(cmd.startsWith('block ')){
  if(session.phase!=='identified')return {output:'ابتدا شناسایی را با identify <IP> ثبت کن.'};
  if(cmd.slice(6)!=='198.51.100.23')return {output:'این مبدأ با شواهد پرونده تطبیق ندارد.'};
  return {output:session.contain('block-source')?'TRAINING RULE APPLIED\nsource=198.51.100.23 action=block\nجریان میز آزمایشگاه به‌روز شد.':'اقدام ثبت نشد.',changed:true};
 }
 if(cmd==='case save')return {output:session.review('preserve-evidence')?'SV-042 · شواهد و اقدام ثبت شد. گزارش نشست آمادهٔ دریافت است.':'پیش از ثبت نهایی، مبدأ را شناسایی و مهار کن.',changed:true};
 return {output:'دستور شناخته نشد. برای فهرست دستورهای میز کار، help را وارد کن.'};
}
