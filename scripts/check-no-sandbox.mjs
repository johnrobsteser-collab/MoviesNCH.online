#!/usr/bin/env node
/**
 * Regression guard: the movie player iframe must NEVER carry a `sandbox` attribute.
 *
 * Why: streaming embed providers (vidsrc, vidlink, autoembed, ...) detect sandboxed frames and refuse to
 * play ("playback blocked — this player cannot be loaded inside a restricted (sandboxed) iframe").
 * This has regressed more than once, so it is enforced at build time instead of relying on memory.
 *
 *   node scripts/check-no-sandbox.mjs          -> scans source (runs automatically as `prebuild`)
 *   node scripts/check-no-sandbox.mjs --dist   -> scans the built bundle (runs automatically as `postbuild`)
 *
 * Popup/ad defense belongs in the AdShield layers in src/App.jsx (window.open override, click shield,
 * blur/focus recovery) — not in iframe sandboxing.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scanDist = process.argv.includes('--dist');

// Source: JSX/JS usages that set the sandbox attribute (comments are stripped first so docs don't trip it).
const SOURCE_PATTERNS = [
  { re: /\bsandbox\s*=/, what: 'JSX/HTML `sandbox=` attribute' },
  { re: /setAttribute\(\s*['"`]sandbox['"`]/, what: "setAttribute('sandbox', ...)" },
  { re: /\.sandbox\b/, what: '.sandbox property access/assignment' },
];

// Built bundle: the exact token strings / prop key a sandboxed iframe would need.
const DIST_PATTERNS = [
  { re: /allow-same-origin/, what: "sandbox token 'allow-same-origin'" },
  { re: /allow-popups-to-escape-sandbox/, what: "sandbox token 'allow-popups-to-escape-sandbox'" },
  { re: /[,{]sandbox:/, what: 'React `sandbox:` prop' },
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
    for (const { re, what } of SOURCE_PATTERNS) {
      if (re.test(code)) violations.push(`${relative(root, file)}: ${what}`);
    }
  }
} else {
  const distDir = join(root, 'dist');
  if (!existsSync(distDir)) {
    console.error('✖ check-no-sandbox: dist/ not found — run the build first.');
    process.exit(1);
  }
  for (const file of walk(distDir, ['.js', '.html'])) {
    const code = readFileSync(file, 'utf8');
    for (const { re, what } of DIST_PATTERNS) {
      if (re.test(code)) violations.push(`${relative(root, file)}: ${what}`);
    }
  }
}

if (violations.length) {
  console.error('\n✖ check-no-sandbox FAILED — a sandbox attribute was (re)introduced:\n');
  for (const v of violations) console.error('  • ' + v);
  console.error(
    '\nThe player iframe must not be sandboxed: embed providers detect it and block playback.\n' +
      'Use the AdShield layers in src/App.jsx for popup defense instead.\n'
  );
  process.exit(1);
}

console.log(`✔ check-no-sandbox passed (${scanDist ? 'dist bundle' : 'source'}): no iframe sandbox found.`);
