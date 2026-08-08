// Original engineering content for Structural Acoustics, Understood.
export const sections = [
  {
    "id": "acoustics-db",
    "number": "01",
    "title": "Acoustics & Decibels",
    "eyebrow": "Field quantities and levels",
    "summary": "The minimum set of relationships needed to move cleanly between pressure, intensity, power, bands, weighting, and propagation.",
    "concepts": [
      {
        "title": "Pressure, intensity, and power",
        "equation": "I = p<sub>rms</sub><sup>2</sup>/(ρ₀c₀) &nbsp;&nbsp; · &nbsp;&nbsp; W = ∫<sub>S</sub> I·n dS",
        "body": "Sound pressure is a local field quantity. Intensity adds propagation direction and power flow per area. Sound power belongs to the source and is obtained by integrating outward intensity over a surface.",
        "interpretation": "Pressure changes with position and room effects; sound power is the better quantity for comparing sources.",
        "mistake": "Treating a microphone SPL as though it were the source sound-power level.",
        "toolId": "sound-power",
        "tags": [
          "SPL",
          "intensity",
          "power"
        ]
      },
      {
        "title": "Level definitions",
        "equation": "L<sub>p</sub> = 20 log₁₀(p/p₀) &nbsp;&nbsp; · &nbsp;&nbsp; L<sub>W</sub> = 10 log₁₀(W/W₀)",
        "body": "Amplitude-like quantities use 20 log because power is proportional to amplitude squared. Power-like quantities use 10 log directly. In air, p₀ = 20 μPa and W₀ = 1 pW.",
        "interpretation": "A factor of two in pressure is about +6.02 dB; a factor of two in power is about +3.01 dB.",
        "mistake": "Using 20 log for a PSD or power ratio.",
        "toolId": "db",
        "tags": [
          "dB",
          "ratio"
        ]
      },
      {
        "title": "Adding and subtracting levels",
        "equation": "L<sub>Σ</sub> = 10 log₁₀(Σ 10<sup>Lᵢ/10</sup>)",
        "body": "Decibels cannot be added arithmetically. Convert each level back to a linear power-like quantity, sum, then return to dB. Subtraction is only valid when the lower level represents a known independent contribution to the total.",
        "interpretation": "Two equal independent levels sum to +3.01 dB above either one.",
        "mistake": "Subtracting nearly equal measured levels without carrying uncertainty.",
        "toolId": "db",
        "tags": [
          "OASPL",
          "summation"
        ]
      },
      {
        "title": "Octave and fractional-octave bands",
        "equation": "f<sub>u</sub>/f<sub>l</sub> = 2<sup>1/N</sup> &nbsp;&nbsp; · &nbsp;&nbsp; f<sub>c</sub> = √(f<sub>l</sub>f<sub>u</sub>)",
        "body": "A 1/N-octave band has a constant percentage bandwidth. Exact centers are generated geometrically about 1 kHz; displayed preferred centers are rounded for reporting.",
        "interpretation": "A narrowband spectrum must be energy-summed into each band, not sampled at the center frequency.",
        "mistake": "Using arithmetic bandwidths or averaging dB values inside a band.",
        "toolId": "octave",
        "tags": [
          "octave",
          "bands"
        ]
      },
      {
        "title": "Overall level from bands",
        "equation": "L<sub>OASPL</sub> = 10 log₁₀(Σ 10<sup>Lᵢ/10</sup>)",
        "body": "Overall level is the energy sum of the included bands. State the frequency range because an overall number without bandwidth is incomplete.",
        "interpretation": "A high overall level can be driven by one dominant band or by many moderate bands; inspect both.",
        "mistake": "Comparing two OASPL values computed over different frequency ranges.",
        "toolId": "weighting",
        "tags": [
          "OASPL",
          "band sum"
        ]
      },
      {
        "title": "Plane-wave impedance",
        "equation": "Z₀ = p/u = ρ₀c₀",
        "body": "For a progressive plane wave in a lossless fluid, pressure and particle velocity are in phase and their ratio is the characteristic impedance. Near boundaries or sources, the impedance becomes complex and position-dependent.",
        "interpretation": "The plane-wave shortcut is strongest in the acoustic far field or inside a well-defined duct mode.",
        "mistake": "Using p = ρcu in a reactive near field.",
        "toolId": null,
        "tags": [
          "impedance",
          "particle velocity"
        ]
      },
      {
        "title": "Geometric spreading and directivity",
        "equation": "L<sub>p,2</sub> = L<sub>p,1</sub> − 20 log₁₀(r₂/r₁) + 10 log₁₀(Q₂/Q₁)",
        "body": "A compact source in a free field loses roughly 6 dB per doubling of distance. Cylindrical spreading is closer to 3 dB per doubling. The directivity factor Q accounts for how much of the sphere is effectively occupied.",
        "interpretation": "Spreading laws describe ideal geometry, not reflections, atmospheric absorption, or distributed sources.",
        "mistake": "Applying 6 dB per doubling inside a reverberant room or in the near field.",
        "toolId": "sound-power",
        "tags": [
          "spreading",
          "directivity"
        ]
      },
      {
        "title": "Frequency weighting",
        "equation": "L<sub>A,i</sub> = L<sub>i</sub> + A(fᵢ)",
        "body": "A- and C-weighting are frequency-dependent filters used for human-hearing metrics. Z-weighting is nominally flat. Weight each band first, then energy-sum the weighted values.",
        "interpretation": "Weighting is a reporting filter, not a correction to the physical acoustic field.",
        "mistake": "Applying one overall correction to an already-summed broadband level.",
        "toolId": "weighting",
        "tags": [
          "A-weighting",
          "C-weighting"
        ]
      },
      {
        "title": "Free, diffuse, and reactive fields",
        "equation": "I ≈ p²/(ρc) &nbsp; only when the local field is predominantly progressive",
        "body": "Free fields are dominated by outward propagation, diffuse fields by many randomized directions, and reactive fields by stored energy. The same pressure can imply very different net power flow in each case.",
        "interpretation": "Choose the field model before converting pressure to intensity or sound power.",
        "mistake": "Inferring source power from one pressure measurement without a field assumption.",
        "toolId": null,
        "tags": [
          "field type",
          "near field"
        ]
      }
    ]
  },
  {
    "id": "sdof",
    "number": "02",
    "title": "Single-Degree-of-Freedom Dynamics",
    "eyebrow": "Resonance, phase, and isolation",
    "summary": "The SDOF oscillator is the local language of modes, mounts, response spectra, and most quick vibration estimates.",
    "concepts": [
      {
        "title": "Equation of motion",
        "equation": "m ẍ + c ẋ + kx = F(t)",
        "body": "Mass stores kinetic energy, stiffness stores strain energy, and damping removes energy. Linear SDOF behavior is fully characterized by m, k, and c plus the forcing and initial conditions.",
        "interpretation": "Most modal-response formulas are SDOF equations written in modal coordinates.",
        "mistake": "Using an SDOF model when two nearby modes are strongly coupled.",
        "toolId": "sdof",
        "tags": [
          "EOM",
          "linear"
        ]
      },
      {
        "title": "Natural and damped frequency",
        "equation": "ωₙ = √(k/m) &nbsp;&nbsp; · &nbsp;&nbsp; fₙ = ωₙ/(2π) &nbsp;&nbsp; · &nbsp;&nbsp; ω<sub>d</sub> = ωₙ√(1−ζ²)",
        "body": "The undamped natural frequency comes from the mass-stiffness balance. Light damping shifts the observed free-decay frequency only slightly.",
        "interpretation": "For ζ below about 0.1, f<sub>d</sub> and f<sub>n</sub> are often nearly indistinguishable in a quick plot.",
        "mistake": "Back-calculating stiffness from a heavily damped peak without accounting for damping.",
        "toolId": "sdof",
        "tags": [
          "natural frequency"
        ]
      },
      {
        "title": "Damping ratio and Q",
        "equation": "ζ = c/(2mωₙ) &nbsp;&nbsp; · &nbsp;&nbsp; Q ≈ 1/(2ζ)",
        "body": "The damping ratio compares actual viscous damping with critical damping. Q is an inverse measure of resonance sharpness and is exact as 1/(2ζ) for the conventional SDOF definition.",
        "interpretation": "Small ζ means a tall, narrow resonance and a long ring-down.",
        "mistake": "Using Q = 1/ζ instead of Q = 1/(2ζ).",
        "toolId": "damping",
        "tags": [
          "damping",
          "Q"
        ]
      },
      {
        "title": "Force-excited frequency response",
        "equation": "X/(F₀/k) = 1 / √[(1−r²)² + (2ζr)²]",
        "body": "The static deflection F₀/k is amplified by the dynamic magnification factor. Below resonance the response is stiffness-controlled, near resonance damping-controlled, and above resonance mass-controlled.",
        "interpretation": "The phase progresses from about 0° through 90° near resonance toward 180° at high frequency.",
        "mistake": "Reading a resonance magnitude without checking whether the input is force, motion, or acceleration.",
        "toolId": "sdof",
        "tags": [
          "FRF",
          "harmonic"
        ]
      },
      {
        "title": "Base excitation",
        "equation": "|X/Y| = r² / √[(1−r²)² + (2ζr)²]",
        "body": "For base motion, X is relative displacement and Y is base displacement. Absolute acceleration has a different transfer function that approaches unity at low frequency and decays in the isolation region.",
        "interpretation": "Mount design must distinguish relative travel from transmitted absolute motion.",
        "mistake": "Using force transmissibility for a base-acceleration problem.",
        "toolId": "sdof",
        "tags": [
          "base motion",
          "relative displacement"
        ]
      },
      {
        "title": "Transmissibility and isolation",
        "equation": "T = √[(1+(2ζr)²)/((1−r²)²+(2ζr)²)]",
        "body": "For absolute motion under base excitation, isolation begins when the frequency ratio exceeds roughly √2. Added damping reduces the resonant peak but can increase high-frequency transmission.",
        "interpretation": "Damping is beneficial near resonance and can be detrimental deep in the isolation region.",
        "mistake": "Assuming more damping always improves isolation.",
        "toolId": "sdof",
        "tags": [
          "transmissibility",
          "isolation"
        ]
      },
      {
        "title": "Phase through resonance",
        "equation": "φ = atan2(2ζr, 1−r²)",
        "body": "Phase is often more diagnostic than magnitude. A clean SDOF receptance changes by about 180° through resonance; the exact phase of mobility and accelerance is shifted by differentiation.",
        "interpretation": "Phase consistency helps separate a structural resonance from a forcing tone.",
        "mistake": "Comparing FRFs with different response quantities without accounting for the ±90° or 180° shifts.",
        "toolId": "mobility",
        "tags": [
          "phase",
          "FRF"
        ]
      },
      {
        "title": "Impulse and free decay",
        "equation": "x(t) = X₀e<sup>−ζωₙt</sup> sin(ω<sub>d</sub>t+φ)",
        "body": "After an impulse, the envelope decays exponentially. The decay rate reveals damping while the oscillation period reveals damped natural frequency.",
        "interpretation": "A straight line in log-amplitude versus time is evidence of viscous-like exponential decay.",
        "mistake": "Estimating damping from a decay contaminated by beating between nearby modes.",
        "toolId": "damping",
        "tags": [
          "ring-down",
          "impulse"
        ]
      },
      {
        "title": "Broadband random response",
        "equation": "a<sub>rms</sub> ≈ √[(π/2) fₙ Q G<sub>in</sub>(fₙ)]",
        "body": "Miles’ equation estimates the narrowband response of a lightly damped SDOF to a locally flat base-acceleration PSD. It is a powerful screening relation, not a substitute for integrating a shaped spectrum.",
        "interpretation": "The response is governed mostly by the input PSD in the resonance bandwidth.",
        "mistake": "Using Miles’ equation across a steep PSD break or a broad, highly damped mode.",
        "toolId": "miles",
        "tags": [
          "random",
          "Miles"
        ]
      }
    ]
  },
  {
    "id": "damping-isolation",
    "number": "03",
    "title": "Damping & Isolation",
    "eyebrow": "Energy loss and mount behavior",
    "summary": "Damping descriptions are interchangeable only under stated assumptions. Isolation performance depends on both resonance control and high-frequency transmission.",
    "concepts": [
      {
        "title": "Viscous damping",
        "equation": "F<sub>d</sub> = c ẋ",
        "body": "Viscous damping produces a force proportional to velocity and leads to exponential free decay. It is mathematically convenient and often represents many small loss mechanisms over a narrow operating range.",
        "interpretation": "Equivalent viscous damping can be frequency-dependent when it represents a non-viscous physical treatment.",
        "mistake": "Assuming a fitted viscous coefficient remains valid over decades of frequency.",
        "toolId": "damping",
        "tags": [
          "viscous"
        ]
      },
      {
        "title": "Structural damping and loss factor",
        "equation": "k* = k(1+iη) &nbsp;&nbsp; · &nbsp;&nbsp; η ≈ 2ζ",
        "body": "Structural or hysteretic damping is represented by complex stiffness. For light damping near resonance, the loss factor η is approximately twice the viscous damping ratio.",
        "interpretation": "Loss factor is energy dissipated per radian divided by maximum stored energy.",
        "mistake": "Using η = ζ or treating η = 2ζ as exact for heavy damping.",
        "toolId": "damping",
        "tags": [
          "loss factor",
          "complex stiffness"
        ]
      },
      {
        "title": "Logarithmic decrement",
        "equation": "δ = (1/n) ln(x₀/xₙ) = 2πζ/√(1−ζ²)",
        "body": "The logarithmic decrement uses separated peaks of a free decay. Using several cycles reduces sensitivity to noise and peak-picking error.",
        "interpretation": "For light damping, ζ ≈ δ/(2π).",
        "mistake": "Using adjacent peaks when the signal contains beating or a changing bias.",
        "toolId": "damping",
        "tags": [
          "free decay",
          "log decrement"
        ]
      },
      {
        "title": "Half-power bandwidth",
        "equation": "ζ ≈ (f₂−f₁)/(2fₙ)",
        "body": "For an isolated lightly damped mode, the frequencies at which response power drops by half define the 3 dB bandwidth. The approximation depends on the FRF type and modal separation.",
        "interpretation": "Bandwidth methods are convenient when phase or ring-down data are unavailable.",
        "mistake": "Applying the half-power method to overlapping modes or coarse frequency resolution.",
        "toolId": "damping",
        "tags": [
          "bandwidth"
        ]
      },
      {
        "title": "Mount stiffness",
        "equation": "k = (2πfₙ)²m",
        "body": "A target mounted-system natural frequency directly sets the required total stiffness. For multiple mounts in parallel, sum the stiffness in the excited direction and include rotational modes.",
        "interpretation": "Static deflection and required travel provide a useful cross-check on a very soft mount design.",
        "mistake": "Sizing only the vertical translational mode while ignoring rocking and cross-axis stiffness.",
        "toolId": "sdof",
        "tags": [
          "mounts",
          "stiffness"
        ]
      },
      {
        "title": "Resonance versus isolation trade",
        "equation": "T(r,ζ) → 2ζ/r &nbsp; for r ≫ 1",
        "body": "At high frequency, viscous damping creates a transmission path proportional to damping. The designer balances a manageable resonance peak against high-frequency isolation.",
        "interpretation": "The best damping depends on the forcing spectrum and available relative travel, not on a universal target.",
        "mistake": "Optimizing only the resonant peak and forgetting the operational forcing band.",
        "toolId": "sdof",
        "tags": [
          "isolation",
          "tradeoff"
        ]
      },
      {
        "title": "Constrained-layer damping",
        "equation": "η<sub>system</sub> depends on shear strain energy in the viscoelastic layer",
        "body": "Constrained-layer damping is effective when the treatment is forced into shear. Its performance depends on temperature, frequency, layer thickness, constraining-layer stiffness, and placement relative to strain energy.",
        "interpretation": "A small, well-placed treatment can outperform a large patch placed in a low-strain region.",
        "mistake": "Applying a material loss factor directly as the assembled-panel loss factor.",
        "toolId": null,
        "tags": [
          "CLD",
          "treatment"
        ]
      },
      {
        "title": "Damping in modal models",
        "equation": "c<sub>r</sub> = 2ζ<sub>r</sub>ω<sub>r</sub>m<sub>r</sub>",
        "body": "Modal damping assigns a scalar damping level to each mode after modal reduction. This is efficient when damping is light and approximately proportional, but it cannot represent every localized or non-proportional loss mechanism.",
        "interpretation": "Mode-dependent damping is usually more defensible than one global value.",
        "mistake": "Using one high damping value to suppress model deficiencies everywhere.",
        "toolId": null,
        "tags": [
          "modal damping",
          "modeling"
        ]
      }
    ]
  },
  {
    "id": "modal-dynamics",
    "number": "04",
    "title": "MDOF & Modal Dynamics",
    "eyebrow": "Modes, participation, and transfer functions",
    "summary": "Modal analysis decomposes a coupled structural system into coordinates that behave approximately like independent oscillators.",
    "concepts": [
      {
        "title": "Matrix equation of motion",
        "equation": "[M]{ẍ} + [C]{ẋ} + [K]{x} = {F}",
        "body": "A finite structural model contains many coupled physical coordinates. The mass, damping, and stiffness matrices encode the spatial coupling and boundary conditions.",
        "interpretation": "The quality of every modal or frequency-response result begins with the physical matrices and constraints.",
        "mistake": "Treating a solver result as trustworthy without checking rigid-body modes, units, and constraints.",
        "toolId": null,
        "tags": [
          "MDOF",
          "matrices"
        ]
      },
      {
        "title": "Eigenvalue problem",
        "equation": "([K] − ωᵣ²[M]){φᵣ} = 0",
        "body": "Undamped free vibration produces eigenvalues ωᵣ² and mode shapes φᵣ. Mode-shape scaling is arbitrary until a normalization convention is selected.",
        "interpretation": "A mode shape is a relative spatial pattern, not a displacement prediction by itself.",
        "mistake": "Comparing raw mode-shape amplitudes from different normalization conventions.",
        "toolId": null,
        "tags": [
          "eigenvalue",
          "mode shape"
        ]
      },
      {
        "title": "Orthogonality and modal mass",
        "equation": "φᵣᵀMφₛ = 0 &nbsp; for r ≠ s",
        "body": "For symmetric linear systems, distinct modes are orthogonal with respect to mass and stiffness. Modal mass, stiffness, and force depend on the chosen scaling.",
        "interpretation": "Mass-normalized modes have φᵣᵀMφᵣ = 1, simplifying modal equations.",
        "mistake": "Calling a modal mass “physical mass” without stating the normalization.",
        "toolId": null,
        "tags": [
          "orthogonality",
          "modal mass"
        ]
      },
      {
        "title": "Participation and effective mass",
        "equation": "Γᵣ = (φᵣᵀMr)/(φᵣᵀMφᵣ)",
        "body": "Participation factors measure how strongly a mode is driven by a spatial input pattern r. Effective modal mass indicates how much system mass participates in that direction.",
        "interpretation": "High effective mass does not necessarily mean high local stress or acceleration at every location.",
        "mistake": "Selecting modes only by frequency and ignoring participation for the applied load.",
        "toolId": null,
        "tags": [
          "participation",
          "effective mass"
        ]
      },
      {
        "title": "Modal superposition",
        "equation": "x(ω) = Σ φᵣ qᵣ(ω)",
        "body": "The physical response is reconstructed from modal coordinates. The required mode set depends on forcing bandwidth, response quantity, spatial distribution, and residual flexibility.",
        "interpretation": "Acceleration often requires more high-frequency content than displacement.",
        "mistake": "Using a displacement-converged mode set for a local acceleration response.",
        "toolId": null,
        "tags": [
          "superposition",
          "truncation"
        ]
      },
      {
        "title": "Receptance, mobility, accelerance",
        "equation": "H<sub>vF</sub> = iωH<sub>xF</sub> &nbsp;&nbsp; · &nbsp;&nbsp; H<sub>aF</sub> = −ω²H<sub>xF</sub>",
        "body": "FRFs differ only by differentiation in the frequency domain, but their visual slopes and phases differ substantially. Mechanical impedance is force divided by velocity.",
        "interpretation": "Use the response form that best exposes the physical region of interest.",
        "mistake": "Ratioing plotted magnitudes without carrying complex phase.",
        "toolId": "mobility",
        "tags": [
          "FRF",
          "mobility"
        ]
      },
      {
        "title": "Coherence",
        "equation": "γ²<sub>xy</sub> = |G<sub>xy</sub>|²/(G<sub>xx</sub>G<sub>yy</sub>)",
        "body": "Magnitude-squared coherence indicates how much of one measured spectrum is linearly related to another at each frequency. Low coherence can result from noise, nonlinear behavior, unmeasured inputs, or insufficient averaging.",
        "interpretation": "Coherence is diagnostic; it is not a transfer function and does not identify causality by itself.",
        "mistake": "Interpreting low coherence as proof that two locations are physically unrelated.",
        "toolId": "spatial-correlation",
        "tags": [
          "coherence",
          "CSD"
        ]
      },
      {
        "title": "Residual vectors and static correction",
        "equation": "x ≈ Φq + x<sub>residual</sub>",
        "body": "Truncated high-frequency modes still contribute quasi-static flexibility below their resonances. Residual vectors or static correction restore part of that missing response.",
        "interpretation": "Residual treatment is especially important for force-to-displacement FRFs and loads with broad spatial content.",
        "mistake": "Assuming modal truncation error disappears simply because the response frequency is below the highest retained mode.",
        "toolId": null,
        "tags": [
          "residual",
          "truncation"
        ]
      },
      {
        "title": "Closely spaced and complex modes",
        "equation": "Modes cease to behave independently when damping or gyroscopic/non-proportional coupling is strong",
        "body": "When modal bandwidths overlap, single-mode curve fits and independent modal damping become unreliable. Complex modes can carry spatial phase and require more general state-space treatment.",
        "interpretation": "Beat patterns and distorted phase rotations are practical clues that a single-mode interpretation is insufficient.",
        "mistake": "Forcing an SDOF fit through a multi-mode cluster.",
        "toolId": null,
        "tags": [
          "complex modes",
          "overlap"
        ]
      }
    ]
  },
  {
    "id": "structures-waves",
    "number": "05",
    "title": "Beams, Plates & Shells",
    "eyebrow": "Structural waves and distributed modes",
    "summary": "Geometry determines which elastic waves exist, how they disperse, and when a structure becomes an efficient acoustic radiator.",
    "concepts": [
      {
        "title": "Elastic wave families",
        "equation": "c<sub>L</sub> ≈ √(E/ρ) &nbsp;&nbsp; · &nbsp;&nbsp; c<sub>S</sub> = √(G/ρ)",
        "body": "Longitudinal and shear waves are approximately nondispersive in a homogeneous bulk solid. Thin structures also support flexural waves whose speed depends strongly on frequency.",
        "interpretation": "Choose the wave family that matches the measured deformation and frequency-thickness range.",
        "mistake": "Using bulk longitudinal speed to locate a low-frequency bending-wave source on a panel.",
        "toolId": "bending-wave",
        "tags": [
          "waves",
          "longitudinal",
          "shear"
        ]
      },
      {
        "title": "Flexural-wave dispersion",
        "equation": "k<sub>b</sub> = (ρhω²/D)<sup>1/4</sup> &nbsp;&nbsp; · &nbsp;&nbsp; c<sub>p</sub> = ω/k<sub>b</sub> &nbsp;&nbsp; · &nbsp;&nbsp; c<sub>g</sub> = 2c<sub>p</sub>",
        "body": "In a thin plate, higher-frequency bending waves travel faster. Phase velocity follows a point of constant phase; group velocity governs the propagation of a narrowband wave packet.",
        "interpretation": "A broadband impact can show high-frequency content arriving before lower-frequency bending content.",
        "mistake": "Using one “bending speed” for a broadband time-delay localization problem.",
        "toolId": "bending-wave",
        "tags": [
          "dispersion",
          "group velocity"
        ]
      },
      {
        "title": "Euler–Bernoulli beam modes",
        "equation": "fₙ = βₙ²/(2πL²) √(EI/(ρA))",
        "body": "Beam natural frequencies scale with thickness, stiffness, boundary condition, and inverse length squared. The β values encode the end conditions.",
        "interpretation": "Boundary flexibility can shift the first few frequencies much more than material-property uncertainty.",
        "mistake": "Assuming a nominally bolted end is perfectly fixed without sensitivity checks.",
        "toolId": "beam",
        "tags": [
          "beam",
          "modes"
        ]
      },
      {
        "title": "Plate bending stiffness",
        "equation": "D = Eh³/[12(1−ν²)]",
        "body": "Plate stiffness grows with thickness cubed while mass per area grows linearly. Small thickness changes therefore produce strong shifts in bending wavelength and modal frequency.",
        "interpretation": "For isotropic thin plates, D is the central parameter connecting material and geometry to flexural response.",
        "mistake": "Using beam EI per unit width without the Poisson-ratio correction for a plate.",
        "toolId": "plate-modes",
        "tags": [
          "plate",
          "bending stiffness"
        ]
      },
      {
        "title": "Simply supported plate modes",
        "equation": "f<sub>mn</sub> = (π/2)√(D/(ρh))[(m/a)²+(n/b)²]",
        "body": "Rectangular plate modes are indexed by half-wave counts in each direction. Real attachments, curvature, cutouts, ribs, and point masses break the ideal symmetry.",
        "interpretation": "Mode pairs can be nearly degenerate when the plate dimensions are similar.",
        "mistake": "Matching a test peak to one ideal mode while ignoring split modes and attachment stiffness.",
        "toolId": "plate-modes",
        "tags": [
          "plate modes",
          "boundary"
        ]
      },
      {
        "title": "Cylinder ring frequency",
        "equation": "f<sub>r</sub> = [1/(2πR)] √[E/(ρ(1−ν²))]",
        "body": "The ring frequency is a useful shell scale associated with circumferential extensional behavior. Below it, curvature strongly modifies flexural motion; above it, the shell behaves more plate-like over local wavelengths.",
        "interpretation": "Ring frequency is not the same as acoustic coincidence frequency and is only weakly dependent on wall thickness in the thin-shell approximation.",
        "mistake": "Treating ring frequency as a single structural resonance of a finite cylinder.",
        "toolId": "ring-frequency",
        "tags": [
          "shell",
          "ring frequency"
        ]
      },
      {
        "title": "Modal density and mode count",
        "equation": "N<sub>plate</sub>(f) ≈ (A f/2)√(ρh/D)",
        "body": "At sufficiently high frequency, exact mode-by-mode counting gives way to smooth asymptotic modal density. Modal density drives overlap, SEA applicability, and response statistics.",
        "interpretation": "Larger area and lower bending stiffness increase plate modal density.",
        "mistake": "Applying an asymptotic count to the first few modes of a highly constrained panel.",
        "toolId": "modal-density",
        "tags": [
          "modal density",
          "SEA"
        ]
      },
      {
        "title": "Curvature and local wavelengths",
        "equation": "λ<sub>b</sub> = 2π/k<sub>b</sub>",
        "body": "A cylindrical shell can look locally flat when the structural wavelength is small compared with radius. At longer wavelengths, membrane-bending coupling and circumferential order matter.",
        "interpretation": "Compare wavelength, radius, bay length, and stiffener spacing before selecting a plate or shell approximation.",
        "mistake": "Using flat-plate coincidence and radiation formulas far below ring frequency without qualification.",
        "toolId": "ring-frequency",
        "tags": [
          "curvature",
          "wavelength"
        ]
      },
      {
        "title": "FE mesh versus wavelength",
        "equation": "ℓ<sub>e,max</sub> ≈ λ/N<sub>e</sub>",
        "body": "Dynamic finite-element accuracy is controlled by elements per wavelength, element order, distortion, and response quantity. Structural bending wavelength can be much shorter than an acoustic wavelength at the same frequency.",
        "interpretation": "Use a stricter mesh criterion for phase-sensitive wave propagation than for rough modal-frequency screening.",
        "mistake": "Sizing a structural mesh from the speed of sound in air.",
        "toolId": "fea-mesh",
        "tags": [
          "mesh",
          "wavelength"
        ]
      }
    ]
  },
  {
    "id": "random-psd",
    "number": "06",
    "title": "Random Vibration & PSD",
    "eyebrow": "Spectral density and response",
    "summary": "A PSD describes mean-square content per bandwidth. Correct integration, averaging, correlation, and response transfer are essential.",
    "concepts": [
      {
        "title": "PSD meaning and units",
        "equation": "σ² = ∫<sub>0</sub><sup>∞</sup> G<sub>xx</sub>(f) df",
        "body": "A one-sided PSD has units of the response quantity squared per hertz. The area under the PSD equals mean square; its square root is RMS.",
        "interpretation": "The numerical value of a PSD changes with units but not with FFT frequency resolution when scaled correctly.",
        "mistake": "Reading a PSD ordinate as an RMS amplitude.",
        "toolId": "grms",
        "tags": [
          "PSD",
          "RMS"
        ]
      },
      {
        "title": "Welch estimation",
        "equation": "Ĝ<sub>xx</sub>(f) = average of windowed periodograms",
        "body": "Welch processing trades frequency resolution, estimator variance, and time localization. Window normalization must preserve the intended power scaling.",
        "interpretation": "More overlap creates more averages but not fully independent information.",
        "mistake": "Changing FFT size and interpreting the changed line amplitude as changed physical energy.",
        "toolId": null,
        "tags": [
          "Welch",
          "FFT"
        ]
      },
      {
        "title": "GRMS integration",
        "equation": "G<sub>rms</sub> = √(Σ ∫ G(f)df)",
        "body": "Piecewise log-log PSD specifications should be integrated as power laws between breakpoints. A flat segment contributes PSD level times bandwidth.",
        "interpretation": "Report the frequency range and whether the input was interpolated linearly or logarithmically.",
        "mistake": "Multiplying a sloped PSD by total bandwidth as though it were flat.",
        "toolId": "grms",
        "tags": [
          "GRMS",
          "integration"
        ]
      },
      {
        "title": "Spectral slopes",
        "equation": "n = ln(G₂/G₁)/ln(f₂/f₁)",
        "body": "A PSD power-law slope n relates level changes to frequency ratio. In decibels, a factor-of-two frequency change adds 10n log₁₀2.",
        "interpretation": "A +3 dB/octave PSD has n ≈ +1; −3 dB/octave has n ≈ −1.",
        "mistake": "Confusing PSD dB/octave with amplitude-spectral-density slope.",
        "toolId": "grms",
        "tags": [
          "slope",
          "octave"
        ]
      },
      {
        "title": "Cross PSD and phase",
        "equation": "G<sub>xy</sub> = E[X(f)Y*(f)]",
        "body": "Cross-spectral density preserves both magnitude and relative phase between channels. It is required for phase-aware combination and distributed-load response.",
        "interpretation": "Auto PSDs alone cannot reconstruct a complex transfer function or correlated sum.",
        "mistake": "Taking the square root of a PSD ratio and calling it a complete transfer function.",
        "toolId": "correlation-matrix",
        "tags": [
          "CSD",
          "phase"
        ]
      },
      {
        "title": "Combining independent PSDs",
        "equation": "G<sub>sum</sub> = Σ Gᵢ &nbsp; only for statistically independent contributions",
        "body": "Independent random sources add in mean square. Correlated sources require cross terms: G<sub>sum</sub> = ΣGᵢ + 2Re{ΣGᵢⱼ}.",
        "interpretation": "Keep discrete deterministic components, broadband random components, and uncertain envelopes conceptually separate.",
        "mistake": "Adding two percentile envelopes as if they were simultaneously realized independent PSDs.",
        "toolId": "correlation-matrix",
        "tags": [
          "PSD combination",
          "correlation"
        ]
      },
      {
        "title": "Vibration response spectrum",
        "equation": "G<sub>out</sub>(f;fₙ,ζ) = |H(f;fₙ,ζ)|²G<sub>in</sub>(f)",
        "body": "A VRS sweeps an SDOF filter bank across an input PSD and reports RMS response versus natural frequency. It exposes how damping and spectral shape interact.",
        "interpretation": "Unlike Miles’ equation, numerical VRS integration remains valid across shaped spectra when the transfer function and integration are defined correctly.",
        "mistake": "Using an acceleration VRS without stating whether response is absolute or relative.",
        "toolId": "vrs",
        "tags": [
          "VRS",
          "response"
        ]
      },
      {
        "title": "Duration and stationary assumptions",
        "equation": "PSD response statistics assume a sufficiently stationary process over the analysis window",
        "body": "Random-vibration PSDs discard event ordering and phase. Duration influences expected extremes and fatigue even when RMS remains unchanged.",
        "interpretation": "Two environments with equal PSD and different durations have equal RMS but not equal expected maximum or damage.",
        "mistake": "Scaling a PSD level solely to represent longer duration.",
        "toolId": null,
        "tags": [
          "stationarity",
          "duration"
        ]
      }
    ]
  },
  {
    "id": "statistics-extremes",
    "number": "07",
    "title": "Statistics & Extreme Response",
    "eyebrow": "Probability, peaks, and confidence",
    "summary": "RMS is not a peak. Extreme response depends on distribution, bandwidth, duration, and the confidence statement attached to the environment.",
    "concepts": [
      {
        "title": "Gaussian response",
        "equation": "p(x) = [1/(σ√(2π))] exp[−(x−μ)²/(2σ²)]",
        "body": "Linear response to many independent random contributions often approaches a Gaussian amplitude distribution. Zero-mean Gaussian response is fully described at an instant by its variance.",
        "interpretation": "Gaussian amplitude does not imply Gaussian peak distribution or stationary behavior.",
        "mistake": "Calling ±3σ a guaranteed bound.",
        "toolId": null,
        "tags": [
          "Gaussian",
          "RMS"
        ]
      },
      {
        "title": "Rayleigh narrowband peaks",
        "equation": "P(R>r) = exp[−r²/(2σ²)]",
        "body": "The envelope or positive peaks of a narrowband Gaussian process are approximately Rayleigh distributed. This is why likely maxima exceed a simple RMS multiple that grows with the number of cycles.",
        "interpretation": "Peak statistics depend on how many effectively independent peaks occur during the duration.",
        "mistake": "Applying narrowband Rayleigh formulas to an impulsive or strongly nonstationary response.",
        "toolId": null,
        "tags": [
          "Rayleigh",
          "peaks"
        ]
      },
      {
        "title": "Crest factor",
        "equation": "CF = x<sub>peak</sub>/x<sub>rms</sub>",
        "body": "Crest factor is a property of a specific record and duration. It is not automatically three, and it changes with bandwidth, clipping, transients, and sample count.",
        "interpretation": "A low measured crest factor can indicate clipping or insufficient record length.",
        "mistake": "Assuming 3σ and crest factor 3 are universal equivalents.",
        "toolId": null,
        "tags": [
          "crest factor"
        ]
      },
      {
        "title": "Expected maximum",
        "equation": "x<sub>max</sub> ≈ σ√[2 ln(N<sub>eff</sub>)] &nbsp; as a screening estimate",
        "body": "The expected maximum of a Gaussian-like process grows slowly with the effective number of independent peaks. More rigorous estimates use spectral moments and upcrossing rates.",
        "interpretation": "Duration affects peaks logarithmically but can affect fatigue almost linearly.",
        "mistake": "Using total samples as independent peaks in an oversampled narrowband record.",
        "toolId": null,
        "tags": [
          "extreme",
          "duration"
        ]
      },
      {
        "title": "Spectral moments and crossing rate",
        "equation": "m<sub>n</sub> = ∫(2πf)<sup>n</sup>G(f)df &nbsp;&nbsp; · &nbsp;&nbsp; ν₀ ≈ (1/2π)√(m₂/m₀)",
        "body": "Spectral moments characterize bandwidth and expected crossing rates. They connect a PSD to peak statistics without recreating an exact time history.",
        "interpretation": "The zero-upcrossing rate is a better effective-cycle measure than sample rate.",
        "mistake": "Using the Nyquist rate as the rate of statistically independent peaks.",
        "toolId": null,
        "tags": [
          "spectral moments",
          "crossings"
        ]
      },
      {
        "title": "Percentile and confidence notation",
        "equation": "P95/C50 and P97.5/C50 describe different probability statements",
        "body": "A population percentile and a statistical confidence level answer different questions. Environment notation must state what is varying, how data were pooled, and what confidence procedure was used.",
        "interpretation": "Two curves with the same numeric multiplier may represent different statistical claims.",
        "mistake": "Treating percentile, tolerance limit, and confidence interval as interchangeable.",
        "toolId": null,
        "tags": [
          "percentile",
          "confidence"
        ]
      },
      {
        "title": "Lognormal engineering variables",
        "equation": "ln(X) ~ Normal(μ<sub>ln</sub>, σ<sub>ln</sub>²)",
        "body": "Positive quantities governed by multiplicative factors are often represented as lognormal. Frequency, damping, response ratios, and model uncertainty may be more symmetric in log space.",
        "interpretation": "A dB-domain normal distribution corresponds to a lognormal linear quantity.",
        "mistake": "Averaging ratios in linear space when the scatter is clearly multiplicative.",
        "toolId": null,
        "tags": [
          "lognormal",
          "uncertainty"
        ]
      },
      {
        "title": "Maximax and envelopes",
        "equation": "Envelope(f) = max over cases at each frequency",
        "body": "A maximax spectrum can combine values that never occur together in one physical case. It is useful for bounding but loses case correlation, phase, and duration consistency.",
        "interpretation": "Carry the source-case map whenever an envelope will be used for response or fatigue decisions.",
        "mistake": "Treating a frequency-by-frequency envelope as one realizable load case.",
        "toolId": null,
        "tags": [
          "maximax",
          "envelope"
        ]
      }
    ]
  },
  {
    "id": "shock-fatigue",
    "number": "08",
    "title": "Shock, SRS, Dynamic Stress & Fatigue",
    "eyebrow": "Transient severity and accumulated damage",
    "summary": "Shock spectra convert a transient into oscillator response; dynamic strain recovery and environment-dependent fatigue convert that response into structural margin.",
    "concepts": [
      {
        "title": "Impulse and pulse shape",
        "equation": "J = ∫F(t)dt &nbsp;&nbsp; · &nbsp;&nbsp; Δv = ∫a(t)dt",
        "body": "Impulse controls momentum change, but equal impulse does not imply equal SRS. Pulse duration and shape determine which natural frequencies are excited.",
        "interpretation": "Compare pulse duration with oscillator period before predicting the response regime.",
        "mistake": "Characterizing a shock only by peak acceleration.",
        "toolId": "shock-pulse",
        "tags": [
          "impulse",
          "pulse"
        ]
      },
      {
        "title": "Shock response spectrum",
        "equation": "SRS(fₙ,ζ) = peak response of an SDOF bank to a common transient",
        "body": "Each oscillator sees the same base-acceleration time history. Positive, negative, and maximax spectra preserve different aspects of the response.",
        "interpretation": "SRS is not a Fourier spectrum and cannot reconstruct the unique source time history.",
        "mistake": "Adding SRS curves frequency-by-frequency as though they were PSDs.",
        "toolId": "srs",
        "tags": [
          "SRS",
          "transient"
        ]
      },
      {
        "title": "Absolute acceleration and relative displacement",
        "equation": "a<sub>abs</sub> = −2ζωₙẋ − ωₙ²x",
        "body": "An SRS can report absolute acceleration, relative displacement, or pseudo velocity. The selected response quantity changes the physical interpretation and plot slopes.",
        "interpretation": "Low-frequency relative displacement is useful for mount travel; high-frequency acceleration captures rigid-body following of a pulse.",
        "mistake": "Comparing SRS plots without confirming response type and damping.",
        "toolId": "srs",
        "tags": [
          "absolute acceleration",
          "relative motion"
        ]
      },
      {
        "title": "Pseudo velocity",
        "equation": "PV = ωₙ |x|<sub>max</sub>",
        "body": "Pseudo velocity is proportional to the maximum strain-energy scale of the oscillator and is commonly displayed on tripartite SRS plots.",
        "interpretation": "Constant pseudo-velocity diagonals help identify shock severity across frequency.",
        "mistake": "Treating pseudo velocity as the measured physical velocity time history.",
        "toolId": "srs",
        "tags": [
          "pseudo velocity",
          "tripartite"
        ]
      },
      {
        "title": "Pyroshock regions",
        "equation": "Near-field pyroshock often contains very high-frequency content and steep SRS slopes",
        "body": "Pyroshock evaluation demands adequate sample rate, anti-alias protection, sensor mounting, and record conditioning. The near-, mid-, and far-field labels describe propagation and spectral character, not merely distance.",
        "interpretation": "A credible pyroshock result begins with instrumentation bandwidth and mounting resonance checks.",
        "mistake": "Accepting a high-frequency SRS without verifying accelerometer and mounting bandwidth.",
        "toolId": "srs",
        "tags": [
          "pyroshock",
          "sample rate"
        ]
      },
      {
        "title": "Basquin S–N relation",
        "equation": "S<sup>b</sup>N = C &nbsp;&nbsp; or &nbsp;&nbsp; N = (C/S)<sup>1/b</sup>",
        "body": "A power-law stress-life curve connects cycle amplitude to allowable cycles over a limited material regime. The exponent strongly controls how damaging rare high peaks become.",
        "interpretation": "Fatigue calculations are highly sensitive to stress concentration, mean stress, and the selected S–N basis.",
        "mistake": "Using a generic exponent without documenting material, stress definition, and confidence basis.",
        "toolId": null,
        "tags": [
          "fatigue",
          "S-N"
        ]
      },
      {
        "title": "Miner cumulative damage",
        "equation": "D = Σ nᵢ/Nᵢ",
        "body": "Miner’s rule linearly sums cycle fractions. It is simple and widely used but neglects sequence effects and interaction between damage mechanisms.",
        "interpretation": "D = 1 is a model threshold, not a precise failure prediction.",
        "mistake": "Reporting damage to many significant digits despite large input uncertainty.",
        "toolId": null,
        "tags": [
          "Miner",
          "damage"
        ]
      },
      {
        "title": "Fatigue damage spectrum",
        "equation": "FDS(fₙ) = damage produced by the response of an SDOF bank",
        "body": "An FDS compares the fatigue potential of different environments through a family of hypothetical resonant systems. It depends on damping, S–N exponent, response quantity, and duration.",
        "interpretation": "Two PSDs with similar GRMS can have very different FDS curves.",
        "mistake": "Comparing FDS curves generated with different Q or fatigue exponents.",
        "toolId": null,
        "tags": [
          "FDS",
          "equivalence"
        ]
      },
      {
        "title": "Sampling and conditioning",
        "equation": "f<sub>s</sub> must exceed both signal bandwidth and sensor/mount resonances of concern",
        "body": "Shock records require pre-trigger data, baseline control, anti-alias filtering, and enough post-event ring-down. High-pass filtering can remove drift but can also distort low-frequency SRS.",
        "interpretation": "Always compare raw and conditioned histories plus velocity-change closure.",
        "mistake": "Aggressively filtering until integrated velocity or displacement looks reasonable.",
        "toolId": "integration-drift",
        "tags": [
          "conditioning",
          "sampling"
        ]
      },
      {
        "title": "Dynamic strain and stress recovery",
        "equation": "ε<sub>b</sub> ≈ (h/2)κ &nbsp;&nbsp; · &nbsp;&nbsp; σ<sub>a</sub> = K<sub>t</sub>E(T)ε<sub>b</sub>",
        "body": "Structural displacement becomes fatigue-relevant stress through curvature, material properties, local geometry, and stress concentration. A large displacement region is not necessarily the critical stress region because stress follows spatial derivatives of the deformation field.",
        "interpretation": "Recover curvature or element strain from the complex response before comparing a vibration result with fatigue or yield allowables.",
        "mistake": "Applying an acceleration or displacement RMS directly to an S–N curve without a validated stress transfer function.",
        "toolId": "dynamic-stress-environment",
        "tags": [
          "dynamic stress",
          "curvature",
          "strain recovery"
        ]
      },
      {
        "title": "Temperature-dependent stiffness and strength",
        "equation": "E=E(T) &nbsp;&nbsp; · &nbsp;&nbsp; f<sub>n</sub>∝√E &nbsp;&nbsp; · &nbsp;&nbsp; S<sub>allow</sub>=S<sub>allow</sub>(T)",
        "body": "Temperature changes modulus, wave speed, resonance frequency, damping, yield strength, and fatigue strength. Cryogenic tanks, ascent heating, and through-thickness gradients can therefore change both the dynamic response and the allowable used to judge it.",
        "interpretation": "Update the structural model and the strength basis at the same environmental state; changing only the allowable or only the response is incomplete.",
        "mistake": "Using room-temperature modes with hot or cryogenic material allowables as though the response transfer function were unchanged.",
        "toolId": "dynamic-stress-environment",
        "tags": [
          "temperature",
          "material properties",
          "launch environment"
        ]
      },
      {
        "title": "Pressure and membrane preload",
        "equation": "σ<sub>hoop</sub>≈pR/h &nbsp;&nbsp; · &nbsp;&nbsp; ω²≈(Dk⁴+Nk²)/m′",
        "body": "Internal pressure creates mean membrane stress and geometric stiffness. It can shift shell or panel frequencies while simultaneously consuming fatigue and yield margin through the mean-stress term.",
        "interpretation": "Pressurization can reduce dynamic displacement yet worsen stress margin; response reduction and structural margin must be evaluated separately.",
        "mistake": "Treating pressure stiffening as an unconditional benefit without carrying the associated mean stress into fatigue and yield checks.",
        "toolId": "dynamic-stress-environment",
        "tags": [
          "pressurization",
          "preload",
          "geometric stiffness"
        ]
      },
      {
        "title": "Launch-vehicle fatigue workflow",
        "equation": "response → strain/stress transfer → mean-stress correction → cycles → damage → margin",
        "body": "A launch fatigue assessment should preserve the parent flight condition, duration, temperature, pressure state, local concentration, and uncertainty basis from external forcing through structural stress and accumulated damage.",
        "interpretation": "The controlling case may not be the largest acceleration case: resonance placement, stress concentration, mean preload, duration, and temperature-dependent strength can reorder the margins.",
        "mistake": "Combining maxima from different trajectory points into a stress, temperature, pressure, and duration state that never occurs physically.",
        "toolId": "dynamic-stress-environment",
        "tags": [
          "acoustic fatigue",
          "flight cases",
          "margin"
        ]
      }
    ]
  },
  {
    "id": "structural-acoustics",
    "number": "09",
    "title": "Structural–Acoustic Coupling",
    "eyebrow": "Radiation, transmission, and coincidence",
    "summary": "Structural response becomes acoustic response through surface velocity, wavenumber matching, radiation efficiency, and fluid loading.",
    "concepts": [
      {
        "title": "Radiated sound power",
        "equation": "W = ρ₀c₀ S σ ⟨v<sub>n</sub>²⟩",
        "body": "For a baffled vibrating surface, radiated power is set by area, mean-square normal velocity, fluid impedance, and radiation efficiency σ. Structural response alone does not determine sound unless the spatial velocity pattern is known.",
        "interpretation": "Two modes with equal RMS velocity can radiate very different power.",
        "mistake": "Assuming all panel velocity radiates with σ = 1.",
        "toolId": null,
        "tags": [
          "radiation",
          "surface velocity"
        ]
      },
      {
        "title": "Acoustic and structural wavenumber",
        "equation": "k₀ = ω/c₀ &nbsp;&nbsp; · &nbsp;&nbsp; k<sub>b</sub> = (ρhω²/D)<sup>1/4</sup>",
        "body": "Radiation depends on whether the structural wave can match a propagating acoustic wave. Subsonic structural waves have k<sub>b</sub> > k₀ and radiate inefficiently from an infinite plate.",
        "interpretation": "Wavenumber matching is the cleanest physical explanation of coincidence.",
        "mistake": "Reasoning only in frequency without comparing structural and acoustic wavelength.",
        "toolId": "critical-frequency",
        "tags": [
          "wavenumber",
          "coincidence"
        ]
      },
      {
        "title": "Critical or coincidence frequency",
        "equation": "f<sub>c</sub> = c₀²/(2π) √(ρh/D)",
        "body": "At critical frequency, flexural phase speed equals the sound speed. Above it, an infinite plate can radiate propagating sound at a coincidence angle.",
        "interpretation": "Critical frequency scales inversely with thickness and with the square root of specific stiffness.",
        "mistake": "Confusing plate critical frequency with cylinder ring frequency.",
        "toolId": "critical-frequency",
        "tags": [
          "critical frequency",
          "coincidence"
        ]
      },
      {
        "title": "Radiation efficiency",
        "equation": "σ = W/[ρ₀c₀S⟨v<sub>n</sub>²⟩]",
        "body": "Radiation efficiency compresses geometry and spatial phase into one nondimensional quantity. Finite edges permit some subcritical radiation; near coincidence, σ can rise sharply.",
        "interpretation": "σ can exceed one near coincidence depending on normalization and finite-panel behavior.",
        "mistake": "Clipping every radiation-efficiency estimate at one without checking the convention.",
        "toolId": "radiation-efficiency",
        "tags": [
          "radiation efficiency"
        ]
      },
      {
        "title": "Mass-law transmission loss",
        "equation": "TL ≈ 20 log₁₀(m′f) − 47 &nbsp; dB (common diffuse-field screening form)",
        "body": "Away from resonances and coincidence, a limp single panel gains roughly 6 dB of TL per octave of frequency or per doubling of surface mass.",
        "interpretation": "Mass law is a mid-frequency trend, not a full panel prediction.",
        "mistake": "Extending mass law through panel resonances, leakage, and coincidence.",
        "toolId": "mass-law",
        "tags": [
          "TL",
          "mass law"
        ]
      },
      {
        "title": "Panel transmission regions",
        "equation": "Stiffness-controlled → resonance-controlled → mass-controlled → coincidence-controlled",
        "body": "At low frequency, panel modes and boundary conditions dominate. At intermediate frequency, mass law can emerge. Near coincidence, radiation coupling reduces TL before damping and modal density shape the recovery.",
        "interpretation": "The transitions are gradual and geometry-dependent; there is no universal single boundary frequency.",
        "mistake": "Using ring frequency alone as the boundary between resonance and mass control for every cylinder.",
        "toolId": "mass-law",
        "tags": [
          "regions",
          "resonance"
        ]
      },
      {
        "title": "Double-panel systems",
        "equation": "f<sub>mam</sub> = c₀/(2π) √[(ρ₀/d)(1/m′₁+1/m′₂)]",
        "body": "Two skins separated by an air cavity create a mass–air–mass resonance. Above that resonance, properly decoupled double panels can outperform equal total mass in one panel; rigid bridges and cavity modes erode the benefit.",
        "interpretation": "Cavity absorption damps standing waves but does not remove structural bridging.",
        "mistake": "Adding two single-panel TL curves without including mass–air–mass resonance.",
        "toolId": "double-panel",
        "tags": [
          "double panel",
          "MAM"
        ]
      },
      {
        "title": "Panel–cavity coupling",
        "equation": "|f<sub>struct</sub> − f<sub>acoustic</sub>| small → stronger interaction",
        "body": "A structural mode and cavity mode couple most strongly when they are close in frequency and share compatible spatial patterns. The coupled modes split and exchange energy.",
        "interpretation": "Frequency proximity is necessary but not sufficient; modal overlap integrals matter.",
        "mistake": "Declaring strong coupling from frequency coincidence alone.",
        "toolId": "cavity-modes",
        "tags": [
          "cavity",
          "coupling"
        ]
      },
      {
        "title": "Fluid loading",
        "equation": "Added mass and radiation damping enter the structural impedance",
        "body": "A surrounding fluid modifies structural resonance through added inertia, radiation damping, and sometimes stiffness. Water loading can dominate thin structures; air loading is often weaker but can matter for lightweight panels and cavities.",
        "interpretation": "The relevant comparison is fluid impedance against structural wave impedance.",
        "mistake": "Applying in-vacuo modal frequencies directly to a heavily fluid-loaded structure.",
        "toolId": null,
        "tags": [
          "fluid loading",
          "added mass"
        ]
      }
    ]
  },
  {
    "id": "distributed-loads",
    "number": "10",
    "title": "Distributed Loads & Spatial Correlation",
    "eyebrow": "Cross spectra, convection, and load patterns",
    "summary": "Distributed pressure cannot be reduced to independent point PSDs without losing the spatial phase and coherence that drive structural response.",
    "concepts": [
      {
        "title": "Cross-spectral density matrix",
        "equation": "[G<sub>pp</sub>(f)] contains auto spectra on the diagonal and complex cross spectra off diagonal",
        "body": "A discretized random pressure field is fully described at second order by its frequency-dependent CSD matrix. Structural response follows H G<sub>pp</sub> Hᴴ.",
        "interpretation": "The matrix must be Hermitian and positive semidefinite at every frequency.",
        "mistake": "Constructing pairwise coherences that produce a nonphysical non-positive matrix.",
        "toolId": "correlation-matrix",
        "tags": [
          "CSD matrix",
          "random field"
        ]
      },
      {
        "title": "Coherence and phase",
        "equation": "G<sub>ij</sub> = γ<sub>ij</sub> √(G<sub>ii</sub>G<sub>jj</sub>) e<sup>iφᵢⱼ</sup>",
        "body": "Magnitude coherence sets how strongly two locations are related; phase sets the traveling-wave relationship. Both are required to form cross spectra.",
        "interpretation": "High coherence with convective phase can excite a mode very differently from high coherence with zero phase.",
        "mistake": "Using magnitude-squared coherence as the complex coherence magnitude without taking the square root.",
        "toolId": "spatial-correlation",
        "tags": [
          "coherence",
          "phase"
        ]
      },
      {
        "title": "Correlation length",
        "equation": "γ(Δx) often decays approximately as exp(−|Δx|/L<sub>c</sub>)",
        "body": "Correlation length is frequency- and direction-dependent for most flow fields. A single constant length can be useful for screening but should not be treated as universal.",
        "interpretation": "Sensor spacing should resolve both the decay and the phase progression.",
        "mistake": "Fitting one broadband correlation length and applying it across all frequencies.",
        "toolId": "spatial-correlation",
        "tags": [
          "correlation length",
          "spacing"
        ]
      },
      {
        "title": "Corcos-type model",
        "equation": "Γ(Δx,Δy,f)=e<sup>−αₓω|Δx|/U<sub>c</sub>−αᵧω|Δy|/U<sub>c</sub></sup> e<sup>−iωΔx/U<sub>c</sub></sup>",
        "body": "Corcos models represent convecting turbulent boundary-layer pressure with exponential coherence decay and downstream phase progression. Parameters depend on flow and convention.",
        "interpretation": "Higher frequency means shorter coherent length when α and U<sub>c</sub> are fixed.",
        "mistake": "Using freestream velocity in place of convection velocity without justification.",
        "toolId": "spatial-correlation",
        "tags": [
          "Corcos",
          "TBL"
        ]
      },
      {
        "title": "Convective ridge",
        "equation": "k<sub>x</sub> ≈ ω/U<sub>c</sub>",
        "body": "In frequency–wavenumber space, convecting pressure energy clusters near the convective ridge. Structural response is strongest where pressure wavenumber content overlaps structural modal or wave-number content.",
        "interpretation": "A mode can be lightly excited despite high local pressure when spatial cancellation is strong.",
        "mistake": "Scaling only the point PSD and ignoring wavenumber matching.",
        "toolId": null,
        "tags": [
          "wavenumber",
          "convection"
        ]
      },
      {
        "title": "Force spatial patterns",
        "equation": "F<sub>r</sub>(f) = ∫<sub>S</sub> φ<sub>r</sub>(x)p(x,f)dS",
        "body": "A force spatial pattern maps distributed pressure into modal generalized force. The integral naturally captures sign changes and cancellation across a mode shape.",
        "interpretation": "A fine pressure grid is not useful unless the structural interpolation and cross-spectral field are equally consistent.",
        "mistake": "Summing pressure magnitudes over an area instead of integrating complex generalized force.",
        "toolId": null,
        "tags": [
          "FSP",
          "modal force"
        ]
      },
      {
        "title": "Discrete versus broadband forcing",
        "equation": "A coherent tone and a broadband random field require different combination logic",
        "body": "Vortex shedding may produce narrowband, phase-coherent forcing tied to flow conditions, while TBL is broadband and partially coherent. Their response PSDs may add when statistically independent, but percentile envelopes and maximax cases require careful bookkeeping.",
        "interpretation": "Preserve the parent load case and statistical basis before combining environments.",
        "mistake": "Adding a maximax broadband envelope to a percentile discrete PSD and calling the result one confidence environment.",
        "toolId": null,
        "tags": [
          "vortex",
          "TBL"
        ]
      },
      {
        "title": "Sensor-array spacing",
        "equation": "Δx must resolve both phase: 2πfΔx/U<sub>c</sub>, and coherence decay",
        "body": "An array that is too sparse aliases convective phase; an array that is too short cannot observe decay. Multiple streamwise and cross-stream separations are needed to fit directional correlation models.",
        "interpretation": "A shared synchronized DAQ preserves relative timing, but channel timing verification still matters.",
        "mistake": "Inferring source direction from two sensors without checking dispersive structural propagation and possible reflections.",
        "toolId": "spatial-correlation",
        "tags": [
          "array",
          "directionality"
        ]
      }
    ]
  },
  {
    "id": "sea",
    "number": "11",
    "title": "Statistical Energy Analysis",
    "eyebrow": "High-frequency subsystem energy flow",
    "summary": "SEA replaces detailed phase with average modal energy when modal density, overlap, and statistical assumptions are sufficient.",
    "concepts": [
      {
        "title": "Subsystem energy",
        "equation": "Eᵢ = modal energy averaged over a frequency band and ensemble",
        "body": "An SEA subsystem is a region with similar wave type, damping, and modal statistics. The state variable is energy, not nodal displacement or phase.",
        "interpretation": "Subsystem definitions should follow energy storage and coupling mechanisms, not CAD convenience alone.",
        "mistake": "Using one subsystem across abrupt changes in thickness, wave type, or damping.",
        "toolId": "two-subsystem-sea",
        "tags": [
          "SEA",
          "energy"
        ]
      },
      {
        "title": "Power balance",
        "equation": "Pᵢ = ωηᵢEᵢ + Σⱼ ωηᵢⱼEᵢ − Σⱼ ωηⱼᵢEⱼ",
        "body": "Input power balances internal dissipation and net coupling power. In matrix form, the band solution is a linear system for subsystem energies.",
        "interpretation": "Energy flows from higher modal energy per mode toward lower, subject to coupling.",
        "mistake": "Interpreting coupling loss factor as a fraction of energy transferred once per cycle without checking definitions.",
        "toolId": "two-subsystem-sea",
        "tags": [
          "power balance",
          "CLF"
        ]
      },
      {
        "title": "Modal density",
        "equation": "n(f) = dN/df",
        "body": "Modal density sets how many resonances participate in a band and enters reciprocity relationships. It depends on wave type, geometry, and frequency.",
        "interpretation": "A subsystem can be high modal density for bending but low modal density for in-plane waves.",
        "mistake": "Using one modal density for all wave families in a plate junction.",
        "toolId": "modal-density",
        "tags": [
          "modal density",
          "modes"
        ]
      },
      {
        "title": "Internal loss factor",
        "equation": "P<sub>diss</sub> = ωηE",
        "body": "Internal loss factor represents average energy dissipation in a subsystem. It can include material, joint, boundary, and treatment losses but should be consistent with the energy definition.",
        "interpretation": "Measured damping from low-order isolated modes may not represent high-frequency band-averaged loss.",
        "mistake": "Entering modal damping ratio directly where an SEA loss factor is required.",
        "toolId": "damping",
        "tags": [
          "ILF",
          "damping"
        ]
      },
      {
        "title": "Coupling loss factor",
        "equation": "P<sub>i→j</sub> = ωηᵢⱼEᵢ",
        "body": "A CLF describes average power transfer from subsystem i to j. It can be analytical, measured, or computed using wave approaches and depends on junction geometry and frequency.",
        "interpretation": "CLFs are directional but constrained by reciprocity for reciprocal passive systems.",
        "mistake": "Assuming ηᵢⱼ = ηⱼᵢ when modal densities differ.",
        "toolId": "clf-identification-uncertainty",
        "tags": [
          "CLF",
          "coupling"
        ]
      },
      {
        "title": "Reciprocity",
        "equation": "nᵢηᵢⱼ = nⱼηⱼᵢ",
        "body": "Reciprocity links directional CLFs through modal density. It is a powerful consistency check for passive reciprocal coupling.",
        "interpretation": "Equal CLFs imply equal modal densities, not merely the same physical junction.",
        "mistake": "Violating reciprocity when manually editing one directional CLF.",
        "toolId": "clf-identification-uncertainty",
        "tags": [
          "reciprocity"
        ]
      },
      {
        "title": "Modal overlap factor",
        "equation": "M ≈ η f n(f)",
        "body": "Modal overlap compares typical modal bandwidth with average spacing. Values well above one support a smooth statistical response; values below one indicate isolated modes.",
        "interpretation": "Overlap is a diagnostic, not a hard universal cutoff for SEA validity.",
        "mistake": "Using one overlap number for an entire wide band without checking frequency dependence.",
        "toolId": "modal-overlap",
        "tags": [
          "overlap",
          "validity"
        ]
      },
      {
        "title": "Hybrid FE–SEA",
        "equation": "Deterministic low-modal-density regions couple to statistical high-modal-density regions",
        "body": "Hybrid methods retain phase and detailed dynamics where necessary while representing uncertain high-frequency fields statistically. Interface definitions and direct-field treatment are central.",
        "interpretation": "Hybrid modeling is most valuable near the mid-frequency transition where neither pure FE nor pure SEA is efficient alone.",
        "mistake": "Calling a model “hybrid” merely because FE geometry and SEA subsystems appear in the same file.",
        "toolId": null,
        "tags": [
          "hybrid",
          "mid-frequency"
        ]
      },
      {
        "title": "SEA limitations",
        "equation": "Weak coupling, diffuse fields, and sufficient modal population are assumptions—not automatic truths",
        "body": "Strong deterministic paths, small subsystems, narrowband forcing, and localized attachments can violate classical SEA assumptions. Validation should inspect sensitivity to subsystem partitioning and loss factors.",
        "interpretation": "Use SEA as an energy-flow model with explicit uncertainty, not a black-box high-frequency FEA replacement.",
        "mistake": "Hiding poor low-frequency agreement by widening bands until the curve looks smooth.",
        "toolId": "modal-overlap",
        "tags": [
          "limitations",
          "validation"
        ]
      }
    ]
  },
  {
    "id": "signal-testing",
    "number": "12",
    "title": "Signal Processing & Testing",
    "eyebrow": "Measurement chain and spectral integrity",
    "summary": "Good analysis cannot recover information removed or corrupted by instrumentation, sampling, mounting, timing, or undocumented conditioning.",
    "concepts": [
      {
        "title": "Sampling and anti-aliasing",
        "equation": "f<sub>s</sub> > 2f<sub>max</sub> is necessary, not sufficient",
        "body": "Nyquist defines the mathematical minimum for a bandlimited signal. Practical anti-alias filters require transition bandwidth, so test sample rates normally exceed twice the highest trusted frequency.",
        "interpretation": "The usable bandwidth is set by the entire chain: sensor, mount, conditioner, anti-alias filter, and digitizer.",
        "mistake": "Reporting response to Nyquist as fully valid without filter and sensor checks.",
        "toolId": "accelerometer",
        "tags": [
          "Nyquist",
          "anti-alias"
        ]
      },
      {
        "title": "Frequency resolution",
        "equation": "Δf = f<sub>s</sub>/N = 1/T<sub>record</sub>",
        "body": "Longer records produce finer FFT bins. Zero padding creates smoother-looking interpolation but does not add true frequency resolution.",
        "interpretation": "Resolution should separate expected modes or tones while still allowing enough averages for stable random estimates.",
        "mistake": "Increasing FFT size with zero padding and calling it improved physical resolution.",
        "toolId": null,
        "tags": [
          "FFT",
          "resolution"
        ]
      },
      {
        "title": "Windowing and leakage",
        "equation": "Window choice redistributes energy from components not centered on FFT lines",
        "body": "A window reduces spectral leakage at the cost of main-lobe width and amplitude correction. The best window depends on whether the goal is amplitude accuracy, frequency separation, or random-power estimation.",
        "interpretation": "Coherent gain and equivalent noise bandwidth must match the scaling method.",
        "mistake": "Applying a window but omitting its amplitude or power normalization.",
        "toolId": null,
        "tags": [
          "window",
          "leakage"
        ]
      },
      {
        "title": "Acceleration integration",
        "equation": "V(f)=A(f)/(i2πf) &nbsp;&nbsp; · &nbsp;&nbsp; X(f)=−A(f)/(2πf)²",
        "body": "Integration amplifies low-frequency bias and noise dramatically. Remove offsets and physically unjustified drift before integration, but preserve real low-frequency motion.",
        "interpretation": "Velocity-change closure, independent displacement measurement, and sensitivity to high-pass cutoff are essential checks.",
        "mistake": "Choosing a high-pass filter solely to make displacement look plausible.",
        "toolId": "integration-drift",
        "tags": [
          "integration",
          "drift"
        ]
      },
      {
        "title": "Accelerometer sensitivity and range",
        "equation": "V<sub>peak</sub> = S a<sub>peak</sub>",
        "body": "Sensitivity sets voltage output per acceleration; range, noise floor, low-frequency response, transverse sensitivity, temperature, and mass loading set suitability.",
        "interpretation": "A high-sensitivity sensor improves low-level resolution but reduces acceleration headroom.",
        "mistake": "Selecting only by g range while ignoring frequency response and mounting resonance.",
        "toolId": "accelerometer",
        "tags": [
          "sensor",
          "ICP"
        ]
      },
      {
        "title": "FRF estimators",
        "equation": "H₁ = G<sub>yx</sub>/G<sub>xx</sub> &nbsp;&nbsp; · &nbsp;&nbsp; H₂ = G<sub>yy</sub>/G<sub>xy</sub>",
        "body": "H1 minimizes response-noise bias; H2 minimizes input-noise bias under their respective assumptions. Neither corrects nonlinear behavior or missing inputs.",
        "interpretation": "Compare H1, H2, coherence, and repeatability when data quality is uncertain.",
        "mistake": "Using H1 automatically for every test without considering input noise.",
        "toolId": "mobility",
        "tags": [
          "FRF",
          "H1",
          "H2"
        ]
      },
      {
        "title": "Mounting and mass loading",
        "equation": "Measured resonance depends on sensor mass, mounting stiffness, and local structure",
        "body": "Stud mounting generally provides the broadest bandwidth; adhesive, wax, magnets, and handheld probes progressively alter stiffness and repeatability. Sensor mass can shift lightweight-panel modes.",
        "interpretation": "A small sensor can still be dynamically significant on a thin local panel patch.",
        "mistake": "Checking sensor mass against total structure mass instead of local modal mass.",
        "toolId": "accelerometer",
        "tags": [
          "mounting",
          "mass loading"
        ]
      },
      {
        "title": "Channel timing and directionality",
        "equation": "Δt = Δx/c<sub>g</sub>(f) only after selecting the correct wave and path",
        "body": "A common DAQ usually preserves relative timing, but filters, channel delays, reflections, and dispersive bending waves complicate arrival-time interpretation. Cross-correlation should be band-limited to the wave packet of interest.",
        "interpretation": "For flexural waves, group delay varies with frequency, so one broadband lag can be misleading.",
        "mistake": "Using the speed of sound or bulk wave speed to interpret a panel-bending delay.",
        "toolId": "bending-wave",
        "tags": [
          "timing",
          "directionality"
        ]
      },
      {
        "title": "Dynamic pressure measurements",
        "equation": "p(t) = p̄ + p′(t)",
        "body": "Static and dynamic pressure have different instrumentation requirements. A piezoelectric dynamic-pressure sensor measures fluctuations but not true DC pressure; range should cover expected dynamic peaks with installation resonance and temperature considered.",
        "interpretation": "A 100 psi range can be compatible with a 30 psig mean only if the sensor is designed for the static preload and the dynamic component remains in range.",
        "mistake": "Assuming a dynamic pressure sensor can replace the static pressure channel.",
        "toolId": null,
        "tags": [
          "pressure sensor",
          "dynamic pressure"
        ]
      },
      {
        "title": "Traceable data conditioning",
        "equation": "Raw → calibrated → conditioned → derived should be reproducible",
        "body": "Every transformation should record calibration, units, filtering, resampling, windowing, averaging, clipping checks, and channel mapping. Derived plots should be regenerable from raw data.",
        "interpretation": "A compact processing manifest prevents years of ambiguity in flight or test databases.",
        "mistake": "Saving only final PSD plots without the processing settings and source record identifiers.",
        "toolId": null,
        "tags": [
          "data QA",
          "traceability"
        ]
      }
    ]
  }
];

