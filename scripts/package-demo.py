"""Create a portable demo from the actual build; never include caches or prior releases."""
import hashlib,json,pathlib,zipfile,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
version=json.loads((root/'package.json').read_text())['version']
build=root/'demo-dist'
if not (build/'index.html').is_file():raise SystemExit('Run pnpm build:demo first.')
out=root/'releases';out.mkdir(exist_ok=True)
archive=out/f'SooVers_Demo_{version}.zip'
files={}
for path in sorted(build.rglob('*')):
 if path.is_file():files['SooVers_Demo/site/'+path.relative_to(build).as_posix()]=path.read_bytes()
files['SooVers_Demo/runtime/serve.mjs']=(root/'scripts/serve.mjs').read_bytes()
files['SooVers_Demo/run.mjs']=b"import {fileURLToPath} from 'node:url';\nprocess.argv.push('--root',fileURLToPath(new URL('./site',import.meta.url)));\nawait import('./runtime/serve.mjs');\n"
files['SooVers_Demo/START_WINDOWS.bat']=(root/'scripts/START_WINDOWS.bat').read_bytes().replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')
files['SooVers_Demo/READ_ME_FA.md']=(root/'docs/LOCAL_DEMO_FA.md').read_bytes()
source_roots={'app','components','hooks','lib','local','public','scripts','docs','deploy','vendor','.github','server','migrations'}
source_files={'README.md','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json','vite.config.ts','vite.local.config.ts','postcss.config.mjs','.gitignore','.dockerignore','Dockerfile','compose.yaml','components.json','.env.example'}
candidates=[root/name for name in source_files if (root/name).is_file()]
for name in source_roots:
 if (root/name).is_dir():candidates.extend((root/name).rglob('*'))
for path in sorted(candidates):
 rel=path.relative_to(root)
 if rel.parts[0] not in source_roots and rel.as_posix() not in source_files:continue
 if any(p in {'node_modules','downloads','__pycache__'} for p in rel.parts):continue
 if path.is_file():files['SooVers_Demo/source/'+rel.as_posix()]=path.read_bytes()
manifest={name:hashlib.sha256(data).hexdigest() for name,data in files.items()}
files['SooVers_Demo/SHA256SUMS.json']=json.dumps(manifest,indent=2,ensure_ascii=False).encode()
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name,data in sorted(files.items()):
  info=zipfile.ZipInfo(name,date_time=(2026,10,15,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;z.writestr(info,data)
checksum=hashlib.sha256(archive.read_bytes()).hexdigest();(out/(archive.name+'.sha256')).write_text(checksum+'  '+archive.name+'\n')
print(f'{archive.relative_to(root)} · {archive.stat().st_size:,} bytes · {len(files)} files')
