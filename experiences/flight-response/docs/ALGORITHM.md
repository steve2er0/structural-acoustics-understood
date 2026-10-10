# Numerical method and comparison scope

## Continuous oscillator response

The relative displacement z obeys z″ + 2ζωₙz′ + ωₙ²z = −a, with ζ=1/(2Q). Absolute acceleration is −2ζωₙz′−ωₙ²z; pseudo acceleration is ωₙ²z. Their signs differ; maximax uses the absolute value. Define u=−ωₙ²z and v=u′/ωₙ; then [u′,v′] = ωₙ[v,a−u−2ζv]. Absolute output is u+2ζv and pseudo output is −u.

For A=ωₙ[[0,1],[-1,−2ζ]], B=[0,ωₙ]ᵀ, h=Δt and Φ=exp(Ah), exact integration of linearly interpolated input gives xₙ₊₁=Φxₙ+(D−E)aₙ+Eaₙ₊₁, with D=A⁻¹(Φ−I)B and E=(A⁻¹D/h−A⁻¹B). `coefficients` uses closed-form damped sin/cos entries. This is a state-space first-order-hold/ramp-invariant implementation, consistent with the motivation in Smallwood's work; it is not an unverified copy of named filter weights. The state is never reset between display bins. Float64 state and peak storage are used.

Initial state is zero at the first time sample. Base acceleration is linearly taken to zero at the next sample after the last supplied sample; zero input is then appended for ln(10⁶)/(ζωₙ,min), six decades of homogeneous state-envelope decay. Primary is the supplied record; residual is all appended samples. This is a finite tail cutoff, not an infinite-time proof. Actual prehistory is unknown. Each endpoint output is sampled; extrema between samples are not explicitly optimized. No filter can recover aliased acceleration from an imported record.

Frequency grids are log spaced and nested when points/octave is doubled, with the exact upper endpoint included. Require ≥6 samples per approximate resonance bandwidth fₙ/Q: points/octave ≥ceil(6Q ln2). This is a resolution floor, not a claim of convergence. Recompute with a finer grid and sample rate before interpretation. Natural frequency is at most sample rate/20. Resources are limited to 1600 oscillators, 350 million steps and 100 MB bin storage. The worker is terminated on cancellation/restart/input changes; incomplete results never become comparisons.

## Display and maxima

Each 50 ms bin stores the maximum absolute output. Local curves take the maximum across a trailing integer number of bins, and can rise/fall. Running maxima are prefix maxima and never decrease. Final maxima take all samples including residual. Playback timestamps mark completed-bin ends; the final partial bin ends at the true record+tail end. The time-frequency map uses the same trailing-bin definition as the spectrum. Changing display windows never reintegrates the oscillators or changes final/qualification maxima.

Whole-record absolute acceleration maximax is the acceleration SRS for this Q/grid/input interpolation/primary+residual definition. Pseudo acceleration has a different transfer function. Neither is cumulative fatigue. No FDS is calculated.

## Nominal qualification from PSD

For r=f/fₙ and denominator d=(1−r²)²+(r/Q)², |H_absolute|²=[1+(r/Q)²]/d and |H_pseudo|²=1/d. Input is a one-sided acceleration PSD. Log-log interpolation spans only the specified endpoints; zero outside that finite band is an explicit assumption. Numerically integrate response moments mⱼ=∫fʲG(f)|H|²df for j=0,2,4 using trapezoids on a dense logarithmic grid that includes PSD breakpoints. Density scales with Q to resolve resonances. Repeat with doubled density: withhold a reference if variance or peak-rate refinement differs by ≥0.5%. Integration limits are excitation frequencies, distinct from oscillator frequencies.

RMS=√m₀, expected peak rate νₚ=√(m₄/m₂) in Hz-based moments, N=νₚT. Require N≥10. The default follows Cho eqs.11–14: Rayleigh envelope exceedance exp(−k²/2), N exp(−k²/2)=1, so k=√(2 ln N). This is one expected exceedance, not the expected maximum or a confidence bound.

An explicitly selectable alternative assumes N independent Rayleigh envelope peaks, F_max(k)=[1−exp(−k²/2)]ᴺ, and inverts F_max=p: k=√[−2 ln(1−p^(1/N))]. Use `expm1` for stable inversion. p is editable/exported. This describes independent envelope maxima; it does not prove independence for correlated time-domain peaks, nor does it justify doubling N for positive/negative accelerations. The envelope represents narrowband absolute cycle amplitudes.

Both statistical options assume stationary Gaussian excitation and approximately narrowband output. These assumptions may fail for absolute acceleration with substantial out-of-band contribution, low Q, tones, non-Gaussian input, short exposure or control notching. Numerical integration and CDF inversion can be validated; those physical assumptions cannot be validated without achieved qualification histories. Startup and shutdown qualification transients/residual peaks are not estimated by the stationary model. A compatible precomputed primary+residual ERS is the supported way to compare a known finite-test convention. The specified PSD is never presented as achieved qualification.

## Inputs, units and invalidity

Canonical acceleration is m/s², standard gravity 9.80665 m/s²; PSD unit factors are squared. Display/export can use g or m/s². Positive precomputed reference levels are log-log interpolated only inside their given range. Q, output type and primary+residual metadata must match. Invalid/missing/zero/out-of-range reference prevents any current ratio, with no extrapolation or infinite/false-passing result. Imports validate complete records before replacing inputs. Changing inputs clears comparison/export availability until a valid new computation finishes.

## Technical sources

- D.H. Cho, *Evaluation of Vibration Test Severity by FDS and ERS*, ISMA 2010, section 2.2.2, equations 11–14: https://past.isma-isaac.be/downloads/isma2010/papers/isma2010_0128.pdf . The paper's ERS uses relative deflection. This prototype explicitly selects acceleration or pseudo acceleration and applies the corresponding transfer function; it does not assume the user's existing convention matches.
- D.O. Smallwood, Sandia, *Improved recursive formula for calculating shock response spectra*: https://www.osti.gov/biblio/5181963 . Primary bibliographic abstract describes ramp-invariant simulation; the state-space transition here is derived above and independently checked against SciPy's matrix exponential.
- Supplied NASA report https://ntrs.nasa.gov/api/citations/20100003382/downloads/20100003382.pdf is a modal test report (FRFs, damping and free decay). It provides measurement context; it does not supply the ERS peak algorithm. Do not cite it as a certification basis.
- Independent numerical verification uses SciPy `scipy.linalg.expm` and `scipy.integrate.quad`; these are validation tools only and are not shipped as runtime dependencies.