function appendNoiseControlConcept(sectionId, item) {
  const section = sections.find(candidate => candidate.id === sectionId);
  if (section) section.concepts.push(item);
}

appendNoiseControlConcept('acoustics-db', {
  title: 'Coherent versus incoherent level addition', equation: 'pΣ=Σ|pi|e^(jφi)  versus  LΣ=10log10Σ10^(Li/10)',
  body: 'Independent broadband sources add mean-square energy. Phase-locked tones add complex pressure and can reinforce or cancel at one location; their sum changes when phase or geometry changes.',
  interpretation: 'Choose the addition rule from source coherence and the measured quantity, not from convenience.', mistake: 'Energy-summing coherent tonal pressures or arithmetically adding independent dB levels.', toolId: 'db', tags: ['coherence', 'phase', 'decibels']
});
appendNoiseControlConcept('acoustics-db', {
  title: 'Background correction validity', equation: 'Ls=10log10(10^(Lt/10)−10^(Lb/10))',
  body: 'Subtracting an independent background is numerically sensitive when total and background levels are close. Below about a 3 dB separation, small measurement uncertainty can dominate the inferred source level.',
  interpretation: 'A correction can be algebraically defined yet experimentally untrustworthy.', mistake: 'Reporting a large background correction without uncertainty or a quieter measurement condition.', toolId: 'db', tags: ['background', 'subtraction', 'uncertainty']
});
appendNoiseControlConcept('acoustics-db', {
  title: 'Finite-source geometric spreading', equation: 'plane ≈ 0, line ≈ −3, point ≈ −6 dB per doubling',
  body: 'A receiver sees a finite source as plane-like, then line-like, then point-like as range exceeds successive source dimensions. Coherence and wavelength further shape the transition.',
  interpretation: 'Distance benefit depends on apparent source dimensionality and field region.', mistake: 'Applying point-source spreading beside a long plume, vehicle, duct outlet, or radiating panel.', toolId: 'source-geometry', tags: ['spreading', 'line source', 'near field']
});
appendNoiseControlConcept('acoustics-db', {
  title: 'Acoustic spectrum density and band level', equation: 'p²band=∫Gpp(f)df;  white: constant/Hz;  pink: constant/octave',
  body: 'An acoustic PSD is mean-square pressure per hertz. Band level depends on integration bandwidth: white noise gains energy with linear bandwidth, while pink noise contributes approximately equal energy per octave.',
  interpretation: 'A spectrum value is incomplete without density/band convention and frequency resolution.', mistake: 'Comparing narrowband density, FFT-line level, and octave-band level as if they were the same quantity.', toolId: 'noise-metrics-criteria', tags: ['acoustic PSD', 'white noise', 'pink noise']
});
appendNoiseControlConcept('damping-isolation', {
  title: 'Rotating unbalance and mount isolation', equation: 'F0=meω²;  r=f/fn; isolation begins above r=√2',
  body: 'Rotating unbalance force rises with speed squared. A resilient mount amplifies near resonance and reduces transmitted force only above the isolation crossover; lower mount frequency demands greater static deflection and travel.',
  interpretation: 'Softening a mount is an installed load, alignment, clearance, and transient trade—not a free attenuation factor.', mistake: 'Calling a mount an isolator when operating speed lies below √2 times its resonance.', toolId: 'tuned-absorber-isolation', tags: ['unbalance', 'isolation', 'transmissibility']
});
appendNoiseControlConcept('damping-isolation', {
  title: 'Tuned dynamic absorber', equation: 'm2ẍ2+c2(ẋ2−ẋ1)+k2(x2−x1)=0',
  body: 'A secondary mass, spring, and damper create an antiresonance near one stable forcing frequency. Mass ratio controls authority, damping controls robustness, and detuning creates two adjacent response peaks.',
  interpretation: 'A tuned absorber trades narrowband depth for mass, stroke, bandwidth, and tolerance sensitivity.', mistake: 'Using a tuned absorber for a wandering broadband environment without checking off-tune amplification.', toolId: 'tuned-absorber-isolation', tags: ['TMD', 'antiresonance', 'tuning']
});
appendNoiseControlConcept('signal-testing', {
  title: 'Acoustic sensor chain and field correction', equation: 'pressure → capsule → preamplifier → conditioning → ADC → spectrum',
  body: 'Microphone type, incidence, grid/capsule scattering, mounting, windscreen, calibration, cable/preamplifier headroom, anti-alias filtering, weighting, and geometry all belong to the reported acoustic result.',
  interpretation: 'A calibrator validates sensitivity at one frequency; it does not validate the acoustic field or the entire dynamic measurement chain.', mistake: 'Treating calibration as proof that placement, wind, reflections, and overload are acceptable.', toolId: 'acoustic-measurement-planner', tags: ['microphone', 'calibration', 'measurement chain']
});

