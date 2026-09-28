import {
  createContext,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
const RouterContext = createContext({
  path: "/",
  navigate: (_path: string) => {},
});
export function Router({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(
    window.location.pathname.replace(/\/$/, "") || "/",
  );
  useEffect(() => {
    const update = () =>
      setPath(window.location.pathname.replace(/\/$/, "") || "/");
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const navigate = (to: string) => {
    if (to === path) return;
    history.pushState(null, "", to);
    setPath(to);
    window.scrollTo({ top: 0 });
  };
  return (
    <RouterContext.Provider value={{ path, navigate }}>
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
  const { navigate } = useRouter();
  return (
    <a
      {...props}
      href={href}
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
