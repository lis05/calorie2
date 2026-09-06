import { execSync } from 'child_process';
import fs from 'fs';

try {
  const version = execSync('git log -1 --format=%cd-%h --date=format:%Y-%m-%d').toString().trim();
  fs.writeFileSync('src/js/version.js', `export const APP_VERSION = '${version}';\n`);
  console.log('Updated version to:', version);
} catch (e) {
  console.error('Failed to update version:', e.message);
}
