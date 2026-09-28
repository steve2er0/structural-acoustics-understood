export interface LabDefinition {
  id:
    | "isolation"
    | "shaker"
    | "modal"
    | "accelerometer"
    | "sea"
    | "rs25"
    | "vortex";
  number: string;
  title: string;
  description: string;
  route: string;
  subjects: string[];
  accent: string;
}
export const LABS: readonly LabDefinition[] = [
  {
    id: "isolation",
    number: "01",
    title: "Vibration Isolation",
    description:
      "Explore resonance, transmissibility, damping, and how soft mounts protect equipment from vibration.",
    route: "/labs/isolation",
    subjects: ["Resonance", "Transmissibility", "Damping"],
    accent: "#b5d9c0",
  },
  {
    id: "shaker",
    number: "02",
    title: "Electrodynamic Shaker",
    description:
      "Look inside a field-coil shaker and explore how magnetic fields, current, and force create vibration.",
    route: "/labs/shaker",
    subjects: ["Magnetic fields", "Lorentz force", "Back EMF"],
    accent: "#efbf91",
  },
  {
    id: "modal",
    number: "03",
    title: "Experimental Modal Testing",
    description:
      "Strike a suspended plate. Follow the force, the ring-down, and a resonance all the way to its physical mode shape.",
    route: "/labs/modal",
    subjects: ["Impact testing", "Frequency response", "Mode shapes"],
    accent: "#a8d5e4",
  },
  {
    id: "accelerometer",
    number: "04",
    title: "Piezoelectric Accelerometer",
    description:
      "Look inside a sensor. Follow acceleration through inertia, piezoelectric charge, and IEPE electronics to a voltage you can measure.",
    route: "/labs/accelerometer",
    subjects: ["Piezoelectricity", "IEPE", "Sensor dynamics"],
    accent: "#e7c295",
  },
  {
    id: "sea",
    number: "05",
    title: "Statistical Energy Analysis",
    description:
      "Follow energy through a Falcon 9 launch vehicle. Explore six structural regions, the fairing acoustic cavity, and the power flowing between them.",
    route: "/labs/sea",
    subjects: ["Energy flow", "Modal populations", "Power balance"],
    accent: "#b5dac3",
  },
  {
    id: "rs25",
    number: "06",
    title: "Inside the RS-25",
    description:
      "Follow cryogenic propellant through pumps, preburners and cooling passages. See how staged combustion becomes extraordinary thrust.",
    route: "/labs/rs25",
    subjects: ["Staged combustion", "Turbopumps", "Energy conversion"],
    accent: "#e9c496",
  },
  {
    id: "vortex",
    number: "07",
    title: "Vortex Shedding",
    description:
      "Change Mach, angle of attack and sideslip around a multi-body launch vehicle. Follow longitudinal leeward vortices as they develop along the vehicle and trail aft.",
    route: "/labs/vortex",
    subjects: ["Crossflow", "Strouhal scaling", "Multi-body wakes"],
    accent: "#9ed7cd",
  },
];
