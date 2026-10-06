import { describe, expect, it } from "vitest";
import { DEFAULT, frequencyRange, modes, type Settings } from "./physics";
import { TOUR } from "./tour";

describe("panel pressure-field guided lesson", () => {
  it("keeps every stage within the model and control domains", () => {
    for (const step of TOUR) {
      const state: Settings = { ...DEFAULT, ...step.settings };
      if (step.resonance) {
        state.frequency = modes(state).find(
          (mode) => mode.m === state.modeX && mode.n === state.modeY,
        )!.frequency;
        state.velocity =
          (2 * state.frequency * state.length) /
          state.modeX /
          state.convectionRatio;
      }
      const range = frequencyRange(state);
      expect(state.frequency).toBeGreaterThanOrEqual(range.minFrequency);
      expect(state.frequency).toBeLessThanOrEqual(
        range.recommendedMaxFrequency,
      );
      expect(state.velocity).toBeGreaterThanOrEqual(40);
      expect(state.velocity).toBeLessThanOrEqual(350);
      expect(state.bandwidth).toBeLessThanOrEqual(state.frequency * 0.1);
      for (const tap of [state.ax, state.ay, state.bx, state.by]) {
        expect(tap).toBeGreaterThanOrEqual(0);
        expect(tap).toBeLessThanOrEqual(1);
      }
    }
  });

  it("compares all fields at equal point-pressure PSD and includes every analysis view", () => {
    expect(new Set(TOUR.map((step) => step.settings.field))).toEqual(
      new Set(["tbl", "daf", "pwf"]),
    );
    expect(new Set(TOUR.map((step) => step.tab))).toEqual(
      new Set(["Coherence", "Wavenumber", "Response"]),
    );
    expect(
      TOUR.every(
        (step) =>
          (step.settings.pressurePsd ?? DEFAULT.pressurePsd) ===
          DEFAULT.pressurePsd,
      ),
    ).toBe(true);
    expect(TOUR.reduce((sum, step) => sum + step.duration, 0)).toBe(79);
  });
});
