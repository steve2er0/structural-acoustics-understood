import { describe, expect, it } from "vitest";
import { GRID } from "./physics";
import { nearestPoint } from "./placement";

describe("instrument placement", () => {
  it("snaps exact plate locations without changing their identity", () => {
    GRID.forEach((point, i) => {
      expect(nearestPoint(point.x, point.y, (i + 1) % GRID.length)).toBe(i);
    });
  });
  it("keeps instruments separate and compares physical plate distances", () => {
    expect(nearestPoint(0.31, -0.5, 3)).toBe(8);
    GRID.forEach((point, occupied) => {
      expect(nearestPoint(point.x, point.y, occupied)).not.toBe(occupied);
    });
  });
  it("keeps a drag released beyond the plate on an available edge point", () => {
    expect(nearestPoint(-10, -10, 4)).toBe(0);
    expect(nearestPoint(10, 10, 0)).toBe(14);
  });
});