export const toolCatalog = [
  {
    "id": "db",
    "title": "Decibel & Level Math",
    "category": "Acoustics",
    "description": "Add independent levels, convert amplitude or power ratios, subtract known contributions, and compute overall levels.",
    "complexity": "Foundation",
    "keywords": [
      "dB",
      "OASPL",
      "level sum"
    ]
  },
  {
    "id": "octave",
    "title": "Fractional-Octave Bands",
    "category": "Acoustics",
    "description": "Generate exact band centers and edges for octave, third-octave, sixth-octave, or custom constant-percentage bands.",
    "complexity": "Foundation",
    "keywords": [
      "octave",
      "band edges"
    ]
  },
  {
    "id": "weighting",
    "title": "A / C / Z Weighting",
    "category": "Acoustics",
    "description": "Apply standard frequency weighting to a band spectrum and calculate the weighted overall level.",
    "complexity": "Foundation",
    "keywords": [
      "A-weighting",
      "C-weighting",
      "OASPL"
    ]
  },
  {
    "id": "sound-power",
    "title": "Sound Power from SPL",
    "category": "Acoustics",
    "description": "Estimate source sound power from free-field pressure, distance, directivity, and atmospheric impedance.",
    "complexity": "Screening",
    "keywords": [
      "sound power",
      "free field"
    ]
  },
  {
    "id": "sdof",
    "title": "SDOF Response",
    "category": "Dynamics",
    "description": "Calculate natural frequency, harmonic force response, base transmissibility, relative motion, phase, and frequency-response curves.",
    "complexity": "Core",
    "keywords": [
      "resonance",
      "transmissibility",
      "base excitation"
    ]
  },
  {
    "id": "damping",
    "title": "Damping Converter",
    "category": "Dynamics",
    "description": "Move among damping ratio, Q, loss factor, logarithmic decrement, decay time, and half-power bandwidth.",
    "complexity": "Foundation",
    "keywords": [
      "Q",
      "zeta",
      "loss factor"
    ]
  },
  {
    "id": "miles",
    "title": "Miles’ Equation",
    "category": "Random & Shock",
    "description": "Estimate narrowband RMS acceleration, velocity, and displacement response to a locally flat input PSD.",
    "complexity": "Core",
    "keywords": [
      "random vibration",
      "GRMS",
      "Q"
    ]
  },
  {
    "id": "grms",
    "title": "GRMS Integrator",
    "category": "Random & Shock",
    "description": "Integrate a piecewise log-log PSD, report segment slopes and areas, and export the reconstructed spectrum.",
    "complexity": "Core",
    "keywords": [
      "PSD",
      "integration",
      "GRMS"
    ]
  },
  {
    "id": "vrs",
    "title": "Vibration Response Spectrum",
    "category": "Random & Shock",
    "description": "Numerically sweep an SDOF bank through a shaped base-acceleration PSD and calculate RMS response.",
    "complexity": "Advanced",
    "keywords": [
      "VRS",
      "PSD response"
    ]
  },
  {
    "id": "shock-pulse",
    "title": "Classical Shock Pulses",
    "category": "Random & Shock",
    "description": "Generate half-sine, haversine, rectangular, and terminal-sawtooth pulses with impulse and velocity-change checks.",
    "complexity": "Core",
    "keywords": [
      "pulse",
      "impulse",
      "shock"
    ]
  },
  {
    "id": "srs",
    "title": "Shock Response Spectrum",
    "category": "Random & Shock",
    "description": "Compute positive, negative, and maximax absolute-acceleration SRS for a generated classical pulse.",
    "complexity": "Advanced",
    "keywords": [
      "SRS",
      "pyroshock",
      "tripartite"
    ]
  },
  {
    "id": "beam",
    "title": "Beam Response",
    "category": "Structures",
    "description": "Calculate section properties, static response, stress, natural frequencies, and normalized bending mode shapes for common beam boundary conditions.",
    "complexity": "Core",
    "keywords": [
      "beam",
      "deflection",
      "modes"
    ]
  },
  {
    "id": "plate-modes",
    "title": "Rectangular Plate Modes",
    "category": "Structures",
    "description": "Calculate thin, simply supported isotropic plate modes, view their signed mode shapes, and identify near-degenerate pairs.",
    "complexity": "Core",
    "keywords": [
      "plate",
      "modal frequency"
    ]
  },
  {
    "id": "bending-wave",
    "title": "Structural Wave Speeds",
    "category": "Structures",
    "description": "Compare longitudinal, shear, and dispersive bending-wave speeds, then locate the plate critical frequency set by material and thickness.",
    "complexity": "Core",
    "keywords": [
      "dispersion",
      "group velocity",
      "plate",
      "longitudinal wave",
      "shear wave",
      "critical frequency",
      "coincidence"
    ]
  },
  {
    "id": "ring-frequency",
    "title": "Cylinder Ring Frequency",
    "category": "Structural Acoustics",
    "description": "Estimate the thin-shell ring frequency, compare it with plate-like bending, and explore axial-circumferential shell mode-shape families.",
    "complexity": "Core",
    "keywords": [
      "cylinder",
      "shell",
      "ring frequency"
    ]
  },
  {
    "id": "critical-frequency",
    "title": "Plate Critical Frequency",
    "category": "Structural Acoustics",
    "description": "Calculate coincidence frequency from material, thickness, fluid sound speed, and plate bending stiffness.",
    "complexity": "Core",
    "keywords": [
      "coincidence",
      "critical frequency"
    ]
  },
  {
    "id": "radiation-efficiency",
    "title": "Radiation Regime Explorer",
    "category": "Structural Acoustics",
    "description": "Screen subcritical, coincidence, and supercritical radiation regimes using wavelength and finite-panel scales.",
    "complexity": "Screening",
    "keywords": [
      "radiation efficiency",
      "coincidence"
    ]
  },
  {
    "id": "mass-law",
    "title": "Single-Panel Transmission Loss",
    "category": "Structural Acoustics",
    "description": "Calculate normal-incidence and diffuse-field mass-law trends with critical-frequency and resonance context.",
    "complexity": "Screening",
    "keywords": [
      "TL",
      "mass law",
      "panel"
    ]
  },
  {
    "id": "double-panel",
    "title": "Double-Panel Transmission",
    "category": "Structural Acoustics",
    "description": "Estimate mass–air–mass resonance and the screening transmission-loss trend of two separated panels.",
    "complexity": "Screening",
    "keywords": [
      "double panel",
      "mass air mass"
    ]
  },
  {
    "id": "cavity-modes",
    "title": "Acoustic Cavity Modes",
    "category": "Acoustics",
    "description": "List rectangular cavity modes, classify axial/tangential/oblique families, and identify clustered resonances.",
    "complexity": "Core",
    "keywords": [
      "room mode",
      "cavity"
    ]
  },
  {
    "id": "room-t60",
    "title": "Room Reverberation Time",
    "category": "Acoustics",
    "description": "Calculate Sabine and Eyring T60 from volume, surface area, and average absorption.",
    "complexity": "Foundation",
    "keywords": [
      "T60",
      "Sabine",
      "Eyring"
    ]
  },
  {
    "id": "modal-density",
    "title": "Modal Density",
    "category": "SEA & Energy",
    "description": "Estimate beam or plate mode count, modal density, average spacing, and band populations.",
    "complexity": "Core",
    "keywords": [
      "modal density",
      "mode count"
    ]
  },
  {
    "id": "modal-overlap",
    "title": "Modal Overlap & SEA Check",
    "category": "SEA & Energy",
    "description": "Calculate overlap factor from modal density and loss factor and flag isolated, transitional, or overlapping behavior.",
    "complexity": "Core",
    "keywords": [
      "SEA",
      "overlap",
      "validity"
    ]
  },
  {
    "id": "two-subsystem-sea",
    "title": "Two-Subsystem SEA",
    "category": "SEA & Energy",
    "description": "Solve reciprocal two-subsystem energy balance with internal and coupling loss factors and input power.",
    "complexity": "Advanced",
    "keywords": [
      "SEA",
      "CLF",
      "energy flow"
    ]
  },
  {
    "id": "mobility",
    "title": "FRF & Impedance Converter",
    "category": "Dynamics",
    "description": "Convert complex receptance, mobility, accelerance, and mechanical impedance at a selected frequency.",
    "complexity": "Core",
    "keywords": [
      "FRF",
      "mobility",
      "impedance"
    ]
  },
  {
    "id": "spatial-correlation",
    "title": "Corcos Spatial Correlation",
    "category": "Aero / Distributed Loads",
    "description": "Visualize streamwise and cross-stream coherence decay, convective phase, and array-spacing implications.",
    "complexity": "Advanced",
    "keywords": [
      "Corcos",
      "TBL",
      "coherence"
    ]
  },
  {
    "id": "correlation-matrix",
    "title": "Correlation Matrix Inspector",
    "category": "Aero / Distributed Loads",
    "description": "Build a sensor-array correlation matrix, inspect eigenvalues, and identify near-singular or nonphysical inputs.",
    "complexity": "Advanced",
    "keywords": [
      "matrix",
      "coherence",
      "positive definite"
    ]
  },
  {
    "id": "dynamic-scaling",
    "title": "Dynamic-Pressure Scaling",
    "category": "Aero / Distributed Loads",
    "description": "Scale PSD, RMS, or pressure-amplitude environments with a user-defined dynamic-pressure exponent.",
    "complexity": "Core",
    "keywords": [
      "q scaling",
      "environment"
    ]
  },
  {
    "id": "fea-mesh",
    "title": "Dynamic FEA Mesh Sizing",
    "category": "Structures",
    "description": "Estimate element length from acoustic, longitudinal, shear, or plate-bending wavelength and elements-per-wavelength target.",
    "complexity": "Core",
    "keywords": [
      "FEA",
      "mesh",
      "wavelength"
    ]
  },
  {
    "id": "accelerometer",
    "title": "Accelerometer Chain Check",
    "category": "Test & Signal",
    "description": "Check sensitivity, voltage headroom, noise, low-frequency suitability, mass loading, and sample-rate margin.",
    "complexity": "Screening",
    "keywords": [
      "accelerometer",
      "sensor",
      "DAQ"
    ]
  },
  {
    "id": "integration-drift",
    "title": "Acceleration Integration Drift",
    "category": "Test & Signal",
    "description": "Quantify displacement drift from acceleration bias and compare it with the displacement implied by sinusoidal acceleration.",
    "complexity": "Core",
    "keywords": [
      "displacement",
      "bias",
      "integration"
    ]
  },
  {
    "id": "expansion-chamber",
    "title": "Expansion-Chamber TL",
    "category": "Noise Control",
    "description": "Calculate the ideal plane-wave transmission loss of a simple reactive expansion chamber.",
    "complexity": "Screening",
    "keywords": [
      "muffler",
      "duct",
      "TL"
    ]
  }
];

