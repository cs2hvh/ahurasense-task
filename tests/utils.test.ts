import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/utils";

describe("slugify", () => {
  it("normalizes text into lowercase slug", () => {
    expect(slugify("Ahurasense Delivery Team")).toBe("ahurasense-delivery-team");
  });

  it("removes unsupported symbols", () => {
    expect(slugify("Core @ Platform!")).toBe("core-platform");
  });
});

