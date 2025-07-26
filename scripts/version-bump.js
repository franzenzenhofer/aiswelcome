#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagePath = path.join(__dirname, '..', 'package.json');

const type = process.argv[2] || 'patch';

// Read package.json
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const currentVersion = pkg.version;
const parts = currentVersion.split('.').map(Number);

// Bump version
switch (type) {
  case 'major':
    parts[0]++;
    parts[1] = 0;
    parts[2] = 0;
    break;
  case 'minor':
    parts[1]++;
    parts[2] = 0;
    break;
  case 'patch':
  default:
    parts[2]++;
    break;
}

const newVersion = parts.join('.');
pkg.version = newVersion;

// Write package.json
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`Version bumped from ${currentVersion} to ${newVersion}`);