export const demos = [
  {
    "id": "sdof-motion",
    "title": "Resonance in Motion",
    "description": "Sweep forcing frequency through an SDOF resonance and watch amplitude, phase, spring energy, and damping loss change.",
    "topic": "Dynamics",
    "toolId": "sdof"
  },
  {
    "id": "damping-transmissibility",
    "title": "Damping and Transmissibility",
    "description": "Change damping and frequency ratio while the resonance peak, isolation crossover, and transmitted-force tradeoff update together.",
    "topic": "Dynamics",
    "toolId": "damping"
  },
  {
    "id": "two-mode",
    "title": "Two Coupled Modes",
    "description": "Change mass and coupling ratios, then animate the in-phase and out-of-phase modes of a two-degree-of-freedom system.",
    "topic": "Modal Dynamics",
    "toolId": "two-dof"
  },
  {
    "id": "beam-wave",
    "title": "Beam Waves and Standing Modes",
    "description": "Switch between a traveling flexural wave and a standing beam mode while mode order and animation speed change.",
    "topic": "Structures",
    "toolId": "beam"
  },
  {
    "id": "dispersion",
    "title": "Bending-Wave Dispersion",
    "description": "Launch a broadband packet and see higher-frequency flexural content outrun lower-frequency content.",
    "topic": "Structures",
    "toolId": "bending-wave"
  },
  {
    "id": "coincidence",
    "title": "Coincidence Explorer",
    "description": "Move structural and acoustic wavenumber curves until they intersect at plate critical frequency.",
    "topic": "Structural Acoustics",
    "toolId": "critical-frequency"
  },
  {
    "id": "radiation-efficiency",
    "title": "Radiation-Efficiency Transition",
    "description": "Move a panel from subcritical to supercritical bending and watch its acoustic radiation become progressively more efficient.",
    "topic": "Structural Acoustics",
    "toolId": "radiation-efficiency"
  },
  {
    "id": "ring",
    "title": "Cylinder Ring Behavior",
    "description": "Animate circumferential deformation below, near, and above the thin-shell ring-frequency scale.",
    "topic": "Shells",
    "toolId": "ring-frequency"
  },
  {
    "id": "psd-response",
    "title": "PSD Through a Resonance",
    "description": "Drag an SDOF resonance across a shaped PSD and watch the response PSD and GRMS update.",
    "topic": "Random Vibration",
    "toolId": "vrs"
  },
  {
    "id": "srs-bank",
    "title": "How an SRS Is Built",
    "description": "Drive a bank of oscillators with one pulse and watch the peak-response envelope form.",
    "topic": "Shock",
    "toolId": "srs"
  },
  {
    "id": "sandwich-regimes",
    "title": "Honeycomb Wave Regimes",
    "description": "Sweep frequency through bending-dominated, transitional, and shear-limited propagation in a flight-like honeycomb sandwich panel.",
    "topic": "SEA / Sandwich Structures",
    "toolId": "honeycomb-wave"
  },
  {
    "id": "energy-bias",
    "title": "Why Sparse Sensors Misread Energy",
    "description": "Move a finite sensor set across an inhomogeneous panel field and compare its SEA energy estimate with the mass-weighted spatial truth.",
    "topic": "Test / SEA",
    "toolId": "inhomogeneous-energy"
  },
  {
    "id": "wavenumber-transmission",
    "title": "Seeing Junction Transmission in k-Space",
    "description": "Turn a synthetic two-dimensional scan into incident and transmitted wavenumber power, then recover the junction transmission coefficient.",
    "topic": "Structural Acoustics / Test",
    "toolId": "junction-transmission"
  },
  {
    "id": "junction-transmission",
    "title": "Lap Joint vs Sleeve Joint",
    "description": "Compare ideal line coupling, point-connection behavior, and the report's digitized lap-joint trend as frequency and joint geometry change.",
    "topic": "SEA / Structural Acoustics",
    "toolId": "junction-transmission"
  },
  {
    "id": "joint-acceptance",
    "title": "Panel Joint Acceptance",
    "description": "Sweep TBL convection velocity to find where a convective pressure field couples most strongly to a selected panel mode, then compare uniform, diffuse, and propagating-wave forcing.",
    "topic": "Structural Acoustics / Distributed Loads",
    "toolId": "spatial-correlation"
  },
  {
    "id": "spatial-field",
    "title": "Spatial Correlation Fields",
    "description": "Compare diffuse acoustic, ideal propagating-wave, and Corcos turbulent-boundary-layer coherence over a flat plate referenced at its center.",
    "topic": "Acoustics / Distributed Loads",
    "toolId": "spatial-correlation"
  },
  {
    "id": "sea-flow",
    "title": "CLF Energy-Flow Workbench",
    "description": "Separate gross bidirectional coupling power from net energy flow while frequency, modal-density ratio, forward CLF, and input location change.",
    "topic": "SEA",
    "toolId": "clf-identification-uncertainty"
  }
];

