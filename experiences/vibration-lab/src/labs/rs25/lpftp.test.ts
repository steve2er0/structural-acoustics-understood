import { describe, it, expect } from "vitest";
import {
  DEFAULT_LPFTP,
  lpftpRpm,
  lpftpState,
  lpftpPressure,
  cavityPulse,
} from "./lpftp";
describe("LPFTP frequency and forcing illustration", () => {
  it("passes through the published 104.5% / 15,761 rpm point", () => {
    expect(lpftpRpm(104.5)).toBeCloseTo(15761, 8);
    const s = lpftpState(104.5, true, DEFAULT_LPFTP);
    expect(s.shaftHz).toBeCloseTo(262.6833333333, 8);
    expect(s.bpfHz).toBeCloseTo(1050.733333333, 7);
  });
  it("moves Hz with the declared speed map while preserving shaft orders", () => {
    const low = lpftpState(67, true, DEFAULT_LPFTP),
      high = lpftpState(109, true, DEFAULT_LPFTP);
    low.lines.forEach((l, i) => {
      expect(high.lines[i].hz / l.hz).toBeCloseTo(Math.sqrt(109 / 67), 10);
      expect(high.lines[i].order).toBe(l.order);
    });
  });
  it("keeps HOSC separate from blade-pass harmonics", () => {
    const s = lpftpState(100, true, DEFAULT_LPFTP);
    expect(s.hoscHz).toBeGreaterThan(s.bpfHz);
    expect(s.hoscHz).toBeLessThan(s.bpfHz * 2);
    expect(s.hoscBand[0] / s.shaftHz).toBeCloseTo(6.4);
    expect(s.hoscBand[1] / s.shaftHz).toBeCloseTo(6.7);
  });
  it("removes only the selected family and preserves other amplitudes", () => {
    const combined = lpftpState(100, true, DEFAULT_LPFTP);
    const tones = lpftpState(100, true, {
      ...DEFAULT_LPFTP,
      source: "Blade tones",
    });
    const cav = lpftpState(100, true, {
      ...DEFAULT_LPFTP,
      source: "Cavitation",
    });
    expect(tones.lines[3].rms).toBe(0);
    expect(tones.lines.slice(0, 3)).toEqual(combined.lines.slice(0, 3));
    expect(cav.lines.slice(0, 3).every((l) => l.rms === 0)).toBe(true);
    expect(cav.lines[3].rms).toBe(combined.lines[3].rms);
  });
  it("treats strength as forcing amplitude, not a change in frequency", () => {
    const a = lpftpState(100, true, { ...DEFAULT_LPFTP, strength: 0.25 });
    const b = lpftpState(100, true, { ...DEFAULT_LPFTP, strength: 0.5 });
    expect(b.lines[3].rms).toBeCloseTo(2 * a.lines[3].rms);
    expect(b.hoscHz).toBe(a.hoscHz);
    expect(
      lpftpState(100, true, { ...DEFAULT_LPFTP, strength: 0 }).cavitation,
    ).toBe(0);
  });
  it("has no forcing or frequency readout with engine off", () => {
    const s = lpftpState(100, false, DEFAULT_LPFTP);
    expect(s.rpm).toBe(0);
    expect(s.rms).toBe(0);
    expect(lpftpPressure(s, 0.003)).toBe(0);
    expect(s.lines.every((l) => l.hz === 0 && l.rms === 0)).toBe(true);
  });
  it("matches RMS by independently integrating an integer-period synthetic record", () => {
    const s = lpftpState(104.5, true, DEFAULT_LPFTP);
    // 20 revolutions closes the 6.55N line (131 cycles) and all blade harmonics.
    const duration = 20 / s.shaftHz,
      samples = 32768;
    let square = 0,
      mean = 0;
    for (let i = 0; i < samples; i++) {
      const p = lpftpPressure(s, (duration * i) / samples);
      mean += p;
      square += p * p;
    }
    expect(mean / samples).toBeCloseTo(0, 10);
    expect(Math.sqrt(square / samples)).toBeCloseTo(s.rms, 10);
  });
  it("keeps independent cavity phase and shaft phase in the time signal", () => {
    const s = lpftpState(100, true, {
      ...DEFAULT_LPFTP,
      source: "Cavitation",
      strength: 1,
    });
    expect(lpftpPressure(s, 0, 0.8, 0.25)).toBeCloseTo(Math.SQRT2 * 1.15);
    expect(lpftpPressure(s, 0, 0.1, 0.25)).toBeCloseTo(
      lpftpPressure(s, 0, 0.8, 0.25),
    );
    expect(cavityPulse(0)).toBe(1);
    expect(cavityPulse(0.5)).toBe(0);
  });
  it("bounds invalid controls to finite values", () => {
    for (const power of [NaN, -1, Infinity, 999]) {
      const s = lpftpState(power, true, {
        source: "Combined",
        strength: NaN,
        order: Infinity,
      });
      expect(Number.isFinite(s.rpm + s.rms + s.hoscHz)).toBe(true);
      expect(s.order).toBe(6.55);
    }
    expect(
      lpftpState(100, true, { ...DEFAULT_LPFTP, order: 9, strength: 2 }).order,
    ).toBe(6.7);
  });
});
