/**
 * Prisma 7 client.ts uses import.meta.url; tsc can still emit import.meta in CJS,
 * which makes Node 20+ treat the file as ESM when mixed with `exports` and breaks `node dist/index.js`.
 * Replace the __dirname bootstrap with plain CommonJS `__dirname`.
 */
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '../dist/generated/prisma/client.js');
let s = fs.readFileSync(file, 'utf8');
const from =
  "globalThis['__dirname'] = path.dirname((0, node_url_1.fileURLToPath)(import.meta.url))";
const to = "globalThis['__dirname'] = __dirname";

if (s.includes(from)) {
  s = s.replace(from, to);
  fs.writeFileSync(file, s);
  console.log('patched', file);
} else if (s.includes('import.meta.url')) {
  console.error('patch-prisma-cjs: import.meta.url present but expected pattern not found');
  process.exit(1);
}
