const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const extDir = path.resolve(__dirname, '../../extension');
const publicDir = path.resolve(__dirname, '../public');
const outFile = path.join(publicDir, 'extension.zip');

if (!fs.existsSync(extDir)) {
  console.log('Extension folder not found, skipping zip.');
  process.exit(0);
}

fs.mkdirSync(publicDir, { recursive: true });

// Remove old zip if exists
if (fs.existsSync(outFile)) {
  fs.unlinkSync(outFile);
}

// Use Node.js to create zip without external dependencies
const { createWriteStream } = require('fs');
const archiver = tryRequire('archiver');

if (archiver) {
  zipWithArchiver();
} else {
  zipManual();
}

function tryRequire(mod) {
  try { return require(mod); } catch { return null; }
}

function zipWithArchiver() {
  const output = createWriteStream(outFile);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(output);
  archive.directory(extDir, 'job-helper-extension');
  archive.finalize();
  output.on('close', () => {
    console.log(`Extension zipped: ${outFile} (${archive.pointer()} bytes)`);
  });
}

function zipManual() {
  // Fallback: use system zip command
  try {
    // Try zip command (Linux/Mac)
    execSync(`cd "${path.dirname(extDir)}" && zip -r "${outFile}" extension -x "extension/node_modules/*"`, { stdio: 'inherit' });
    console.log(`Extension zipped: ${outFile}`);
  } catch {
    try {
      // Try PowerShell (Windows)
      execSync(`powershell -Command "Compress-Archive -Path '${extDir}' -DestinationPath '${outFile}' -Force"`, { stdio: 'inherit' });
      console.log(`Extension zipped: ${outFile}`);
    } catch (e) {
      console.error('Could not zip extension. Install archiver: npm i archiver');
      console.error(e.message);
    }
  }
}
