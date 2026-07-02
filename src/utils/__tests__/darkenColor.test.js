import { describe, it, expect } from "vitest";
import { darkenColor } from "../darkenColor.js";

describe("darkenColor", () => {
  it("darkens a color by the default 20%", () => {
    const result = darkenColor("#ffffff");
    expect(result).toBe("#cccccc");
  });

  it("handles hex without a leading #", () => {
    const result = darkenColor("ffffff");
    expect(result).toBe("#cccccc");
  });

  it("clamps RGB channels at 0 (no negative values)", () => {
    const result = darkenColor("#000000", 20);
    expect(result).toBe("#000000");
  });

  it("darkens a mid-range color correctly", () => {
    const result = darkenColor("#808080", 10);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
    const num = parseInt(result.slice(1), 16);
    const R = (num >> 16) & 0xff;
    expect(R).toBeLessThan(0x80);
  });

  it("darkens by a custom percentage", () => {
    const result = darkenColor("#ff8040", 50);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
    const num = parseInt(result.slice(1), 16);
    const R = (num >> 16) & 0xff;
    const G = (num >> 8) & 0xff;
    const B = num & 0xff;
    expect(R).toBeLessThan(0xff);
    expect(G).toBeLessThan(0x80);
    expect(B).toBe(0);
  });

  it("returns black when darkening by 100%", () => {
    const result = darkenColor("#ffffff", 100);
    expect(result).toBe("#000000");
  });
});
