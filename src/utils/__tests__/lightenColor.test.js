import { describe, it, expect } from "vitest";
import { lightenColor } from "../lightenColor.js";

describe("lightenColor", () => {
  it("lightens a color by the default 10%", () => {
    const result = lightenColor("#000000");
    const num = parseInt(result.slice(1), 16);
    const R = (num >> 16) & 0xff;
    expect(R).toBe(Math.round(2.55 * 10));
  });

  it("handles hex without a leading #", () => {
    const result = lightenColor("000000");
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("clamps RGB channels at 255 (no overflow)", () => {
    const result = lightenColor("#ffffff", 10);
    expect(result).toBe("#ffffff");
  });

  it("lightens a dark color correctly", () => {
    const result = lightenColor("#333333", 20);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
    const num = parseInt(result.slice(1), 16);
    const R = (num >> 16) & 0xff;
    expect(R).toBeGreaterThan(0x33);
  });

  it("lightens by a custom percentage", () => {
    const result = lightenColor("#004080", 30);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
    const num = parseInt(result.slice(1), 16);
    const R = (num >> 16) & 0xff;
    const G = (num >> 8) & 0xff;
    const B = num & 0xff;
    expect(R).toBeGreaterThan(0x00);
    expect(G).toBeGreaterThan(0x40);
    expect(B).toBeGreaterThan(0x80);
  });

  it("returns white when lightening by 100%", () => {
    const result = lightenColor("#000000", 100);
    expect(result).toBe("#ffffff");
  });
});
