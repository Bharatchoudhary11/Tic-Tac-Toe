#!/usr/bin/env node

const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

const outputPath = resolve(__dirname, '../build/index.js');
const source = readFileSync(outputPath, 'utf8');
const exportRegex = /module\.exports\s*=\s*\{\s*InitModule\s*\};?/;

// Nakama expects InitModule to be available on the global object rather than
// exported via CommonJS. Convert the generated export into a global
// assignment so the server can discover the entrypoint without crashing.
const cleaned = exportRegex.test(source)
  ? source.replace(exportRegex, 'globalThis.InitModule = InitModule;')
  : source;

writeFileSync(outputPath, cleaned.trimEnd() + '\n', 'utf8');
