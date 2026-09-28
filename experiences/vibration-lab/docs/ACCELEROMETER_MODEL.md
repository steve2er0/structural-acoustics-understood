# Lab 04 — Piezoelectric Accelerometer

This is a focused, independent experiment at `/labs/accelerometer`. It uses the existing Vibration Lab renderer, controls, camera presets, annotations, plots, and tour transport. It does not connect to Shaker, Isolation, or Modal Testing state. It is part of the app build, not a single-file HTML export.

## Architecture and geometry

The representative sensor uses **annular shear** throughout: a central post fixed to the mounting base, a radial piezoceramic ring with inner/outer electrodes, an outer seismic mass, and a shrink-fit preload collar. Axial inertial loading shears the ring. An insulated electronics board conditions the signal and connects to the top coaxial connector. The visible stud attaches to an aluminum test surface.

The geometry is an original teaching schematic, not a manufacturer's design or a dimensionally qualified product. Assembled, cutaway, and exploded views show the same components. Exploded separation is for inspection; the physics continues to represent the assembled sensor.

## Representative parameters

| Quantity                                 |                             Value | Status                                 |
| ---------------------------------------- | --------------------------------: | -------------------------------------- |
| Seismic mass, m                          |                          0.003 kg | Chosen example                         |
| Internal natural frequency, fn           |                         24,000 Hz | Chosen example                         |
| Internal damping ratio, ζ                |                             0.075 | Chosen example                         |
| Stiffness, k = m(2πfn)²                  |                        68.22 MN/m | Derived                                |
| Viscous damping, c = 2ζm(2πfn)           |                       67.86 N·s/m | Derived                                |
| Effective piezo coefficient, d           |                          250 pC/N | Single-axis teaching coefficient       |
| Nominal sensitivity, S                   |            0.1 / 9.80665 V/(m/s²) | 100 mV/g                               |
| Electrical high-pass corner, fc          |                            0.5 Hz | Chosen example                         |
| Equivalent charge conversion capacitance |                          73.55 pF | Derived to match S                     |
| IEPE supply / bias                       | 4 mA, 24 V compliance / 12 V bias | Representative operating point         |
| Assumed AC headroom                      |                              ±8 V | Entire available sweep stays inside it |

These are not quoted commercial specifications. The references below support the sensing architecture, operating principle, and qualitative frequency limits; the numerical example is explicitly chosen here.

## Signs, dynamics, and charge

Positive acceleration is along the sensor's axial measurement direction (drawn upward). Let z = x_mass − x_base. SI acceleration is in m/s²; the UI uses g = 9.80665 m/s².

```text
m z̈ + c ż + k z = −m a_base
F_drive = −m a_base
F_piezo = k z
F_damping = c ż
F_piezo + F_damping = −m(a_base + z̈)
```

The green arrow represents housing acceleration. The amber arrow is the inertial **drive in the housing frame**, not the complete inertia of the mass in a fixed frame. In the flat band, elastic piezo load is approximately −ma_base. Near resonance the elastic load and relative motion amplify; the numerical force-balance test retains the damping contribution.

With sinusoidal phasors sampled as `Re(H) sin(θ) + Im(H) cos(θ)`:

```text
r = f / fn
Hm = 1 / (1 − r² + i 2ζr)
Z = −A Hm / (2πfn)²
F_piezo = −m A Hm
Q = d F_piezo
He = i(f/fc) / (1 + i(f/fc))
Ceff = d m / S
Vac = −He Q / Ceff = S A Hm He
Vwire = 12 V + Vac
```

The effective `Q = dF` law describes only the axial shear loading path. It does not implement the piezoelectric tensor or imply that the dissipative branch generates charge. Electrode and conditioning polarity are chosen to give positive AC voltage for positive flat-band acceleration. Reversing the manual input reverses force, charge, voltage, and relative displacement.

The mechanical and electrical transfer functions are complex. Their product drives the response curve, marker, waveform amplitudes, phase, and live geometry. No hand-drawn response envelope is used. The marked usable band is the contiguous region around 100 Hz within ±5% amplitude error; the unity crossing above resonance is not included.

## Manual, sine, and sweep conventions

**Manual** is a frozen flat-band dynamic instant. Holding the slider does not simulate a sustained DC test. This is stated beside the controls, below the signal chain, and in model notes. It makes the primary chain directly readable: 1 g → 100 mV, 5 g → 500 mV, 10 g → 1.00 V. At 10 g the inertial drive is −0.2941995 N, generated charge is −73.549875 pC, and physical relative displacement magnitude is 4.3126 nm.

**Sine** accepts nonnegative **peak** amplitude, 0–10 g, over 0.02–60,000 Hz. Peak labels and instantaneous labels are distinct; there is no hidden RMS conversion. At 100 Hz and 10 g peak the result is approximately 1 V peak. At 24 kHz, the mechanical gain is 6.6667, the phase is approximately −90°, and the output is approximately 6.6667 V peak. Internal relative motion is approximately 28.75 nm peak.

At 0.05 Hz, 10 g still gives approximately 0.2942 N elastic load and 73.55 pC source charge, but only 0.09950 V AC output. The effective RC/conditioning path attenuates the slow signal. At true DC, `He(0) = 0` while the static mechanical relation remains finite.

The 26-second frequency sweep is a sequence of **steady-state** solutions at fixed input amplitude, not a time-domain chirp with settling transients. Pause freezes progress; resume continues from the same point. The guided tour has 21 stages over 88 seconds and includes its own shorter illustrative sweep.

## One physical state, separate drawing scales

`physics.ts` contains the SI equations, `solve()` derives complex amplitudes, and `sample()` derives every instantaneous quantity from one phase. The scene samples that solution; native text readouts refresh at 20 Hz. Waveform curves use the same sampler and phase convention, with an actual-frequency time axis.

High-frequency visual playback is capped at 0.75 Hz. This affects only the phase clock for viewing, not the transfer functions, physical amplitudes, labels, or time axis. Below 0.75 Hz, visual and actual frequencies agree.

Relative crystal deformation is exaggerated by 40,000× under the scene's nominal 10 mm/unit drawing convention; physical values remain in nanometres. The crystal is sheared continuously between its inner and outer surfaces, with the mass and collar following the outer interface. Housing translation is a normalized direction cue. In sine mode it is opposite acceleration, as sinusoidal displacement should be. It does not assert actual travel or the feasibility of producing 10 g at extremely low frequency.

## Scope and limits

The mount is an ideal rigid stud. Mount compliance, transverse sensitivity, temperature, crystal nonlinearity, housing modes, cable capacitance, electronics noise and detailed circuitry are excluded. These are representative linear mechanics and an effective first-order electrical model, not a sensor calibration or qualification tool. The specified 10 g sweep stays within the assumed IEPE headroom, so the displayed voltage does not require an unmodeled clip.

## Sources

- [PCB — Sensing geometries for piezoelectric accelerometers](https://www.pcb.com/sensors-for-test-measurement/accelerometers/sensing-geometries): central post, crystal and surrounding mass in shear architectures.
- [PCB — Introduction to piezoelectric accelerometers](https://www.pcb.com/resources/technical-information/introduction-to-accelerometers): internal resonance, mass/stiffness tradeoff and low-frequency discharge behavior.
- [PCB — Signal conditioning basics](https://www.pcb.com/resources/technical-information/signal-conditioning-basics): constant-current powering, shared signal cable, bias voltage and decoupling.

The underlying generic SDOF equations and the numerical assumptions above are exposed rather than inferred from a named commercial sensor.
