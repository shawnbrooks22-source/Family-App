/**
 * Postinstall patch: replace dynamic import(variable) in @supabase/supabase-js
 * with Promise.resolve(null) so Hermes (React Native) can compile the bundle.
 *
 * Hermes rejects `import(expression)` when the argument is not a string literal.
 * @supabase/supabase-js uses `import(OTEL_PKG)` to optionally load OpenTelemetry.
 * We replace it with a no-op promise so Hermes never sees the invalid syntax.
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'node_modules', '@supabase', 'supabase-js', 'dist');

const filesToPatch = ['index.mjs'];

for (const file of filesToPatch) {
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) {
    console.log('[patch-otel] Not found:', file, '— skipping');
    continue;
  }
  const before = fs.readFileSync(filePath, 'utf8');
  const after = before.replace(/import\([^)]*OTEL_PKG[^)]*\)/g, 'Promise.resolve(null)');
  if (after !== before) {
    fs.writeFileSync(filePath, after);
    console.log('[patch-otel] Patched', file);
  } else {
    console.log('[patch-otel] No patch needed for', file, '(already clean)');
  }
}
