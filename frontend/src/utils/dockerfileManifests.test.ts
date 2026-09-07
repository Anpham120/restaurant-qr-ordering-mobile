import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const frontendRoot = new URL("../../", import.meta.url);
const dockerfilePath = fileURLToPath(new URL("Dockerfile", frontendRoot));
const healthCheckPath = fileURLToPath(
  new URL("../deploy/scripts/health-check.sh", frontendRoot),
);

function manifestPathsInDockerfile(): string[] {
  const dockerfile = readFileSync(dockerfilePath, "utf8");
  return [...dockerfile.matchAll(/^COPY frontend\/(\S*package\.json)\s/mg)].map((m) => m[1]!);
}

/** Every workspace on disk, following the two `apps/*` and `packages/*` globs in package.json. */
function workspacesOnDisk(): string[] {
  return ["apps", "packages"].flatMap((dir) =>
    readdirSync(fileURLToPath(new URL(dir, frontendRoot)), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `${dir}/${entry.name}/package.json`)
      .filter((p) => existsSync(fileURLToPath(new URL(p, frontendRoot)))));
}

describe("frontend Dockerfile workspace manifests", () => {
  it("copies only package manifests that exist in the build context", () => {
    const manifestPaths = manifestPathsInDockerfile();

    expect(manifestPaths.length).toBeGreaterThan(0);
    for (const manifestPath of manifestPaths) {
      expect(existsSync(fileURLToPath(new URL(manifestPath, frontendRoot))), manifestPath).toBe(true);
    }
  });

  /**
   * The other direction, and the more expensive one: a missing manifest makes `npm ci` build a
   * workspace tree that does not match package-lock.json, so the image breaks — but only at image
   * build time, which is late.
   *
   * This has already happened: `@cmc/i18n` is a dependency of customer-web with no COPY line at
   * all, and the one-directional check above could not see it because it only inspects the lines
   * that are already there.
   */
  it("copies every workspace manifest on disk", () => {
    const copied = new Set(manifestPathsInDockerfile());

    for (const workspace of workspacesOnDisk()) {
      expect(copied.has(workspace), `missing COPY line for ${workspace}`).toBe(true);
    }
  });
});

describe("production health check retries", () => {
  it("retries transient TLS errors while nginx certificates reload", () => {
    const healthCheck = readFileSync(healthCheckPath, "utf8");

    expect(healthCheck).toContain("--retry-all-errors");
  });
});
