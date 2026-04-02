import { describe, expect, it, vi } from "vitest";
import { asyncHandler } from "../src/lib/async-handler";

describe("asyncHandler", () => {
  it("forwards rejected async errors to next", async () => {
    const error = new Error("boom");
    const next = vi.fn();

    const handler = asyncHandler(async () => {
      throw error;
    });

    handler({} as never, {} as never, next);
    await Promise.resolve();

    expect(next).toHaveBeenCalledWith(error);
  });
});
