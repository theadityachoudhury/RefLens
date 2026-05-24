/**
 * Converts build-resources/icon.svg → icon.png (1024×1024)
 * then calls electron-icon-builder to produce icon.icns, icon.ico,
 * and the full set of PNGs that electron-builder expects.
 *
 * Usage:  npm run build:icon
 *
 * Requires sharp (npm install --save-dev sharp).
 * sharp bundles libvips with librsvg support, so no system tools needed.
 */

const { execSync } = require('child_process');
const path = require('path');

const root   = path.join(__dirname, '..');
const svgIn  = path.join(root, 'build-resources', 'icon.svg');
const pngOut = path.join(root, 'build-resources', 'icon.png');
const outDir = path.join(root, 'build-resources');

// ── Step 1: SVG → 1024×1024 PNG via sharp ────────────────────────────────
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error(
    '\n  sharp is not installed.\n' +
    '  Run:  npm install --save-dev sharp\n' +
    '  then try again.\n',
  );
  process.exit(1);
}

console.log('Converting SVG → PNG…');
sharp(svgIn)
  .resize(1024, 1024)
  .png()
  .toFile(pngOut)
  .then(() => {
    console.log(`  ✓ ${pngOut}`);

    // ── Step 2: PNG → .icns / .ico / all platform PNGs ───────────────────
    console.log('Generating platform icons…');
    execSync(
      `npx electron-icon-builder --input="${pngOut}" --output="${outDir}"`,
      { stdio: 'inherit', cwd: root },
    );
    console.log('  ✓ Icons written to build-resources/');
  })
  .catch((err) => {
    console.error('Icon generation failed:', err.message);
    process.exit(1);
  });
