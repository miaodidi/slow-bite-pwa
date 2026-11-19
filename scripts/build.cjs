const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.BUILD_DIR || path.join(root, 'dist'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const build = process.env.RELEASE_BUILD || (process.env.GITHUB_RUN_NUMBER
  ? `${process.env.GITHUB_RUN_NUMBER}.${process.env.GITHUB_RUN_ATTEMPT || '1'}`
  : `local.${Date.now()}`);
if (!/^[\w.-]+$/.test(build)) throw new Error('Invalid release build identifier');
const release = {
  version: pkg.version,
  build,
  id: `${pkg.version}-${build}`,
  publishedAt: new Date().toISOString(),
  commit: (process.env.GITHUB_SHA || '').slice(0, 7)
};
fs.mkdirSync(out, {recursive: true});
const files = ['index.html','app.js','catalog.js','updater.js','styles.css','sw.js','manifest.webmanifest','icon.svg'];
for (const file of files) fs.copyFileSync(path.join(root, file), path.join(out, file));
for (const folder of ['icons','assets']) fs.cpSync(path.join(root, folder), path.join(out, folder), {recursive:true});
let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
html = html.replace(/(href|src)="((?:styles\.css|catalog\.js|updater\.js|app\.js))(?:\?[^"\s]*)?"/g,
  (_, attr, file) => `${attr}="${file}?v=${release.id}"`);
fs.writeFileSync(path.join(out, 'index.html'), html);
let updater = fs.readFileSync(path.join(out, 'updater.js'), 'utf8');
updater = updater.replace(/const APP_RELEASE = .*?; \/\/ BUILD_RELEASE/, `const APP_RELEASE = ${JSON.stringify(release)}; // BUILD_RELEASE`);
fs.writeFileSync(path.join(out, 'updater.js'), updater);
const assets = ['index.html','styles.css','catalog.js','updater.js','app.js','manifest.webmanifest','icon.svg',
  ...['icons','assets'].flatMap(folder => fs.readdirSync(path.join(out, folder)).map(file => `${folder}/${file}`))];
const precache = assets.map(file => ({
  url: './' + file + (/^(styles\.css|catalog\.js|updater\.js|app\.js)$/.test(file) ? `?v=${release.id}` : ''),
  // Verify the entire release before it is allowed to replace the offline app.
  sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex')
}));
let worker = fs.readFileSync(path.join(out, 'sw.js'), 'utf8');
worker = worker.replace(/const RELEASE = .*?; \/\/ BUILD_RELEASE/, `const RELEASE = ${JSON.stringify(release)}; // BUILD_RELEASE`)
  .replace(/const PRECACHE = .*?; \/\/ BUILD_ASSETS/, `const PRECACHE = ${JSON.stringify(precache)}; // BUILD_ASSETS`);
fs.writeFileSync(path.join(out, 'sw.js'), worker);
fs.writeFileSync(path.join(out, 'version.json'), JSON.stringify(release, null, 2)+'\n');
console.log(`Built v${release.version} · ${release.build} → ${out}`);
