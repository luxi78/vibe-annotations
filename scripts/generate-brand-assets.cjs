// Rebuild checked-in assets with the sharp dependency supplied by Next.js.
// Run after pnpm install: node scripts/generate-brand-assets.cjs
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const websiteRequire = createRequire(path.join(root, 'packages/website/package.json'));
const nextRequire = createRequire(websiteRequire.resolve('next/package.json'));
const sharp = nextRequire('sharp');

// Feedback Window: open upper-right corner, lower-left dialogue tail,
// detached feedback square. This is authored geometry, not a cropped concept board.
const geometry = '<path d="M38 24H93Q97 24 94 28L80 42H38Q28 42 28 52V78Q28 88 38 88H88Q98 88 98 78V58L90 50Q88 48 90 46L101 35Q103 33 105 35L116 46V78Q116 106 88 106H28L9 119Q4 122 5 116L10 94V52Q10 24 38 24Z"/><rect x="108" y="10" width="19" height="19" rx="3"/>';
const mark = fill => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 136 128" fill="${fill}">${geometry}</svg>\n`;
const brandDir = path.join(root, 'docs/design/brand');
const extensionDir = path.join(root, 'packages/extension/public/assets/icons');
const siteDir = path.join(root, 'packages/website/public');

async function png(svg, size, target) {
  await sharp(Buffer.from(svg), { density: 384 }).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(target);
}

async function main() {
  await fs.mkdir(brandDir, { recursive: true });
  const variants = { 'pinvelto-mark': '#0754FF', 'pinvelto-mark-dark': '#75A2FF', 'pinvelto-mark-black': '#11151B', 'pinvelto-mark-white': '#FFFFFF' };
  for (const [name, fill] of Object.entries(variants)) {
    await fs.writeFile(path.join(brandDir, `${name}.svg`), mark(fill));
    await fs.writeFile(path.join(siteDir, `${name}.svg`), mark(fill));
  }
  for (const size of [16, 32, 48, 128]) {
    await png(mark('#0754FF'), size, path.join(extensionDir, `icon${size}.png`));
    await png(mark('#0754FF'), size, path.join(siteDir, `icon${size}.png`));
  }
  await png(mark('#75A2FF'), 256, path.join(extensionDir, 'icon-hq.png'));
  await png(mark('#0754FF'), 180, path.join(siteDir, 'apple-touch-icon.png'));
  await png(mark('#0754FF'), 256, path.join(siteDir, 'logo.png'));
  // ICO embeds native PNG images, preserving alpha at all browser sizes.
  const images = await Promise.all([16, 32, 48, 128].map(size => fs.readFile(path.join(siteDir, `icon${size}.png`))));
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  for (let i = 0; i < images.length; i++) {
    const size = [16, 32, 48, 128][i];
    const entry = 6 + 16 * i;
    header[entry] = header[entry + 1] = size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(images[i].length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += images[i].length;
  }
  await fs.writeFile(path.join(siteDir, 'favicon.ico'), Buffer.concat([header, ...images]));
}
main().catch(error => { console.error(error); process.exitCode = 1; });

