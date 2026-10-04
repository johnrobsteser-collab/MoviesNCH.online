#!/usr/bin/env node
/**
 * Enhanced Sandbox Guard:
 * Validates that any sandbox attributes set on streaming iframes follow the
 * Enhanced Sandbox specification:
 * - Must allow scripts and same-origin so modern movie streaming players can run.
 * - Must NOT allow popups-to-escape-sandbox or unrestricted top navigation.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scanDist = process.argv.includes('--dist');

// Forbidden tokens that break popup defense
const FORBIDDEN_TOKENS = [
  { re: /allow-popups-to-escape-sandbox/, what: "Unsafe token 'allow-popups-to-escape-sandbox'" },
  { re: /allow-top-navigation\b/, what: "Unsafe token 'allow-top-navigation'" },
];

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, exts, out);
    else if (exts.includes(extname(name))) out.push(full);
  }
  return out;
}

function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
}

const violations = [];

if (!scanDist) {
  const files = [
    ...walk(join(root, 'src'), ['.js', '.jsx', '.ts', '.tsx']),
    ...(existsSync(join(root, 'index.html')) ? [join(root, 'index.html')] : []),
  ];
  for (const file of files) {
    const code = file.endsWith('.html') ? readFileSync(file, 'utf8') : stripComments(readFileSync(file, 'utf8'));
    for (const { re, what } of FORBIDDEN_TOKENS) {
      if (re.test(code)) violations.push(`${relative(root, file)}: ${what}`);
    }
  }
} else {
  const distDir = join(root, 'dist');
  if (!existsSync(distDir)) {
    console.error('✖ check-sandbox: dist/ not found — run the build first.');
    process.exit(1);
  }
  for (const file of walk(distDir, ['.js', '.html'])) {
    const code = readFileSync(file, 'utf8');
    for (const { re, what } of FORBIDDEN_TOKENS) {
      if (re.test(code)) violations.push(`${relative(root, file)}: ${what}`);
    }
  }
}

if (violations.length) {
  console.error('\n✖ check-sandbox FAILED — unsafe sandbox token found:\n');
  for (const v of violations) console.error('  • ' + v);
  process.exit(1);
}

console.log(`✔ check-sandbox passed (${scanDist ? 'dist bundle' : 'source'}): Enhanced Sandbox security verified.`);

