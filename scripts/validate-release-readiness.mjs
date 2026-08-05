import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const scripts = packageJson.scripts ?? {};
const failures = [];
const requireField = (condition, message) => { if (!condition) failures.push(message); };

requireField(packageJson.repository, 'package.json must declare repository metadata');
requireField(Array.isArray(packageJson.files) && packageJson.files.length > 0, 'package.json must declare a non-empty files allowlist');
requireField(scripts['package:smoke'], 'package.json scripts must include package:smoke');
requireField(scripts['release:check'], 'package.json scripts must include release:check');
requireField(scripts['release:tag-check'], 'package.json scripts must include release:tag-check');

for (const file of ['README.md', 'LICENSE', 'SECURITY.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md']) {
  if (fs.existsSync(path.join(root, file))) {
    requireField(packageJson.files.includes(file), 'package.json files must include ' + file);
  }
}

const workflowDir = path.join(root, '.github', 'workflows');
if (fs.existsSync(workflowDir)) {
  const workflowFiles = fs.readdirSync(workflowDir).filter((file) => /\.ya?ml$/.test(file));
  requireField(workflowFiles.length > 0, 'repository must include at least one workflow file');
  for (const file of workflowFiles) {
    const workflow = fs.readFileSync(path.join(workflowDir, file), 'utf8');
    requireField(!/TODO|FIXME|template becomes an app|customization TODO/i.test(workflow), '.github/workflows/' + file + ' still contains placeholder text');
  }
  const combined = workflowFiles.map((file) => fs.readFileSync(path.join(workflowDir, file), 'utf8')).join('\n');
  requireField(/release:check/.test(combined), 'CI workflows must run npm run release:check');

  const release = fs.readFileSync(path.join(workflowDir, 'release.yml'), 'utf8');
  const dryRun = fs.readFileSync(path.join(workflowDir, 'release-dry-run.yml'), 'utf8');
  requireField(/release:tag-check/.test(release), 'release workflow must validate its tag');
  requireField(/release:tag-check/.test(dryRun), 'release dry run must validate a prospective tag');
  requireField(/npm publish --dry-run --provenance --access public/.test(dryRun), 'release dry run must exercise npm publish with provenance');
  requireField(/npm publish --provenance --access public/.test(release), 'release workflow must publish the verified package');
  requireField(release.indexOf('npm publish --provenance --access public') < release.indexOf('gh release create'), 'npm publish must run before GitHub release creation');
}

if (failures.length > 0) {
  console.error('Release readiness validation failed:');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('Release readiness validation passed.');