export const caseNotes = [
  {
    "id": "bending-delay",
    "number": "01",
    "title": "A 5 ms Delay on a Barrel Panel: What Does It Actually Tell You?",
    "summary": "Two synchronized accelerometers can show directionality, but a dispersive shell does not offer one universal propagation speed.",
    "readTime": "7 min",
    "tags": [
      "directionality",
      "bending waves",
      "testing"
    ],
    "body": "<p>A measured delay from an upper accelerometer to a lower accelerometer is real evidence that a wave packet reached the upper location first. It is not, by itself, proof that the original source is geometrically above both sensors. Reflections, local attachments, circumferential paths, and multiple wave families can all create the same ordering.</p>\n<h2>Start with the wave family</h2><p>For a thin barrel panel in the low-to-mid frequency range, flexural motion is often the dominant measured response. Flexural waves are dispersive:</p><div class=\"equation\">c<sub>g</sub>(f) = 2(D/ρh)<sup>1/4</sup>√(2πf)</div><p>The group speed changes with frequency. A broadband shock therefore spreads as it propagates, and the high-frequency packet can arrive first. A single broadband cross-correlation lag blends those different delays into one number.</p>\n<h2>A practical workflow</h2><p>Band-limit both channels around coherent packets, calculate cross-correlation or cross-phase by band, compare the measured delay with predicted group delay, and repeat for multiple sensor pairs. Confirm that channel filters and anti-alias paths have matched delay.</p><div class=\"callout\"><strong>Engineering check:</strong> the predicted path length is Δx ≈ c<sub>g</sub>(f)Δt only when the band is narrow enough, the wave path is known, and reflections do not dominate.</div>\n<h2>What you can claim</h2><p>You can state that the measured response propagates predominantly from the upper sensor toward the lower sensor over the coherent frequency band. Locating the source requires additional geometry, at least one more independent path, and a shell-wave model appropriate to the frequency range.</p>"
  },
  {
    "id": "ring-vs-critical",
    "number": "02",
    "title": "Ring Frequency Is Not Critical Frequency",
    "summary": "Both are important shell scales, but one comes from structural curvature and the other from acoustic coincidence.",
    "readTime": "6 min",
    "tags": [
      "shells",
      "ring frequency",
      "coincidence"
    ],
    "body": "<p>Ring frequency and critical frequency are frequently placed on the same plot because both help explain a cylindrical panel’s vibroacoustic behavior. They answer different questions.</p>\n<h2>Ring frequency</h2><div class=\"equation\">f<sub>r</sub> = [1/(2πR)]√[E/(ρ(1−ν²))]</div><p>This thin-shell scale is tied to circumferential extensional behavior and curvature. Below it, curvature strongly couples membrane and bending motion. Above it, a local patch can behave progressively more like a flat plate when its wavelength is small compared with radius.</p>\n<h2>Critical frequency</h2><div class=\"equation\">f<sub>c</sub> = c₀²/(2π)√(ρh/D)</div><p>Critical frequency comes from equality of flexural phase speed and acoustic sound speed. It indicates when a plate-like bending wave can match a propagating acoustic wave.</p>\n<div class=\"callout\"><strong>Use both:</strong> ring frequency helps judge the structural shell regime; critical frequency helps judge radiation and transmission. Neither is automatically the boundary between every “resonance-controlled” and “mass-controlled” region.</div>"
  },
  {
    "id": "combine-psds",
    "number": "03",
    "title": "When Two Response PSDs May Be Added—and When They May Not",
    "summary": "Independent physical processes add in mean square; envelopes, percentile curves, and correlated sources require more bookkeeping.",
    "readTime": "8 min",
    "tags": [
      "PSD",
      "statistics",
      "load cases"
    ],
    "body": "<p>If two zero-mean random responses are statistically independent and refer to the same response quantity, location, axes, bandwidth, and operating condition, their auto PSDs add directly.</p><div class=\"equation\">G<sub>total</sub> = G₁ + G₂</div><p>When they are correlated, the cross term matters:</p><div class=\"equation\">G<sub>total</sub> = G₁ + G₂ + 2Re{G₁₂}</div>\n<h2>The envelope trap</h2><p>A maximax TBL curve can select one Mach case at one frequency and another case elsewhere. A percentile vortex curve may describe uncertainty over angle of attack or flight condition. Adding them produces a conservative arithmetic curve, but not necessarily one realizable P97.5/C50 environment.</p>\n<h2>Keep the case map</h2><p>The clean method is to combine physically concurrent source PSDs within each parent load case first, carry correlation assumptions explicitly, then compute the desired statistics or envelope across the combined cases.</p><div class=\"callout\"><strong>Minimum documentation:</strong> source process, parent load case, statistical basis, correlation assumption, duration, response location, and frequency resolution.</div>"
  },
  {
    "id": "accel-displacement",
    "number": "04",
    "title": "Why Acceleration Integration Produces Absurd Displacement",
    "summary": "Double integration magnifies tiny low-frequency bias; believable displacement requires measurement-chain and physics checks.",
    "readTime": "6 min",
    "tags": [
      "integration",
      "accelerometers",
      "signal processing"
    ],
    "body": "<p>Frequency-domain integration divides acceleration by frequency twice:</p><div class=\"equation\">X(f) = −A(f)/(2πf)²</div><p>A small DC offset or sub-hertz drift therefore becomes an enormous displacement. This is not a numerical bug; it is the mathematics reporting that the measurement cannot distinguish true low-frequency acceleration from bias.</p>\n<h2>Build confidence rather than tuning the plot</h2><p>Remove the calibrated sensor bias, inspect pre-event baseline, verify velocity change against known motion, compare several physically defensible high-pass cutoffs, and use video, LVDT, laser, or MEMS displacement-capable measurements when low-frequency travel matters.</p><div class=\"callout\"><strong>Do not:</strong> keep raising the high-pass corner until the displacement “looks right.” That hides the uncertainty instead of resolving it.</div>"
  },
  {
    "id": "spatial-correlation-loads",
    "number": "05",
    "title": "Why Point PSDs Are Not a Distributed Load",
    "summary": "A pressure field excites a structure through spatial phase and coherence, not just local spectral level.",
    "readTime": "7 min",
    "tags": [
      "TBL",
      "CSD",
      "FSP"
    ],
    "body": "<p>Applying the same pressure PSD independently to every panel element assumes zero cross correlation. Applying it with identical phase everywhere assumes full correlation. Both extremes can be badly wrong.</p><div class=\"equation\">G<sub>FF</sub>(f) = B(f)G<sub>pp</sub>(f)Bᴴ(f)</div><p>The interpolation or force-pattern matrix B maps the pressure CSD field into structural degrees of freedom. The generalized force of a mode depends on how the pressure phase aligns with the mode shape.</p>\n<h2>What the array must measure</h2><p>Streamwise spacing resolves convective phase and decay; cross-stream spacing resolves lateral coherence; enough aperture is required to see the field decorrelate. The fitted model must remain Hermitian and positive semidefinite when assembled over the full grid.</p><div class=\"callout\"><strong>Response insight:</strong> increasing point pressure can reduce a modal response when the changed correlation field creates stronger spatial cancellation.</div>"
  },
  {
    "id": "sea-readiness",
    "number": "06",
    "title": "Is This Frequency High Enough for SEA?",
    "summary": "Frequency alone is not the criterion; modal population, overlap, coupling, and field diffuseness decide whether the statistical model is credible.",
    "readTime": "6 min",
    "tags": [
      "SEA",
      "modal overlap",
      "hybrid"
    ],
    "body": "<p>SEA is often introduced as a “high-frequency method,” but the transition frequency is subsystem-specific. A large thin panel may have high modal density at a frequency where a short stiff beam still has isolated modes.</p><div class=\"equation\">M ≈ η f n(f)</div><p>The modal overlap factor compares modal bandwidth with average spacing. Values well above one support smooth band behavior, but overlap alone does not guarantee diffuse fields or weak, statistically describable coupling.</p>\n<h2>Use a readiness checklist</h2><p>Count modes per analysis band, calculate overlap by wave type, inspect deterministic attachment paths, test sensitivity to subsystem partitioning, and compare against FE or test in the overlap region. A hybrid FE–SEA model is often the correct answer when some regions remain deterministic.</p><div class=\"callout\"><strong>Warning:</strong> widening the analysis band can make a result look statistical while masking a real narrowband deterministic path.</div>"
  },
  {
    "id": "liftoff-ascent-forcing",
    "number": "07",
    "title": "Same SPL, Different Load: Vibroacoustic Forcing from Liftoff to Ascent",
    "summary": "Diffuse acoustics, propagating waves, and turbulent boundary-layer pressure can share a local spectrum while producing very different panel response.",
    "readTime": "16 min",
    "tags": [
      "launch acoustics",
      "TBL",
      "wavenumber",
      "vibroacoustics"
    ],
    "body": `<p>A launch-vehicle panel does not respond to a sound-pressure level alone. It responds to a pressure field distributed over area, and that field carries direction, phase, coherence, convection speed, and correlation length. Two environments can have the same point pressure PSD and still deliver very different generalized forces to the same structural mode.</p>
<p>That distinction is central to launch work. Liftoff is commonly governed by propulsion-generated acoustic loading, pad and flame-deflector interactions, reflections, and short transient pressure events. During atmospheric ascent, attached turbulent boundary layers, wakes, separated flow, oscillating shocks, and buffet can become important. The source changes with time, and so does the spatial forcing model used to convert an external environment into structural response.</p>
<div class="callout"><strong>Core idea:</strong> local level tells you how much pressure is present at a point. The cross-spectral field tells you how that pressure adds—or cancels—when projected onto the structure.</div>

<h2>One response framework, three very different loads</h2>
<p>For a stationary random pressure field, write the pressure cross-spectral density between two surface points as</p>
<div class="equation">G<sub>pp</sub>(x,x′,f) = √[G<sub>pp</sub>(x,x,f)G<sub>pp</sub>(x′,x′,f)] Γ(x,x′,f)</div>
<p>The complex coherence Γ carries the spatial decay and phase. Projecting the field onto structural mode φ<sub>n</sub> gives the modal-force PSD</p>
<div class="equation">G<sub>Qn</sub>(f) = ∬<sub>A×A</sub> φ<sub>n</sub>(x) G<sub>pp</sub>(x,x′,f) φ<sub>n</sub>(x′) dA dA′</div>
<p>and the modal-response PSD is</p>
<div class="equation">G<sub>qn</sub>(f) = |H<sub>n</sub>(f)|² G<sub>Qn</sub>(f)</div>
<p>In a finite-element implementation, the same operation becomes G<sub>FF</sub> = B G<sub>pp</sub> Bᴴ and G<sub>xx</sub> = H G<sub>FF</sub> Hᴴ. The first mapping converts a surface pressure CSD matrix into nodal-force CSD; the second passes those correlated forces through the structural frequency-response functions.</p>

<div class="table-wrap article-comparison"><table><thead><tr><th>Forcing field</th><th>Useful idealization</th><th>What controls panel loading</th><th>Typical launch use</th></tr></thead><tbody>
<tr><td><strong>Diffuse acoustic field</strong></td><td>Many incident directions with statistically distributed phase; Γ ≈ sin(kr)/(kr) in an ideal 3D isotropic field</td><td>Acoustic wavelength, panel area, modal radiation/acceptance, enclosure and reverberation</td><td>Liftoff acoustic response, reverberant qualification, high-frequency SEA</td></tr>
<tr><td><strong>Propagating acoustic wave</strong></td><td>Directional plane or locally planar wave; Γ = exp(−i k<sub>∥</sub>·Δx)</td><td>Incidence angle, in-plane acoustic wavenumber, phase over the panel, reflections</td><td>Directional plume or external acoustic components, low-frequency deterministic studies</td></tr>
<tr><td><strong>Turbulent boundary layer</strong></td><td>Convecting wall-pressure field with finite streamwise and lateral coherence</td><td>Wall-pressure PSD, convection velocity U<sub>c</sub>, coherence decay, convective wavenumber ridge</td><td>Attached-flow portions of atmospheric ascent</td></tr>
</tbody></table></div>

<section class="case-demo-embed" aria-labelledby="spatial-field-embed-title">
  <header class="case-demo-header"><div><h3 id="spatial-field-embed-title">Explore the spatial forcing</h3><p>Hold the point spectrum fixed, then change model, frequency, sound speed, incidence, and TBL correlation parameters.</p></div><a class="concept-tool-link" href="#/demo/spatial-field">Open full demo →</a></header>
  <div class="demo-stage" data-embedded-demo="spatial-field"></div>
</section>

<h2>Liftoff: propulsion acoustics are not automatically “diffuse”</h2>
<p>At liftoff, rocket-plume mixing noise interacts with the launch platform, flame trench or deflector, mobile launcher, ground plane, and vehicle geometry. The vehicle sees broadband acoustic pressure, but it can also see directional components, spatial gradients, reflections, and nonstationary pressure transients. NASA SP-8072 remains a foundational source for propulsion-generated acoustic-load estimation, while modern flight and ground-test programs refine those environments with vehicle- and facility-specific data.</p>
<p>A diffuse acoustic field is often a practical engineering representation when many arrival directions and reflections populate the field, and it aligns naturally with reverberant acoustic testing and SEA. It is not a universal description. At low frequencies, a fairing or compartment may contain only a few acoustic modes; standing-wave structure and source direction can dominate. A deterministic or hybrid acoustic model is then more credible than assigning the same diffuse-field assumption to every band.</p>
<p>For liftoff response, analysts commonly start with station-dependent one-third-octave or narrowband external pressure levels, establish whether the load is sustained random acoustics or a short transient event, assign a spatial field, and calculate transfer to skin panels, frames, internal structure, and payload interfaces. Test data, subscale scaling, and flight measurements are used to anchor uncertain source and transmission assumptions.</p>

<h2>Ascent: TBL is a convecting pressure field, not airborne sound</h2>
<p>Under an attached turbulent boundary layer, surface-pressure fluctuations are carried downstream at a convection velocity U<sub>c</sub> that is usually a fraction of the local external-flow velocity. A Corcos-type engineering model represents streamwise and cross-stream coherence decay together with a convective phase:</p>
<div class="equation">Γ<sub>TBL</sub>(Δx,Δy,f) = exp[−α<sub>x</sub>ω|Δx|/U<sub>c</sub> − α<sub>y</sub>ω|Δy|/U<sub>c</sub>] exp(−iωΔx/U<sub>c</sub>)</div>
<p>The model is attractive because a wall-pressure PSD, two decay coefficients, and a convection speed generate a complete surface CSD field. Its simplicity is also its limit. Shock motion, separation, protuberance wakes, cavity tones, and buffet are distinct forcing processes; fitting all ascent excitation with one attached-flow TBL model can hide the actual physics.</p>
<p>As the trajectory evolves, Mach number, dynamic pressure, Reynolds number, boundary-layer state, temperature, local geometry, and shock pattern all change. Response should therefore be calculated by parent flight condition or time window, not from a frequency-by-frequency maximax envelope whose peaks may come from mutually exclusive points on the trajectory.</p>

<h2>Why wavelength matching can create the maximum TBL response</h2>
<p>A resonant peak requires more than a large pressure PSD. The pressure field must also have spatial content that the mode can accept. For a simply supported rectangular plate of length L and width W, a mode has approximate structural wavenumber components</p>
<div class="equation">k<sub>x,m</sub> = mπ/L &nbsp;&nbsp; and &nbsp;&nbsp; k<sub>y,n</sub> = nπ/W</div>
<p>The convective ridge of a TBL pressure field is centered approximately at</p>
<div class="equation">k<sub>c</sub> ≈ ω/U<sub>c</sub>, &nbsp;&nbsp; λ<sub>c</sub> = 2π/k<sub>c</sub> = U<sub>c</sub>/f</div>
<p>Strong streamwise modal forcing occurs when the panel mode and convecting pressure pattern have substantial wavenumber overlap—often summarized as k<sub>x,m</sub> ≈ k<sub>c</sub>, or λ<sub>x,m</sub> ≈ λ<sub>c</sub>. At a fixed frequency, that estimate can be written directly as a convection velocity:</p>
<div class="equation">U<sub>c,match</sub> ≈ 2fL/m</div>
<p>This is why convection velocity is such a useful acceptance variable. Hold the structural mode and forcing frequency fixed, then move U<sub>c</sub> through the flight-condition range. At low U<sub>c</sub>, the convective wavelength is short and pressure phase reverses too rapidly across the modal lobes. Near the acceptance peak, positive pressure correlation aligns efficiently with like-signed modal regions. For higher-order modes with alternating streamwise lobes, a high-U<sub>c</sub> pressure pattern can become longer and smoother than the best match, allowing opposite-signed modal regions to cancel again; the first streamwise mode instead approaches its uniform-field behavior.</p>
<p>If the spatial match occurs near the same frequency as a lightly damped structural resonance, the two filters align: the forcing projects efficiently onto the mode and the structural receptance is high. NASA TN D-6970 describes this as pressure-wave/flexural-wave wavelength matching and notes that a large response results when peak coincidence occurs at a resonant frequency.</p>
<div class="callout"><strong>The maximum is a double match:</strong> temporal resonance supplies large |H<sub>n</sub>|; spatial or wavenumber matching supplies large G<sub>Qn</sub>. Either one without the other can produce a modest response.</div>
<section class="case-demo-embed" aria-labelledby="joint-acceptance-embed-title">
  <header class="case-demo-header"><div><h3 id="joint-acceptance-embed-title">Find the convection velocity the panel accepts</h3><p>Hold frequency and mode fixed, then move U<sub>c</sub> below, through, and above the computed acceptance peak. Compare the full Corcos result with the simple k<sub>c</sub> = k<sub>x</sub> estimate while the signed contribution map shows where cancellation changes.</p></div><a class="concept-tool-link" href="#/demo/joint-acceptance">Open full demo →</a></header>
  <div class="demo-stage" data-embedded-demo="joint-acceptance"></div>
</section>
<p>With the demo defaults—f = 135 Hz, L = 2 m, and m = 3—the simple estimate gives U<sub>c,match</sub> = 180 m/s. The full finite-panel Corcos projection peaks closer to 210 m/s because coherence decay changes the wavenumber weighting and broadens the overlap. That difference is not an error; it is the reason to use the simple equality as a diagnostic and the full CSD projection as the calculation.</p>
<p>This is an engineering ridge, not an absolute equality for every real panel. Finite dimensions broaden the structural acceptance, and boundary conditions, damping, curvature, orthotropy, stiffeners, panel joints, pressure coherence lengths, and non-TBL flow features can shift or smear the peak. A velocity sweep is also not a trajectory response by itself: pressure PSD, frequency content, local U<sub>c</sub>, boundary-layer state, structural frequency, and damping must remain tied to the same parent flight condition.</p>

<h2>Do not confuse TBL matching with acoustic coincidence</h2>
<p>Both phenomena compare pressure-field and structural wavenumbers, but the relevant propagation speeds are different. For an acoustic wave, k<sub>a</sub> = ω/c and classic plate coincidence occurs when the flexural wavenumber matches the acoustic in-plane wavenumber. For TBL loading, the dominant streamwise pressure wavenumber is approximately k<sub>c</sub> = ω/U<sub>c</sub>. Because U<sub>c</sub> is generally much lower than sound speed c, the TBL convective wavenumber is much larger at the same frequency. The matching frequency and structural modes can therefore be completely different from the ordinary acoustic critical-frequency problem.</p>

<section class="case-demo-embed" aria-labelledby="coincidence-embed-title">
  <header class="case-demo-header"><div><h3 id="coincidence-embed-title">Compare with acoustic coincidence</h3><p>Vary plate properties and sound speed to see where the airborne acoustic and flexural dispersion curves meet.</p></div><a class="concept-tool-link" href="#/demo/coincidence">Open full demo →</a></header>
  <div class="demo-stage" data-embedded-demo="coincidence"></div>
</section>

<h2>A practical liftoff-to-ascent response workflow</h2>
<ol>
<li><strong>Keep the trajectory and source map.</strong> Define liftoff, tower-clearance, transonic, max-dynamic-pressure, supersonic, and other governing windows without losing which sources are physically concurrent.</li>
<li><strong>Characterize more than local level.</strong> Carry pressure PSD, spatial coherence or wavenumber spectrum, phase model, duration, uncertainty, and statistical basis.</li>
<li><strong>Choose the field by mechanism.</strong> Use diffuse, directional acoustic, TBL, wake, shock/buffet, or measured-array representations where each is physically justified.</li>
<li><strong>Map pressure to structure without destroying correlation.</strong> Assemble G<sub>pp</sub>, verify Hermitian symmetry and positive semidefiniteness, then form correlated nodal or modal forces.</li>
<li><strong>Choose FE, SEA, or hybrid analysis by regime.</strong> Deterministic FE is valuable where modes and load phase are resolvable; SEA becomes useful when modal populations and overlap support a statistical description; hybrid methods bridge mixed regimes.</li>
<li><strong>Recover the requested response.</strong> Calculate acceleration, strain, interface force, internal acoustics, or component input PSD with consistent frequency resolution and damping.</li>
<li><strong>Anchor and challenge the model.</strong> Compare with ground test, wind-tunnel, flight, or heritage data; vary convection speed, coherence decay, damping, boundary conditions, and transmission paths.</li>
</ol>
<div class="callout"><strong>Load-case discipline:</strong> do not add maximax liftoff and ascent envelopes as if they were simultaneous random sources. Combine concurrent mechanisms inside each parent case, include cross terms when correlation is credible, then form the required statistics or envelope across cases.</div>

<h2>Qualification and model boundaries</h2>
<p>NASA-STD-7001C defines payload vibroacoustic verification in terms of acoustic and structure-borne random-vibration environments, but explicitly excludes launch vehicles themselves. Launch-vehicle environment definition remains program controlled. That boundary matters: a payload qualification spectrum is not automatically the correct forcing field for predicting launch-vehicle skin response, and a launch-vehicle external pressure environment is not yet a component test input until structural transmission and uncertainty have been addressed.</p>
<p>The analysis should state whether its input is an external pressure specification, a measured surface CSD, an internal acoustic environment, an interface acceleration, or a qualification test level. Those quantities belong to different locations in the load path and should not be interchanged merely because they share PSD units or one-third-octave bands.</p>

<h2>Further reading</h2>
<ul>
<li><a href="https://ntrs.nasa.gov/citations/19710023719" target="_blank" rel="noreferrer">NASA SP-8072, Acoustic Loads Generated by the Propulsion System</a></li>
<li><a href="https://ntrs.nasa.gov/citations/20090010260" target="_blank" rel="noreferrer">NASA/TM-2008-215167, Initial Assessment of the Ares I-X Upper Stage to Vibroacoustic Flight Environments</a></li>
<li><a href="https://ntrs.nasa.gov/api/citations/19730004207/downloads/19730004207.pdf" target="_blank" rel="noreferrer">NASA TN D-6970, Random Response of Rectangular Panels to the Pressure Field Beneath a Turbulent Boundary Layer</a></li>
<li><a href="https://ntrs.nasa.gov/citations/20090028702" target="_blank" rel="noreferrer">NASA study of TBL excitation on a real launch vehicle using SEA</a></li>
<li><a href="https://standards.nasa.gov/standard/NASA/NASA-STD-7001" target="_blank" rel="noreferrer">NASA-STD-7001C, Payload Vibroacoustic Test Criteria</a></li>
</ul>`
  },
  {
    "id": "honeycomb-junctions-exp-sea",
    "number": "08",
    "title": "From Honeycomb Waves to SEA Junctions: A Working Guide to TR 12-007",
    "summary": "A practical route through sandwich-panel dispersion, experimental SEA, spatial energy bias, and wavenumber-resolved joint transmission.",
    "readTime": "18 min",
    "tags": [
      "honeycomb panels",
      "experimental SEA",
      "junctions",
      "wavenumber"
    ],
    "body": `<p>Honeycomb sandwich panels are attractive spacecraft structures because they place stiff faces far apart with very little core mass. That same construction makes their high-frequency dynamics richer than the familiar thin-plate picture. The bending stiffness is enormous, transverse shear eventually limits propagation, response energy can be strongly nonuniform, and a narrow mechanical joint can control how vibration crosses an otherwise efficient panel.</p>
<p>Technical Report 12-007 turns those issues into a coherent experimental program: characterize the panels, ask when a statistical description becomes credible, recover coupling from measured power balance, and then look directly at the wavenumber content crossing representative joints. This guide converts that chain of reasoning into reusable calculations and interactive checks.</p>
<div class="callout"><strong>The organizing idea:</strong> first establish what waves the panel can carry, then establish whether band-averaged energy is meaningful, and only then reduce a measured junction to a coupling loss factor.</div>

<h2>1. The sandwich panel is not simply a very stiff thin plate</h2>
<p>A classical thin plate has a bending-wave phase speed that rises with the square root of frequency. A sandwich panel follows that trend only while core shear deformation is negligible. The report uses an effective wave-speed model that smoothly joins the bending-controlled limit to a shear-controlled limit:</p>
<div class="equation">c<sub>eff</sub>² = 2N / [μ + √(μ² + 4μN²/(ω²D))]</div>
<p>Here D is the sandwich bending stiffness per unit width, μ is mass per unit area, and N is the transverse shear stiffness per unit width. At low frequency the second term in the denominator dominates and the classical flexural result is recovered. At high frequency the speed approaches √(N/μ), so the core sets a ceiling on propagation speed.</p>
<p>This is more than a dispersion detail. Wave speed controls wavelength, wavenumber, modal density, coincidence with airborne sound, and the relation between damping loss factor and spatial decay. A thin-plate assumption can therefore be reasonable for one band and misleading only an octave or two later.</p>

<section class="case-demo-embed" aria-labelledby="sandwich-regimes-embed-title">
  <header class="case-demo-header"><div><h3 id="sandwich-regimes-embed-title">Move through the three wave regimes</h3><p>Choose either report panel, sweep frequency, and compare the bending asymptote, the effective sandwich speed, and the core-shear limit.</p></div><a class="concept-tool-link" href="#/demo/sandwich-regimes">Open full demo →</a></header>
  <div class="demo-stage" data-embedded-demo="sandwich-regimes"></div>
</section>

<p>For the report's first panel, the model gives an airborne coincidence scale near 0.31 kHz. At 1 kHz it predicts roughly 6.4 modes in a one-third-octave band. Those numbers make the transition tangible: 500 Hz may be a useful lower bound for broad statistical trends, but it does not imply that every one-third-octave result is already well populated. By about 2 kHz, modal overlap and band population provide a much stronger statistical basis.</p>
<p><a class="concept-tool-link" href="#/tool/honeycomb-wave">Open the Honeycomb Wave &amp; SEA Readiness calculator →</a></p>

<h2>2. SEA readiness is an evidence chain, not a frequency label</h2>
<p>Statistical energy analysis replaces individual modal coordinates with subsystem energies and power flows. That compression is useful only when each subsystem supports enough participating modes, damping creates useful modal overlap, and the field is sufficiently diffuse for a spatially averaged energy to represent the subsystem.</p>
<div class="equation">N<sub>band</sub> ≈ n(f)Δf &nbsp;&nbsp;&nbsp; and &nbsp;&nbsp;&nbsp; M ≈ ηωn(f)</div>
<p>The first quantity counts expected modes in the analysis band; the second compares modal bandwidth with mean modal spacing. Neither is a pass/fail rule on its own. A credible assessment combines both with measured mode shapes, spatial response variation, attachment behavior, and sensitivity to subsystem boundaries.</p>
<div class="table-wrap article-comparison"><table><thead><tr><th>Question</th><th>Useful diagnostic</th><th>Failure mode if ignored</th></tr></thead><tbody>
<tr><td>Are there enough modes?</td><td>Modes per one-third-octave band</td><td>A single resonance is reported as a smooth statistical mean</td></tr>
<tr><td>Do resonances overlap?</td><td>Modal overlap factor</td><td>Band energy depends strongly on exact modal tuning</td></tr>
<tr><td>Is energy spatially representative?</td><td>Mass-weighted scan or dense accelerometer survey</td><td>A few hot or cold sensors bias the subsystem energy</td></tr>
<tr><td>Is coupling statistical?</td><td>Reciprocity, passivity, repeatability, and partition sensitivity</td><td>A deterministic fastener path is hidden inside one CLF</td></tr>
</tbody></table></div>

<h2>3. Experimental SEA is an inverse power-balance problem</h2>
<p>For two subsystems, steady band power balance can be written in terms of subsystem energies E, internal loss factors η, coupling loss factors η<sub>ij</sub>, and input powers P:</p>
<div class="equation">P₁/ω = (η₁ + η₁₂)E₁ − η₂₁E₂</div>
<div class="equation">P₂/ω = −η₁₂E₁ + (η₂ + η₂₁)E₂</div>
<p>The experimental method excites one subsystem at a time, estimates both stored energies, and solves the resulting linear system for the four unknown loss factors. The arithmetic is compact; the experimental discipline is not. Input power must be measured, energy estimates must use compatible bandwidth and mass normalization, and the two excitation cases must be independent enough that the inverse is not ill-conditioned.</p>
<p>The resulting CLFs should be challenged physically. Negative values usually signal noise, poor conditioning, a violated diffuse-field assumption, or inconsistent power and energy estimates. Reciprocity provides another check: the modal-density-weighted coupling should agree in both directions for a passive reciprocal junction.</p>
<p><a class="concept-tool-link" href="#/tool/experimental-sea">Open the Experimental SEA Inversion calculator →</a></p>

<h2>4. Energy estimation is where a clean SEA equation meets a messy structure</h2>
<p>For a vibrating panel, kinetic energy in a frequency band is estimated from the mass-weighted mean-square velocity. A uniform average of a small sensor set is only unbiased when the sensors represent the mass distribution and the response field sampled by that mass.</p>
<div class="equation">E<sub>kin</sub> = ½ ∫<sub>A</sub> μ(x,y) |v(x,y)|² dA</div>
<p>Modes, boundaries, local reinforcement, joints, damping treatment, and forcing location create hot and cold regions. A sparse grid can land on an antinode and overpredict energy, or on a nodal pattern and underpredict it. The error is not fixed by taking a longer time average because it is spatial bias, not sampling variance in time.</p>

<section class="case-demo-embed" aria-labelledby="energy-bias-embed-title">
  <header class="case-demo-header"><div><h3 id="energy-bias-embed-title">See the sensor-placement bias</h3><p>Change field nonuniformity, hotspot position, sensor count, and mass distribution. The map compares the continuous mass-weighted energy with the discrete estimate.</p></div><a class="concept-tool-link" href="#/demo/energy-bias">Open full demo →</a></header>
  <div class="demo-stage" data-embedded-demo="energy-bias"></div>
</section>

<p>A practical test plan uses a pretest modal or wave model to distribute sensors across expected spatial scales, includes additional points near joints without letting them dominate the mass average, and reports sensitivity to alternative sensor subsets. Scanning laser vibrometry is especially valuable when a small number of accelerometers cannot establish field homogeneity.</p>
<p><a class="concept-tool-link" href="#/tool/inhomogeneous-energy">Open the Inhomogeneous Energy Bias calculator →</a></p>

<h2>5. A CLF says how much energy crosses; wavenumber analysis helps explain why</h2>
<p>A spatial vibration scan contains propagating-wave direction as well as amplitude. A two-dimensional Fourier transform maps the measured velocity field into wavenumber space. Components traveling toward a junction can then be separated from components traveling away from it, allowing incident and transmitted powers to be estimated by integrating the appropriate wavenumber regions.</p>
<div class="equation">τ = P<sub>transmitted</sub> / P<sub>incident</sub></div>
<p>The procedure is conceptually direct but sensitive to aperture, grid spacing, windowing, reflections, near fields, and the boundary chosen between incident and outgoing sectors. A short aperture broadens the wavenumber peaks; a coarse grid aliases short wavelengths; strong reflections can make directional separation ambiguous. The result should be presented with these resolution limits, not as a geometry-only material property.</p>

<section class="case-demo-embed" aria-labelledby="wavenumber-transmission-embed-title">
  <header class="case-demo-header"><div><h3 id="wavenumber-transmission-embed-title">Recover transmission from a synthetic scan</h3><p>Change the true transmission, scan aperture, and spectral separation. Watch leakage in the k-space map shift the recovered result.</p></div><a class="concept-tool-link" href="#/demo/wavenumber-transmission">Open full demo →</a></header>
  <div class="demo-stage" data-embedded-demo="wavenumber-transmission"></div>
</section>

<h2>6. Lap joints and sleeve joints are different coupling mechanisms</h2>
<p>An ideal continuous line junction couples distributed motion along its length. A bolted or riveted joint behaves more like a sequence of point connections until the spacing becomes short relative to the structural wavelength. A sleeve adds mass, stiffness, contact interfaces, and an additional load path; it should not be represented automatically by the same transmission law as a simple overlap.</p>
<p>The report's lap-joint measurements show a broadly decreasing transmission trend across the evaluated bands rather than one universal constant. The calculator includes an approximate digitization of that published curve only as a learning overlay. It is clearly labeled because it is not the original numerical dataset and should not be used as qualification data.</p>

<section class="case-demo-embed" aria-labelledby="junction-transmission-embed-title">
  <header class="case-demo-header"><div><h3 id="junction-transmission-embed-title">Compare three joint descriptions</h3><p>Move frequency, fastener spacing, line mobility, and point stiffness to see when a joint looks distributed and when its discrete connections remain visible.</p></div><a class="concept-tool-link" href="#/demo/junction-transmission">Open full demo →</a></header>
  <div class="demo-stage" data-embedded-demo="junction-transmission"></div>
</section>

<p>The transmission coefficient can be related to an SEA coupling loss factor when the receiving subsystem has a meaningful modal density and the junction can be represented statistically. That conversion is useful, but it must preserve direction, subsystem convention, and the geometric normalization used in the junction model.</p>
<p><a class="concept-tool-link" href="#/tool/junction-transmission">Open the Junction Transmission &amp; CLF calculator →</a></p>

<h2>7. Two kinds of spatial matching must not be confused</h2>
<p>The site's <a href="#/demo/joint-acceptance">Panel Joint Acceptance demo</a> asks how a distributed pressure field projects onto a structural mode. This report's junction problem asks how an already-propagating structural wave crosses a mechanical connection. Both benefit from wavenumber thinking, but they sit at different points in the load path:</p>
<div class="equation">pressure field → modal acceptance → panel energy → junction transmission → receiving-panel energy</div>
<p>Keeping those operators separate prevents a common modeling mistake: using a pressure coherence correction as if it were a structural transmission coefficient, or applying a joint CLF before the source field has been projected onto the source subsystem.</p>

<h2>A reusable analysis and test checklist</h2>
<ol>
<li><strong>Characterize the sandwich construction.</strong> Record face and core geometry, areal mass, bending stiffness, transverse shear stiffness, damping, boundary conditions, and mass attachments.</li>
<li><strong>Calculate the wave-regime map.</strong> Compare effective, bending-limit, and shear-limit speeds; calculate coincidence, modal density, band population, and overlap.</li>
<li><strong>Choose deterministic, SEA, or hybrid treatment by band.</strong> Keep isolated modes and direct load paths deterministic; use statistical averages only where the evidence supports them.</li>
<li><strong>Design spatial sampling before testing.</strong> Resolve expected wavelengths, scan across the joint, and distribute energy sensors by mass and expected field variation.</li>
<li><strong>Measure both energy and input power.</strong> Preserve calibration, bandwidth, phase convention, window correction, and mass normalization.</li>
<li><strong>Invert and validate.</strong> Check conditioning, passivity, reciprocity, repeatability, and sensitivity to sensor subsets and subsystem boundaries.</li>
<li><strong>Use wavenumber results as mechanism evidence.</strong> Report aperture and resolution limits, and compare directional transmission with the band CLFs.</li>
</ol>

<h2>Model boundaries</h2>
<p>The tools in this collection are compact learning models. They reproduce the report's key equations, panel properties, workflow, and trends; they do not reproduce every test correction or provide qualification-ready joint data. The lap-joint curve is approximately digitized from a published figure, the synthetic k-space scan is intentionally idealized, and the energy-field model is illustrative. Use the original report, calibrated measurements, and a project-specific structural model for design decisions.</p>
<p><a href="references/12-007-TR-HoneycombPanels_ExpSEA_SAH.pdf" target="_blank" rel="noreferrer">Open the source report: 12-007-TR-HoneycombPanels_ExpSEA_SAH →</a></p>`
  },
  {
    "id": "clf-not-a-percentage",
    "number": "09",
    "title": "A Coupling Loss Factor Is Not a Percentage",
    "summary": "CLFs describe directional energy-transfer rates; gross exchange, net flow, reciprocity, conditioning, and measurement bias determine what an identified value actually means.",
    "readTime": "13 min",
    "tags": [
      "coupling loss factor",
      "SEA",
      "power injection",
      "uncertainty"
    ],
    "body": `<p>A coupling loss factor is dimensionless, which makes it tempting to read η<sub>12</sub> = 0.02 as “two percent of subsystem 1 energy crosses the joint.” That shortcut misses the time scale, the reverse exchange, and the subsystem statistics that give the number meaning.</p>
<p>In statistical energy analysis, a directional CLF turns stored band energy into average transmitted power:</p>
<div class="equation">P<sub>1→2</sub> = ωη<sub>12</sub>E₁</div>
<p>The factor is an energy-transfer rate normalized by angular frequency. At a fixed energy and CLF, doubling frequency doubles gross transmitted power. This does not mean a discrete packet loses the same percentage on every crossing; it is a steady-state, band-averaged description of a statistical subsystem.</p>
<div class="callout"><strong>Working interpretation:</strong> η<sub>12</sub> tells the SEA balance how quickly subsystem 1 offers its stored energy to subsystem 2. It is not the net power flow, a transmission coefficient, or a probability.</div>

<h2>Gross exchange occurs in both directions</h2>
<p>Two connected subsystems generally exchange power simultaneously:</p>
<div class="equation">P<sub>net,1→2</sub> = ωη<sub>12</sub>E₁ − ωη<sub>21</sub>E₂</div>
<p>The first term may be large even when the net term is small, because the receiving subsystem also sends energy back. A one-way arrow is useful for bookkeeping; two gross arrows are the better physical picture.</p>

<section class="case-demo-embed" aria-labelledby="clf-workbench-embed-title">
  <header class="case-demo-header"><div><h3 id="clf-workbench-embed-title">Separate gross coupling from net flow</h3><p>Move the forward CLF, frequency, modal-density ratio, and input-power split. The diagram keeps both directional powers visible while the net arrow changes independently.</p></div><a class="concept-tool-link" href="#/demo/sea-flow">Open full workbench →</a></header>
  <div class="demo-stage" data-embedded-demo="sea-flow"></div>
</section>

<p>At thermal-like statistical equilibrium, equal energy per mode produces no net transfer through a reciprocal junction. Total subsystem energies need not be equal:</p>
<div class="equation">E₁/n₁ = E₂/n₂ &nbsp;&nbsp; ⇒ &nbsp;&nbsp; P<sub>net</sub> = 0</div>
<p>This is why SEA energy-flow language is most precise when it refers to modal energy rather than energy alone. A subsystem with twice the modal density can hold twice the total energy at equilibrium.</p>

<h2>Directional does not mean arbitrary</h2>
<p>For passive reciprocal coupling, the two directional CLFs are connected by modal density:</p>
<div class="equation">n₁η<sub>12</sub> = n₂η<sub>21</sub></div>
<p>Equal CLFs are therefore a special case associated with equal modal densities. Copying η<sub>12</sub> into the reverse matrix term can violate detailed balance even when the physical joint is perfectly symmetric.</p>
<p>Reciprocity is also an excellent experimental diagnostic. If measured modal densities and identified directional CLFs produce a ratio far from unity, examine energy normalization, spatial sampling, input-power estimation, band definition, nonstationarity, and whether the two regions are defensible SEA subsystems.</p>

<h2>Internal loss and coupling loss do different jobs</h2>
<p>Internal loss removes energy from the modeled system as heat or unresolved dissipation. Coupling loss moves energy to another modeled subsystem. For subsystem 1, the outgoing terms appear together in the diagonal balance:</p>
<div class="equation">P₁ = ω(η₁ + η<sub>12</sub>)E₁ − ωη<sub>21</sub>E₂</div>
<p>A decay test on the connected assembly can observe the combined effect of internal loss and energy leakage. Treating that decay rate automatically as the free-subsystem ILF double-counts coupling when the SEA matrix is assembled. Power-injection methods identify the internal and coupling terms together from the connected configuration.</p>

<h2>Experimental identification is an inverse problem</h2>
<p>For two subsystems, excite subsystem 1 and estimate both energies; then repeat with excitation on subsystem 2. The four measured energies form two independent columns:</p>
<div class="equation">E = [[E₁₁, E₁₂], [E₂₁, E₂₂]]</div>
<p>If the two response columns are too similar, the energy matrix approaches singularity. Small errors in energy or input power then produce large changes in the four inferred loss factors. More averaging reduces random variance, but it does not repair a systematic spatial-energy bias or an invalid subsystem model.</p>
<p><a class="concept-tool-link" href="#/tool/experimental-sea">Open the deterministic Experimental SEA Inversion calculator →</a></p>

<h2>Why a negative CLF can be useful evidence</h2>
<p>A passive coupling path cannot have a physically negative average loss factor. Nevertheless, an unconstrained inverse calculation should be allowed to report negative values. They expose inconsistency rather than hiding it behind clipping.</p>
<p>Common causes include an ill-conditioned energy matrix, cross-energy terms near a measurement noise floor, inconsistent force normalization, sparse sensors landing on different modal patterns, incorrect input-power phase, nonstationary data, or a deterministic coupling path that violates the diffuse weak-coupling model.</p>
<div class="callout"><strong>Do not repair the test by setting negative estimates to zero.</strong> First repeat the inversion over frequency, alternative sensor subsets, independent excitations, and plausible calibration or spatial-bias ranges. The pattern of failures is diagnostic.</div>

<h2>Use uncertainty propagation, not only a best estimate</h2>
<p>The new identification tool starts with a known reciprocal two-subsystem system, generates the exact pair of power-injection tests, perturbs every energy and power measurement, and repeats the inverse calculation. The output is a distribution for each ILF and CLF rather than one deceptively precise number.</p>
<p>Its useful readouts are the median, 5th–95th percentile interval, negative-result probability, energy-matrix separation, and modal-density-weighted reciprocity ratio. A reproducible seed makes sensitivity studies directly comparable.</p>
<p><a class="concept-tool-link" href="#/tool/clf-identification-uncertainty">Open the CLF Identification &amp; Uncertainty calculator →</a></p>
<p>Random error widens the distribution and can be reduced with measurement quality and averaging. Systematic subsystem-energy bias shifts the median and reciprocity ratio; adding more Monte Carlo trials only defines the wrong answer more precisely. This distinction is central when a small accelerometer set is used to represent a large inhomogeneous panel.</p>

<h2>A transmission coefficient is not a CLF</h2>
<p>A wave transmission coefficient compares power incident on a junction with power transmitted through it. A CLF embeds that junction behavior inside a statistical subsystem description. The conversion also needs modal density, wave speed, junction length or point count, angular incidence treatment, and a consistent definition of stored energy.</p>
<p>The same measured transmission coefficient can therefore produce different CLFs when the source subsystem geometry or wave family changes. Conversely, a CLF should not be exported to a different subsystem partition merely because the physical fasteners look similar.</p>
<p><a class="concept-tool-link" href="#/tool/junction-transmission">Compare transmission and line/point CLFs in the Junction Transmission calculator →</a></p>

<h2>Know when one CLF is too much compression</h2>
<p>SEA coupling assumes band-averaged, statistically describable transfer between subsystems. A single CLF becomes questionable when one attachment mode, stiff deterministic member, narrow resonance, coherent wave path, or strongly coupled hybrid mode dominates the band.</p>
<p>A useful screening ratio compares coupling loss with internal loss. When η<sub>12</sub>/η₁ or η<sub>21</sub>/η₂ approaches or exceeds unity, the subsystem identities and weak-coupling assumption deserve closer examination. Strong coupling is not physically impossible; it is a warning that the chosen SEA partition may no longer be the best representation.</p>

<h2>A defensible CLF workflow</h2>
<ol>
<li><strong>Define the energy stores.</strong> Partition by wave type, geometry, damping, and expected field statistics—not only assembly boundaries.</li>
<li><strong>Check modal population and overlap.</strong> A stable matrix inversion does not make an isolated-mode subsystem statistical.</li>
<li><strong>Measure input power and spatial energy consistently.</strong> Preserve force phase, bandwidth, mass weighting, calibration, and drive-case normalization.</li>
<li><strong>Identify all connected loss terms together.</strong> Avoid substituting free-structure damping into a connected power balance without justification.</li>
<li><strong>Report uncertainty and diagnostics.</strong> Include intervals, negative-result frequency, matrix separation, reciprocity, repeatability, and sensor-subset sensitivity.</li>
<li><strong>Compare mechanisms.</strong> Use mobility, transmission, or wavenumber evidence to explain why the inferred coupling changes with frequency.</li>
<li><strong>Validate forward.</strong> Put the inferred ILFs and CLFs back into the energy-balance model and reproduce independent drive cases.</li>
</ol>

<h2>Model boundary</h2>
<p>The workbench is an exact visualization of the stated two-subsystem SEA equations. The uncertainty calculator is exact for its forward and inverse algebra, but its confidence intervals are conditional on the selected independent lognormal measurement-error model. Real programs should add correlated calibration errors, modal-density uncertainty, frequency averaging, spatial-estimator uncertainty, environmental variability, and subsystem-model discrepancy as appropriate.</p>`
  }
];

