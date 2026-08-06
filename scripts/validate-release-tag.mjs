import fs from 'node:fs';

const version = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME;

if (!tag) {
  console.error('Release tag is required as an argument or GITHUB_REF_NAME.');
  process.exit(1);
}

if (tag !== `v${version}`) {
  console.error(`Release tag ${tag} does not match package version ${version} (expected v${version}).`);
  process.exit(1);
}

console.log(`Release tag ${tag} matches package version ${version}.`);
