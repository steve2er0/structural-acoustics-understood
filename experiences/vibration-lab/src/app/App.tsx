import { lazy, Suspense, useEffect } from "react";
import Home from "./Home";
import { Link, useRouter } from "./router";
const RS25 = lazy(() => import("../labs/rs25/App"));
const Vortex = lazy(() => import("../labs/vortex/App"));
const TBL = lazy(() => import("../labs/tbl/App"));
const Cryo = lazy(() => import("../labs/cryo/App"));
const SEA = lazy(() => import("../labs/sea/App"));
const Isolation = lazy(() => import("../labs/isolation/App"));
const Accelerometer = lazy(() => import("../labs/accelerometer/App"));
const Modal = lazy(() => import("../labs/modal/App"));
const Shaker = lazy(() => import("../labs/shaker/ui/App"));
const Template = import.meta.env.DEV
  ? lazy(() => import("../dev/LabTemplate"))
  : null;
export default function App() {
  const { path } = useRouter();
  useEffect(() => {
    document.title = `${path === "/labs/cryo" ? "Cryogenic Tank Modes · " : path === "/labs/tbl" ? "Pressure Fields on a Panel · " : path === "/labs/vortex" ? "Vortex Shedding · " : path === "/labs/isolation" ? "Vibration Isolation · " : path === "/labs/shaker" ? "Electrodynamic Shaker · " : path === "/labs/modal" ? "Experimental Modal Testing · " : path === "/labs/accelerometer" ? "Piezoelectric Accelerometer · " : path === "/labs/rs25" ? "Inside the RS-25 · " : path === "/labs/sea" ? "Statistical Energy Analysis · " : path === "/dev/lab-template" ? "Development Template · " : ""}Vibration Lab`;
  }, [path]);
  return (
    <Suspense
      fallback={
        <div className="vl-route-loading">
          <span className="vl-wordmark">VIBRATION LAB</span>
          <p>Preparing the experiment…</p>
        </div>
      }
    >
      {path === "/" ? (
        <Home />
      ) : path === "/labs/cryo" ? (
        <div className="lab-cryo">
          <Cryo />
        </div>
      ) : path === "/labs/tbl" ? (
        <div className="lab-tbl">
          <TBL />
        </div>
      ) : path === "/labs/vortex" ? (
        <div className="lab-vortex">
          <Vortex />
        </div>
      ) : path === "/labs/isolation" ? (
        <div className="lab-isolation">
          <Isolation />
        </div>
      ) : path === "/labs/shaker" ? (
        <div className="lab-shaker">
          <Shaker />
        </div>
      ) : path === "/labs/modal" ? (
        <div className="lab-modal">
          <Modal />
        </div>
      ) : path === "/labs/accelerometer" ? (
        <div className="lab-accelerometer">
          <Accelerometer />
        </div>
      ) : path === "/labs/rs25" ? (
        <div className="lab-rs25">
          <RS25 />
        </div>
      ) : path === "/labs/sea" ? (
        <div className="lab-sea">
          <SEA />
        </div>
      ) : path === "/dev/lab-template" && Template ? (
        <Template />
      ) : (
        <main className="vl-not-found">
          <p className="vl-eyebrow">404 / NO EXPERIMENT HERE</p>
          <h1>Back to the lab.</h1>
          <Link href="/">View the experiments →</Link>
        </main>
      )}
    </Suspense>
  );
}
