# Codex task: Redesign the “Structural Acoustics, Understood” homepage

You are modifying an existing website named **Structural Acoustics, Understood**.

The image attached to this task, or the repository file `docs/design/structural-acoustics-homepage-reference.png`, is the visual north star for the redesign.

## Goal

Redesign the existing homepage so it has the same visual hierarchy, density, polish, and engineering character as the reference image while preserving the site’s current content, tools, demos, routes, and underlying architecture.

This is a real frontend implementation—not a static mockup.

## First: inspect before editing

Before changing files:

1. Inspect the repository and identify:
   - framework and build system;
   - homepage route and relevant components;
   - styling approach and design tokens;
   - current chapter, demo, calculator, and navigation data;
   - existing tests, lint commands, and preview/build commands.
2. Briefly summarize the implementation plan.
3. Work in a new branch or isolated worktree named something like `homepage-atlas-redesign`.
4. Do not replace the application architecture or introduce a new framework unless the current project truly cannot support the design.

## Non-negotiable constraints

- Preserve all existing educational content, calculations, demos, and routes.
- Limit the first implementation to the homepage and shared navigation components required by it.
- Do **not** use the reference screenshot as a background image.
- Rebuild the design using real semantic HTML, reusable components, CSS, and SVG/image assets.
- Do not make the site look like a generic SaaS dashboard. It should feel like a sophisticated structural-acoustics knowledge system.
- Do not use copyrighted or proprietary launch-vehicle geometry. The vehicle must be generic, original, and non-branded.
- Avoid heavy 3D/WebGL dependencies for this first pass. Prefer SVG, CSS, and lightweight image assets.
- Do not break existing URLs.

## Required homepage structure

### 1. Global header

Create a slim, dark header with:

- logo/wordmark: `STRUCTURAL ACOUSTICS` with `UNDERSTOOD` as an accented second line;
- primary navigation:
  - Learn
  - Solve
  - Explore
  - Hardware
  - Workflows
  - Tools
- short secondary descriptors under or beside the nav labels on wide screens;
- search affordance on the right;
- responsive mobile menu.

Map these items to existing routes where possible. Where the new information architecture does not yet have a route, use a centralized route configuration and a clearly marked temporary destination rather than scattering placeholder URLs through components.

### 2. Hero / structural atlas

The first viewport should be visually dominated by a **generic launch-vehicle structural atlas**.

Layout on desktop:

- left: primary message and CTA;
- center: large diagonal or vertical generic launch-vehicle cutaway/sectioned visual;
- right: Quick Start panel;
- contextual labels and engineering callouts around the vehicle.

Suggested headline:

> Understand how vibration and sound move through structures.

Suggested supporting copy:

> A visual, connected knowledge base built from acoustics fundamentals and launch-vehicle vibroacoustics practice—linking theory, engineering judgment, interactive demos, and real-world workflows.

Primary CTA: `Start exploring`

### 3. Interactive launch-vehicle atlas

Implement the atlas as a reusable, data-driven component such as `LaunchVehicleAtlas`.

At minimum, include these generic sections:

- Payload fairing / payload region
- Forward skirt / upper structure
- Upper tank barrel
- Intertank / transition structure
- Lower tank barrel
- Engine section / propulsion region

Each section must support:

- pointer hover;
- keyboard focus;
- visible highlight state;
- short tooltip or adjacent detail panel;
- click/tap behavior that links to or filters relevant hardware/concept content;
- accessible text labels and ARIA descriptions.

Example subject mappings:

- Payload fairing: acoustic environment, panel response, cavity coupling
- Forward skirt: structural modes, shock transmission, joint behavior
- Tank barrel: bending waves, shell modes, ring frequency, acoustic radiation
- Intertank: shell vibration, acoustic coupling, fluid-structure interaction
- Engine section: turbomachinery forcing, pyroshock, mount loads

Store atlas sections and mappings in a configuration/data file so new sections can be added without rewriting the component.

### 4. Vehicle visual asset

Preferred implementation:

- Use the available image-generation capability to create an original, transparent-background, non-branded launch-vehicle cutaway or technical illustration with a diagonal three-quarter view similar in visual weight to the reference.
- Keep all labels and UI text out of the generated image.
- Overlay the image with responsive SVG hotspot regions for interaction.

Fallback implementation:

- Build a polished original SVG vehicle using cylinders, shells, rings, tanks, trusses, and engine shapes.
- Use segmented groups so each vehicle region can highlight independently.

Do not block the entire redesign if the perfect asset is not immediately available. Build the component architecture so the visual can be upgraded later without changing the interaction model.

### 5. Quick Start panel

Create a stacked panel with six entry points:

- I want to learn
- I have a problem
- Explore the map
- Browse by hardware
- Follow a workflow
- Use a tool

Each item should have:

- a simple original line icon;
- title;
- one-line descriptor;
- hover/focus state;
- route mapped to existing content where possible.

### 6. Six Ways to Navigate

Below the hero, create six equal or responsive cards:

1. Learn — build understanding step by step
2. Solve — begin with an observed engineering problem
3. Explore — see how concepts are connected
4. Hardware — explore components and their physics
5. Workflows — follow proven analysis and test paths
6. Tools — calculate, visualize, and experiment

Each card should include a compact visual—not just an icon. Use lightweight SVG/CSS motifs such as:

- wave field or mode shape;
- PSD traces;
- concept network;
- shell section;
- workflow diagram;
- response surface or frequency plot.

Do not use decorative visuals that have no relationship to structural acoustics.

### 7. Featured demos and tools

Create a horizontal or responsive featured strip using actual existing tools where available. Prioritize:

- Bending-wave dispersion
- Critical-frequency calculator
- Ring-frequency explorer
- Transmission-loss explorer
- PSD combiner
- Modal-density visualizer

Each tile should include:

- title;
- one-sentence purpose;
- small engineering visualization;
- valid link to the corresponding tool.

If one of these tools does not exist yet, substitute a real existing tool rather than creating broken links.

## Visual design system

Use a refined dark technical aesthetic derived from the reference image.

Suggested starting tokens:

```css
--bg-deep: #04101f;
--bg: #07182a;
--surface: rgba(12, 31, 52, 0.82);
--surface-strong: #0d2239;
--border: rgba(145, 181, 222, 0.22);
--text: #f3f7fc;
--text-muted: #9eb1c8;
--cyan: #55b8ff;
--blue: #6f8cff;
--violet: #9478ff;
--gold: #f2c663;
--green: #58d59b;
--coral: #ff8888;
```

Design qualities:

- deep navy background with subtle star/grid/noise texture;
- restrained gradients and faint glows;
- thin technical borders;
- crisp white typography;
- blue/violet accents with small purposeful variations by navigation mode;
- generous spacing and strong alignment;
- technical callout lines around the atlas;
- subtle motion only where it improves comprehension.

Use an existing project font if appropriate. Otherwise prefer a clean local/system sans-serif stack. Do not add a large font dependency merely for appearance.

## Responsive behavior

Desktop:

- preserve the wide, cinematic composition from the reference;
- keep the vehicle as the central visual anchor.

Tablet:

- allow the hero to become a two-column layout;
- move Quick Start below or beside the atlas based on available width.

Mobile:

- stack headline, atlas, selected-section detail, and Quick Start;
- keep all atlas regions tappable;
- replace dense callout labels with a selected-section panel;
- avoid tiny text and horizontal overflow;
- keep the six navigation cards usable as a one- or two-column grid.

## Interaction and accessibility

- All interactive elements must work with keyboard, pointer, and touch.
- Use clear focus-visible states.
- Maintain readable contrast.
- Respect `prefers-reduced-motion`.
- Add semantic landmarks and heading order.
- Avoid conveying meaning through color alone.
- Include useful alt text or accessible SVG titles/descriptions.

## Engineering and code quality

- Reuse the project’s existing conventions.
- Create composable components rather than one monolithic homepage file.
- Keep navigation, atlas sections, and featured tools data-driven.
- Avoid duplicated route definitions.
- Avoid new dependencies unless they provide clear value.
- Run formatter, lint, tests, and production build.
- Fix any regressions introduced by the redesign.

## Visual QA loop

After implementation:

1. Run the site locally.
2. Open the homepage in the browser at desktop width around 1440–1600 px.
3. Compare it directly with the reference image.
4. Iterate on hierarchy, spacing, vehicle prominence, typography, and card density until the first viewport clearly belongs to the same visual family.
5. Test at approximately 1024 px, 768 px, and 390 px widths.
6. Capture final desktop and mobile screenshots for review.

## Deliverables

At completion, provide:

- a concise summary of the chosen implementation;
- the files changed;
- any new assets created;
- commands run and test/build results;
- desktop and mobile screenshots;
- a short note explaining how to add another atlas section, navigation card, or featured tool.

## Success criteria

The task is complete when:

- the homepage immediately communicates “structural acoustics” and “launch-vehicle vibroacoustics” visually;
- the generic launch vehicle is the central hero element;
- the six navigation modes are clear within seconds;
- the atlas is genuinely interactive rather than decorative;
- existing content and tools remain accessible;
- the page closely matches the reference image’s polish without merely copying it as a flat image;
- the layout is responsive, accessible, and production-build clean.
