import {build} from 'vite';
import {writeFile} from 'node:fs/promises';
process.env.SOOVERS_DEMO='1';
await build({configFile:'vite.local.config.ts'});
await writeFile('demo-dist/.nojekyll','');
