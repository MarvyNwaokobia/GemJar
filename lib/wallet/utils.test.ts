import { afterEach, describe, expect, it, vi } from "vitest";
import { isMiniPay, truncateAddress } from "./utils";

describe("isMiniPay", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when window is undefined (SSR)", () => {
    expect(isMiniPay()).toBe(false);
  });

  it("returns false when window.ethereum is missing", () => {
    vi.stubGlobal("window", {});
    expect(isMiniPay()).toBe(false);
  });

  it("returns false when window.ethereum.isMiniPay is not set", () => {
    vi.stubGlobal("window", { ethereum: {} });
    expect(isMiniPay()).toBe(false);
  });

  it("returns true when window.ethereum.isMiniPay is true", () => {
    vi.stubGlobal("window", { ethereum: { isMiniPay: true } });
    expect(isMiniPay()).toBe(true);
  });
});

describe("truncateAddress", () => {
  it("shortens an address to the first/last 4 hex chars by default", () => {
    expect(truncateAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
  });

  it("supports a custom character count", () => {
    expect(truncateAddress("0x1234567890abcdef1234567890abcdef12345678", 6)).toBe("0x123456…345678");
  });
});
