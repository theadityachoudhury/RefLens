const fs = require('fs');
const path = require('path');

const releaseDir = path.join(__dirname, '..', 'release');

if (!fs.existsSync(releaseDir)) process.exit(0);

for (const entry of fs.readdirSync(releaseDir)) {
  const fullPath = path.join(releaseDir, entry);
  const stat = fs.statSync(fullPath);

  const isUnpackedDir = stat.isDirectory() && (
    entry === 'mac' ||
    entry === 'mac-arm64' ||
    entry === 'linux-unpacked' ||
    entry.endsWith('-unpacked')
  );

  const isExtraFile =
    entry.endsWith('.blockmap') ||
    entry.startsWith('builder-') ||
    entry.startsWith('latest');

  if (isUnpackedDir || isExtraFile) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`removed: ${entry}`);
  }
}

console.log('release folder cleaned.');
