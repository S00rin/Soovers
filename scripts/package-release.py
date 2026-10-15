"""Build a deterministic source/deployment handoff without databases or secrets."""
from pathlib import Path
import hashlib
import json
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text())['version']
if not (root / 'local-dist/index.html').is_file():
    raise SystemExit('Run pnpm build before packaging.')
names = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root).decode().split('\0')
files = {}
for name in names:
    if not name or name.endswith('.zip'):
        continue
    file = root / name
    if file.is_symlink():
        raise SystemExit(f'Refusing symlink in source handoff: {name}')
    if file.is_file():
        files[name] = file.read_bytes()
for file in sorted((root / 'local-dist').rglob('*')):
    if file.is_file():
        files[str(file.relative_to(root))] = file.read_bytes()
manifest = {name: hashlib.sha256(data).hexdigest() for name, data in sorted(files.items())}
files['SHA256SUMS.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
destination = root / 'releases' / f'SooVers_Academy_{version}.zip'
destination.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
    for name, data in sorted(files.items()):
        info = zipfile.ZipInfo(f'SooVers_Academy/{name}', date_time=(2026, 10, 15, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        bundle.writestr(info, data)
digest = hashlib.sha256(destination.read_bytes()).hexdigest()
destination.with_suffix('.zip.sha256').write_text(f'{digest}  {destination.name}\n')
print(f'{destination} ({destination.stat().st_size:,} bytes)\nSHA256 {digest}')
