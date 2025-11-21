#!/usr/bin/env node

const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

const outputPath = resolve(__dirname, '../build/index.js');
const source = readFileSync(outputPath, 'utf8');
const cleaned = source.replace(/\n?module\.exports\s*=\s*{[^}]+};?\s*$/, '\n');

if (cleaned !== source) {
  writeFileSync(outputPath, cleaned.trimEnd() + '\n', 'utf8');
}
