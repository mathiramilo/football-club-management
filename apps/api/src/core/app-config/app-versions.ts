const SEMANTIC_VERSION = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
const NUMERIC = /^\d+$/;

interface ParsedVersion {
  core: [number, number, number];
  preRelease: string[];
}

function parse(version: string): ParsedVersion {
  const match = SEMANTIC_VERSION.exec(version);
  if (!match) throw new Error('Not a semantic version');
  const [, major, minor, patch, preRelease] = match;
  return {
    core: [Number(major), Number(minor), Number(patch)],
    preRelease: preRelease?.split('.') ?? [],
  };
}

function compareIdentifiers(a: string, b: string): number {
  const aIsNumeric = NUMERIC.test(a);
  const bIsNumeric = NUMERIC.test(b);
  if (aIsNumeric && bIsNumeric) return Math.sign(Number(a) - Number(b));
  if (aIsNumeric !== bIsNumeric) return aIsNumeric ? -1 : 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function comparePreReleases(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return Math.sign(b.length - a.length);
  for (const [index, identifier] of a.entries()) {
    const other = b[index];
    if (other === undefined) return 1;
    const order = compareIdentifiers(identifier, other);
    if (order !== 0) return order;
  }
  return a.length < b.length ? -1 : 0;
}

// Semantic Versioning 2.0.0 precedence: build metadata is ignored, and a pre-release sorts before its release.
export function compareAppVersions(a: string, b: string): number {
  const left = parse(a);
  const right = parse(b);
  for (const index of [0, 1, 2] as const) {
    const order = Math.sign(left.core[index] - right.core[index]);
    if (order !== 0) return order;
  }
  return comparePreReleases(left.preRelease, right.preRelease);
}