export const referenceGroups = [
  {
    "group": "Structural dynamics",
    "items": [
      {
        "title": "Den Hartog — Mechanical Vibrations",
        "note": "Classical SDOF response, isolation, vibration absorbers, and physical interpretation."
      },
      {
        "title": "Meirovitch — Elements of Vibration Analysis",
        "note": "Modal analysis, continuous systems, and response methods."
      },
      {
        "title": "Ewins — Modal Testing: Theory, Practice and Application",
        "note": "FRFs, modal testing, curve fitting, and test-analysis correlation."
      }
    ]
  },
  {
    "group": "Random vibration and shock",
    "items": [
      {
        "title": "NASA-HDBK-7005 — Dynamic Environmental Criteria",
        "note": "NASA guidance on dynamic environments, test criteria, random vibration, shock, and data treatment."
      },
      {
        "title": "Smallwood — An Improved Recursive Formula for Calculating Shock Response Spectra",
        "note": "Digital SRS computation and recursive-filter implementation."
      },
      {
        "title": "Steinberg — Vibration Analysis for Electronic Equipment",
        "note": "Miles-equation applications, electronic equipment, and fatigue screening."
      }
    ]
  },
  {
    "group": "Structural acoustics",
    "items": [
      {
        "title": "Fahy & Gardonio — Sound and Structural Vibration",
        "note": "Radiation, transmission, structural waves, fluid loading, and control."
      },
      {
        "title": "Cremer, Heckl & Petersson — Structure-Borne Sound",
        "note": "Wave propagation, mobility, junctions, and structural-acoustic transmission."
      },
      {
        "title": "Junger & Feit — Sound, Structures, and Their Interaction",
        "note": "Foundational fluid–structure interaction and radiation theory."
      }
    ]
  },
  {
    "group": "SEA and high frequency",
    "items": [
      {
        "title": "Lyon & DeJong — Theory and Application of Statistical Energy Analysis",
        "note": "SEA energy balance, modal density, coupling, and statistical assumptions."
      },
      {
        "title": "NASA-CR-161334 — Statistical Energy Analysis Response Prediction Methods for Structural Systems",
        "note": "Aerospace structural-response methods, example applications, and comparisons with measured data."
      },
      {
        "title": "Shorter & Langley — Vibro-acoustic analysis of complex systems",
        "note": "Hybrid deterministic–statistical concepts for mid- and high-frequency response."
      },
      {
        "title": "TR 12-007 — Honeycomb Panels, Experimental SEA, and Structural-Acoustic Holography",
        "note": "Sandwich-panel wave propagation, experimental SEA loss-factor recovery, spatial energy estimation, and wavenumber-resolved junction transmission. Local source: references/12-007-TR-HoneycombPanels_ExpSEA_SAH.pdf."
      }
    ]
  },
  {
    "group": "Signal processing and measurements",
    "items": [
      {
        "title": "Bendat & Piersol — Random Data",
        "note": "Spectral estimation, cross spectra, coherence, and statistical properties of measurements."
      },
      {
        "title": "Harris — On the Use of Windows for Harmonic Analysis with the DFT",
        "note": "Window behavior, leakage, resolution, and amplitude corrections."
      },
      {
        "title": "ISO 18431 series",
        "note": "Mechanical vibration and shock signal-processing methods."
      }
    ]
  },
  {
    "group": "Aeroacoustics and distributed pressure",
    "items": [
      {
        "title": "Corcos — Resolution of pressure in turbulence",
        "note": "Classical convective coherence model for turbulent boundary-layer pressure."
      },
      {
        "title": "NASA SP-8072 — Acoustic Loads Generated by the Propulsion System",
        "note": "Foundational launch-vehicle propulsion-acoustic source prediction and design guidance."
      },
      {
        "title": "NASA TN D-6970 — Random Response of Rectangular Panels Beneath a Turbulent Boundary Layer",
        "note": "Modal response, convective pressure fields, structural acceptance, and wavelength matching."
      },
      {
        "title": "NASA/TM-2008-215167 — Ares I-X Vibroacoustic Flight Environments",
        "note": "Liftoff and unsteady-aerodynamic excitation definitions with high-frequency SEA response assessment."
      },
      {
        "title": "NASA-TM-X-65012 — Excitation of Flat Panels Due to Fluctuating Pressures",
        "note": "Joint acceptance and cross-joint acceptance for simply supported panels under spatially correlated pressure."
      },
      {
        "title": "NASA ARC-E-DAA-TN31723 — Wavenumber-Frequency Pressure Spectra",
        "note": "Measured k–ω forcing functions and their use in aerospace vibroacoustic analysis."
      },
      {
        "title": "Blake — Mechanics of Flow-Induced Sound and Vibration",
        "note": "Turbulent pressure fields, flow-induced vibration, and source mechanisms."
      }
    ]
  }
];

