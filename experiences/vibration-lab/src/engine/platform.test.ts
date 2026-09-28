import { describe, expect, it } from "vitest";
import {
  convert,
  formatSI,
  GRAVITY,
  LB_TO_KG,
  toSI,
  fromSI,
  UNITS,
} from "./units";
import {
  fromLogPosition,
  logPosition,
  sharedMotionGain,
  visualLength,
} from "./scaling";
import { seekStep, timelineAt, tourDuration } from "./timeline";
import { TOUR, tourParameters } from "../labs/isolation/tour";
import { solve } from "../labs/isolation/physics";
import { ASSEMBLY, SHAKER, GENERATOR } from "../labs/isolation/scene-layout";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ParameterSlider } from "../components/Controls";

describe("SI boundaries and dimensional display", () => {
  it("round-trips each supported unit without modifying its SI source", () => {
    for (const unit of Object.keys(UNITS) as (keyof typeof UNITS)[])
      expect(toSI(fromSI(1.23456, unit), unit)).toBeCloseTo(1.23456, 12);
  });
  it("converts force, stiffness, frequency, mass, travel and acceleration correctly", () => {
    expect(convert(1, "lbf", "N")).toBeCloseTo(4.4482216152605, 12);
    expect(convert(1, "lbf/in", "N/m")).toBeCloseTo(175.126835246476, 10);
    expect(convert(1, "Hz", "rad/s")).toBeCloseTo(2 * Math.PI, 12);
    expect(convert(10, "lbm", "kg")).toBeCloseTo(10 * LB_TO_KG, 12);
    expect(convert(1, "in", "mm")).toBeCloseTo(25.4, 12);
    expect(convert(1, "g", "m/s²")).toBe(GRAVITY);
    expect(formatSI(0.001234, "mm")).toBe("1.23 mm");
  });
  it("rejects cross-dimension conversions", () =>
    expect(() => convert(1, "N", "kg")).toThrow("Incompatible"));
});
describe("visual mappings retain physical relationships", () => {
  it("round-trips both lab frequency domains and stiffness logarithmically", () => {
    for (const [min, max] of [
      [1, 600],
      [1, 2000],
      [20000, 320000],
    ])
      for (let i = 0; i <= 100; i++) {
        const v = fromLogPosition(i / 100, min, max);
        expect(logPosition(v, min, max)).toBeCloseTo(i / 100, 12);
      }
    expect(fromLogPosition(-1, 1, 600)).toBe(1);
    expect(fromLogPosition(2, 1, 600)).toBe(600);
  });
  it("limits one common gain, preserving ratios and relative travel", () => {
    const gain = sharedMotionGain(0.002, 0.085, 0.012, 0.46);
    expect(0.012 * gain).toBeCloseTo(0.46);
    expect((0.012 * gain) / (0.002 * gain)).toBeCloseTo(6);
    expect(visualLength(-400, 0.01, 2)).toBe(2);
  });
  it("keeps the corrected isolation fixture inside the shaker aperture", () => {
    const fixtureCorner = Math.hypot(4.94 / 2, 3.79 / 2) * ASSEMBLY.scale;
    const tableRadius = 3.35 * ASSEMBLY.scale;
    expect(tableRadius - fixtureCorner).toBeGreaterThan(0.14);
    expect(SHAKER.radius - tableRadius).toBeGreaterThan(0.12);
    expect(ASSEMBLY.scale).toBe(0.62);
    expect(GENERATOR.scale).toBe(0.58);
  });
});
describe("content-independent tour timing", () => {
  const steps = [{ duration: 3.8 }, { duration: 2.2 }, { duration: 7 }];
  it("handles exact floating point boundaries, varied durations, and terminal sampling", () => {
    expect(tourDuration(steps)).toBe(13);
    expect(timelineAt(steps, 3.8).index).toBe(1);
    expect(timelineAt(steps, 6).index).toBe(2);
    expect(timelineAt(steps, -4).progress).toBe(0);
    expect(timelineAt(steps, 100).progress).toBe(1);
  });
  it("steps deterministically while paused and clamps at each end", () => {
    expect(seekStep(steps, 0, -1)).toBe(0);
    expect(seekStep(steps, 1, 1)).toBe(3.8);
    expect(seekStep(steps, 3.8, 1)).toBe(6);
    expect(seekStep(steps, 6, -1)).toBe(3.8);
    expect(seekStep(steps, 13, 1)).toBe(6);
  });
  it("rejects empty or zero-duration content", () => {
    expect(() => timelineAt([], 0)).toThrow();
    expect(() => timelineAt([{ duration: 0 }], 0)).toThrow();
  });
  it("isolation content reaches resonance, damps the peak, then isolates", () => {
    expect(TOUR).toHaveLength(5);
    const resonance = solve(tourParameters(2)),
      damped = solve(tourParameters(3)),
      isolated = solve(tourParameters(4));
    expect(resonance.r).toBeCloseTo(1);
    expect(resonance.T).toBeCloseTo(6.329494450586082, 8);
    expect(damped.T).toBeLessThan(resonance.T);
    expect(isolated.T).toBeLessThan(0.08);
  });
});
it("logarithmic controls expose engineering values to assistive technology", () => {
  const html = renderToStaticMarkup(
    createElement(ParameterSlider, {
      label: "Frequency",
      value: 100,
      min: 1,
      max: 600,
      logarithmic: true,
      unit: "Hz",
      onValue: () => {},
      disabled: true,
    }),
  );
  expect(html).toContain('aria-valuetext="100 Hz"');
  expect(html).toContain('aria-label="Frequency"');
  expect(html).toContain('disabled=""');
});
