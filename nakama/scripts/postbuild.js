#!/usr/bin/env node

const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

const outputPath = resolve(__dirname, '../build/index.js');
const source = readFileSync(outputPath, 'utf8');

// Ensure the compiled bundle always ends with a single newline to satisfy linting tools
// while keeping the module.exports assignment intact for Nakama to load InitModule.
if (!source.endsWith('\n')) {
  writeFileSync(outputPath, source + '\n', 'utf8');
}
