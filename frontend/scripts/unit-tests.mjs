// Runs the unit tests (Vitest, through `ng test`) of every workspace project that has any.
// A project with no *.spec.ts yet is skipped, not failed: unit tests cover helpers and services
// with many cases, and not every project has one.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const workspace = JSON.parse(readFileSync('angular.json', 'utf8'));

function hasSpecs(dir) {
  return readdirSync(dir, { withFileTypes: true }).some((entry) =>
    entry.isDirectory()
      ? entry.name !== 'node_modules' && hasSpecs(join(dir, entry.name))
      : entry.name.endsWith('.spec.ts'),
  );
}

for (const [name, project] of Object.entries(workspace.projects)) {
  if (!hasSpecs(project.root)) {
    console.log(`${name}: no unit tests yet`);
    continue;
  }
  execFileSync('npx', ['ng', 'test', name, '--watch=false'], { stdio: 'inherit' });
}
