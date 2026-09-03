import { expect, test } from "bun:test";
import { ApiError, errorResponse } from "../errors";

test("rate-limit errors expose a rounded Retry-After header", async () => {
  const response = errorResponse(
    new ApiError("rate_limited", "Slow down", 429, { retry_after: 12.2 }),
  );

  expect(response.status).toBe(429);
  expect(response.headers.get("Retry-After")).toBe("13");
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({
    error: {
      code: "rate_limited",
      message: "Slow down",
      retry_after: 12.2,
    },
  });
});
