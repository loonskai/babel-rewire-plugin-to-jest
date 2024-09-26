#!/usr/bin/env node

import { execSync } from 'node:child_process';
import path from 'node:path';

const args = process.argv.slice(2).join(' ');

const mainPath = path.join(path.dirname(new URL(import.meta.url).pathname), '../dist', 'main.js');

try {
    execSync(`node ${mainPath} ${args}`, { stdio: 'inherit' });
} catch (err) {
    console.error(`Error executing main.ts: ${err.message}`);
    process.exit(1);
}
