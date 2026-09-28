import { describe, expect, it } from "vitest";
import { routeFromLocation, routeHref, usesHashRoutes } from "./route-location";
import { LABS } from "./labs";
describe("web and portable document navigation", () => {
  it("opens a Windows or Mac HTML path on the home page", () => {
    for (const pathname of [
      "/C:/Users/Engineer/Desktop/Vibration-Lab.html",
      "/Users/test/Lab%20demos/Vibration-Lab.html",
    ])
      expect(routeFromLocation({ protocol: "file:", pathname, hash: "" })).toBe(
        "/",
      );
  });
  it("keeps each lab link in the same document and restores it on reload", () => {
    for (const lab of LABS) {
      const href = routeHref(lab.route, true);
      expect(href).toBe(`#${lab.route}`);
      expect(
        routeFromLocation({
          protocol: "file:",
          pathname: "/C:/Lab.html",
          hash: href,
        }),
      ).toBe(lab.route);
    }
    expect(routeHref("/", true)).toBe("#/");
  });
  it("uses fragments for the portable file even when served over HTTP", () => {
    const location = {
      protocol: "https:",
      pathname: "/downloads/Vibration-Lab.html",
      hash: "#/labs/modal/",
    };
    expect(usesHashRoutes(location, true)).toBe(true);
    expect(routeFromLocation(location, true)).toBe("/labs/modal");
  });
  it("preserves the web app's existing pathname routes", () => {
    const location = {
      protocol: "http:",
      pathname: "/labs/vortex/",
      hash: "#/labs/modal",
    };
    expect(usesHashRoutes(location)).toBe(false);
    expect(routeFromLocation(location)).toBe("/labs/vortex");
    expect(routeHref("/labs/vortex", false)).toBe("/labs/vortex");
  });
});
