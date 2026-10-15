from pathlib import Path
import json,zipfile,xml.etree.ElementTree as E,re,argparse
parser=argparse.ArgumentParser(description="Import the user-supplied student Release 2 DOCX as structured reading, without images or attachments.")
parser.add_argument("document",type=Path)
args=parser.parse_args()
p=args.document
n={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with zipfile.ZipFile(p) as z:r=E.fromstring(z.read('word/document.xml'))
def txt(el):return ''.join(t.text or '' for t in el.findall('.//w:t',n))
sections={};current=None;glossary=[];sources=[];in_glossary=False;in_sources=False
for el in r.find('w:body',n):
 if el.tag.endswith('}p'):
  text=txt(el).strip()
  if not text:continue
  props=el.find('w:pPr/w:pStyle',n);style=props.get('{'+n['w']+'}val','') if props is not None else ''
  heading=style.lower().startswith('heading')
  if heading:
   match=re.match(r'^([12]\.\d+|E\d+)\.?(?:\s|—)',text)
   current=match.group(1) if match else None
   if current:sections[current]={'title':text,'blocks':[]}
   in_glossary=text in ('English–Persian glossary','Glossary extension — Release 2')
   in_sources=text in ('Source register and access notes','Additional primary references — Release 2')
  elif current and not text.startswith('Figure '):sections[current]['blocks'].append({'type':'paragraph','text':text})
  if in_sources and not heading:sources.append(text)
 elif el.tag.endswith('}tbl'):
  rows=[[ '\n'.join(txt(p) for p in cell.findall('.//w:p',n)) for cell in row.findall('w:tc',n)] for row in el.findall('w:tr',n)]
  if current:sections[current]['blocks'].append({'type':'table','rows':rows})
  if in_glossary:
   for row in rows[1:]:
    if len(row)==3:glossary.append(row)
output={'title':'Industrial Automation — Book B, Student Release 2','date':'2026-10-15','sections':sections,'glossary':glossary,'references':sources}
(Path(__file__).resolve().parents[1]/'lib/ics/book.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
print('Imported',len(sections),'sections,',len(glossary),'glossary entries,',len(sources),'reference paragraphs')
print('Section keys:',','.join(sections))
