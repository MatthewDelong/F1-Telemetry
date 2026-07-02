import { describe, it, expect } from "vitest";
import { nationalityToFlag } from "../nationalityToFlag.js";

describe("nationalityToFlag", () => {
  it("returns null for null input", () => {
    expect(nationalityToFlag(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(nationalityToFlag(undefined)).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(nationalityToFlag(42)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(nationalityToFlag("")).toBeNull();
  });

  it("maps common nationality strings to flag paths", () => {
    expect(nationalityToFlag("British")).toBe("/images/flags/gb.webp");
    expect(nationalityToFlag("dutch")).toBe("/images/flags/nl.webp");
    expect(nationalityToFlag("German")).toBe("/images/flags/de.webp");
    expect(nationalityToFlag("Japanese")).toBe("/images/flags/jp.webp");
  });

  it("maps ISO 3-letter country codes to flag paths", () => {
    expect(nationalityToFlag("gbr")).toBe("/images/flags/gb.webp");
    expect(nationalityToFlag("deu")).toBe("/images/flags/de.webp");
    expect(nationalityToFlag("fra")).toBe("/images/flags/fr.webp");
  });

  it("maps F1 driver codes to flag paths", () => {
    expect(nationalityToFlag("VER")).toBe("/images/flags/nl.webp");
    expect(nationalityToFlag("HAM")).toBe("/images/flags/gb.webp");
    expect(nationalityToFlag("LEC")).toBe("/images/flags/mc.webp");
    expect(nationalityToFlag("NOR")).toBe("/images/flags/gb.webp");
    expect(nationalityToFlag("PIA")).toBe("/images/flags/au.webp");
  });

  it("prioritizes driver codes over ISO codes (NOR = Norris, not Norway)", () => {
    expect(nationalityToFlag("NOR")).toBe("/images/flags/gb.webp");
  });

  it("handles nationality with leading/trailing whitespace", () => {
    expect(nationalityToFlag("  British  ")).toBe("/images/flags/gb.webp");
  });

  it("returns null for unknown nationality", () => {
    expect(nationalityToFlag("Martian")).toBeNull();
  });

  it("is case-insensitive for nationality strings", () => {
    expect(nationalityToFlag("AUSTRALIAN")).toBe("/images/flags/au.webp");
    expect(nationalityToFlag("australian")).toBe("/images/flags/au.webp");
    expect(nationalityToFlag("Australian")).toBe("/images/flags/au.webp");
  });

  it("handles multi-word nationalities", () => {
    expect(nationalityToFlag("New Zealander")).toBe("/images/flags/nz.webp");
    expect(nationalityToFlag("South African")).toBe("/images/flags/za.webp");
  });

  it("maps F1 Academy driver codes", () => {
    expect(nationalityToFlag("GAD")).toBe("/images/flags/nl.webp");
    expect(nationalityToFlag("BRU")).toBe("/images/flags/gb.webp");
  });
});
