/** Local HTML files use fragments so navigation never leaves the saved document. */
export interface RouteLocation {
  protocol: string;
  pathname: string;
  hash: string;
}
const normalize = (path: string) => path.replace(/\/+$/, "") || "/";
export const usesHashRoutes = (
  location: Pick<RouteLocation, "protocol">,
  portable = false,
) => portable || location.protocol === "file:";
export function routeFromLocation(location: RouteLocation, portable = false) {
  if (!usesHashRoutes(location, portable)) return normalize(location.pathname);
  return location.hash.startsWith("#/")
    ? normalize(location.hash.slice(1))
    : "/";
}
export const routeHref = (path: string, hashRoutes: boolean) =>
  `${hashRoutes ? "#" : ""}${normalize(path)}`;
