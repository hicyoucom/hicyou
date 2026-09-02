import { test, expect } from "bun:test";
import { openapiSpec, SCHEMA_VERSION } from "../openapi";

test("spec serializes to valid JSON", () => {
  expect(() => JSON.stringify(openapiSpec)).not.toThrow();
  expect(openapiSpec.openapi).toBe("3.1.0");
  expect(openapiSpec.info.version).toBe(SCHEMA_VERSION);
});

test("documents every public endpoint", () => {
  const paths = Object.keys(openapiSpec.paths);
  for (const p of ["/meta", "/products", "/products/{slug}", "/search", "/export", "/categories", "/tags", "/changes"]) {
    expect(paths).toContain(p);
  }
});

test("declares bearer auth and core schemas", () => {
  expect(openapiSpec.components.securitySchemes.bearerAuth.scheme).toBe("bearer");
  for (const s of ["Product", "ChangeEntry", "Error"]) {
    expect(openapiSpec.components.schemas).toHaveProperty(s);
  }
  // Delete tombstones must require source_id for incremental consumers.
  const del = openapiSpec.components.schemas.ChangeEntry.oneOf.find((b) =>
    (b.properties.type as { const?: string }).const === "delete",
  );
  expect(del?.required).toContain("source_id");
  const upsert = openapiSpec.components.schemas.ChangeEntry.oneOf.find((b) =>
    (b.properties.type as { const?: string }).const === "upsert",
  );
  expect(upsert?.required).toContain("updated_at");
  expect(openapiSpec.components.responses.RateLimited.headers).toHaveProperty(
    "Retry-After",
  );
});
