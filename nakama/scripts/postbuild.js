#!/usr/bin/env node

const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

const outputPath = resolve(__dirname, '../build/index.js');
const source = readFileSync(outputPath, 'utf8');
const exportRegex = /module\.exports\s*=\s*\{\s*InitModule\s*\};?/;
const globalAssignment = /globalThis\.InitModule\s*=\s*InitModule/;

// If the build output already exposes InitModule on the global object we can
// leave it untouched. Otherwise, convert the CommonJS export into a global
// assignment so Nakama can discover the entrypoint without crashing.
const cleaned = globalAssignment.test(source)
  ? source
  : exportRegex.test(source)
    ? source.replace(exportRegex, 'globalThis.InitModule = InitModule;')
    : source;

writeFileSync(outputPath, cleaned.trimEnd() + '\n', 'utf8');