export const glossary = [
  [
    "Accelerance",
    "Complex acceleration divided by force."
  ],
  [
    "ASD",
    "Amplitude spectral density; square root of PSD, with units per √Hz."
  ],
  [
    "CLF",
    "Directional SEA energy-transfer factor defined by gross power Pᵢ→ⱼ = ωηᵢⱼEᵢ; reciprocal directions are linked through modal density."
  ],
  [
    "Coherence",
    "Normalized linear spectral relationship between two channels."
  ],
  [
    "Critical frequency",
    "Plate coincidence frequency where flexural phase speed equals sound speed."
  ],
  [
    "CSD",
    "Cross-spectral density, including relative magnitude and phase."
  ],
  [
    "Damping ratio, ζ",
    "Viscous damping normalized by critical damping."
  ],
  [
    "FDS",
    "Fatigue damage spectrum."
  ],
  [
    "FRF",
    "Frequency response function between an input and response."
  ],
  [
    "GRMS",
    "Root-mean-square acceleration obtained by integrating an acceleration PSD."
  ],
  [
    "Group velocity",
    "Propagation speed of a narrowband wave packet or energy."
  ],
  [
    "ILF",
    "Internal loss factor in SEA."
  ],
  [
    "Loss factor, η",
    "Energy dissipated per radian divided by stored energy; approximately 2ζ for light damping."
  ],
  [
    "Modal density",
    "Number of modes per unit frequency."
  ],
  [
    "Modal overlap",
    "Ratio of modal bandwidth to average modal spacing."
  ],
  [
    "Mobility",
    "Complex velocity divided by force."
  ],
  [
    "OASPL",
    "Overall sound pressure level over a stated frequency range."
  ],
  [
    "Phase velocity",
    "Speed of a constant-phase point of a sinusoidal wave."
  ],
  [
    "PSD",
    "Power spectral density; mean-square content per hertz."
  ],
  [
    "Q",
    "Resonance quality factor, approximately 1/(2ζ)."
  ],
  [
    "Radiation efficiency",
    "Radiated power normalized by ρcS times mean-square normal velocity."
  ],
  [
    "Receptance",
    "Complex displacement divided by force."
  ],
  [
    "Ring frequency",
    "Thin-cylinder structural frequency scale tied to circumferential extensional behavior."
  ],
  [
    "SEA",
    "Statistical energy analysis."
  ],
  [
    "SRS",
    "Shock response spectrum."
  ],
  [
    "TBL",
    "Turbulent boundary layer."
  ],
  [
    "TL",
    "Transmission loss."
  ],
  [
    "VRS",
    "Vibration response spectrum."
  ],
  [
    "Wavenumber",
    "Spatial angular frequency, 2π divided by wavelength."
  ],
  [
    "BPF",
    "Blade-passage frequency: shaft rotation frequency multiplied by blade count."
  ],
  [
    "Critical band / ERB",
    "Frequency range integrated by one auditory filter; ERB is its equivalent rectangular bandwidth."
  ],
  [
    "Critical distance",
    "Source range at which direct and reverberant acoustic energy are equal."
  ],
  [
    "Directivity index, DI",
    "Level correction 10 log10(Q) associated with source directivity factor Q."
  ],
  [
    "Leq",
    "Energy-equivalent continuous sound level over a stated reporting duration."
  ],
  [
    "SEL",
    "Sound exposure level: total event acoustic energy normalized to one second."
  ],
  [
    "Room constant",
    "Diffuse-room absorption parameter R = Sα/(1−α) used with the reverberant sound-field term."
  ],
  [
    "Insertion loss",
    "Measured or predicted receiver-level reduction caused by installing a treatment in an otherwise matched system."
  ],
  [
    "Fresnel number",
    "Dimensionless diffracted path-length measure used to estimate barrier attenuation."
  ],
  [
    "Helmholtz resonator",
    "Tuned acoustic absorber formed by neck inertance and enclosed-volume compliance."
  ],
  [
    "Tuned mass absorber",
    "Secondary mass–spring–damper that creates a narrowband antiresonance in a primary structure."
  ]
];
