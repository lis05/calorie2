import { defineConfig } from 'vite';
import { execSync } from 'child_process';
import fs from 'fs';

function getVersion() {
  try {
    return execSync('git log -1 --format=%cd-%h --date=format:%Y-%m-%d').toString().trim();
  } catch (e) {
    const today = new Date().toISOString().split('T')[0];
    return `${today}-dev`;
  }
}

const appVersion = getVersion();

try {
  fs.writeFileSync('src/js/version.js', `export const APP_VERSION = '${appVersion}';\n`);
  fs.writeFileSync('public/version.json', JSON.stringify({ version: appVersion }, null, 2) + '\n');
} catch (e) {}

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
});
