import {
  createContext,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { routeFromLocation, routeHref, usesHashRoutes } from "./route-location";
const portable = import.meta.env.MODE === "portable";
const RouterContext = createContext({
  path: "/",
  hashRoutes: false,
  navigate: (_path: string) => {},
});
export function Router({ children }: { children: ReactNode }) {
  const hashRoutes = usesHashRoutes(window.location, portable);
  const [path, setPath] = useState(() =>
    routeFromLocation(window.location, portable),
  );
  useEffect(() => {
    const update = () => setPath(routeFromLocation(window.location, portable));
    window.addEventListener("popstate", update);
    window.addEventListener("hashchange", update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("hashchange", update);
    };
  }, []);
  const navigate = (to: string) => {
    if (to === path) return;
    if (hashRoutes) window.location.hash = routeHref(to, true);
    else history.pushState(null, "", to);
    setPath(to);
    window.scrollTo({ top: 0 });
  };
  return (
    <RouterContext.Provider value={{ path, hashRoutes, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}
export const useRouter = () => useContext(RouterContext);
export function Link({
  href = "/",
  children,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { navigate, hashRoutes } = useRouter();
  return (
    <a
      {...props}
      href={routeHref(href, hashRoutes)}
      onClick={(event) => {
        onClick?.(event);
        if (
          !event.defaultPrevented &&
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey &&
          (!props.target || props.target === "_self")
        ) {
          event.preventDefault();
          navigate(href);
        }
      }}
    >
      {children}
    </a>
  );
}
