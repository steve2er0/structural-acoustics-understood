"""Independent analytical diagnostics. Imports no application implementation/data.

Artificial constant-density curves isolate units, allocation and geometry. This
does not establish handbook-curve accuracy or measured engine/pad correlation.
The distributed reference uses a closed-form axial integral, not source slices.
"""
import json
import math
from pathlib import Path

root = Path(__file__).resolve().parent.parent
base = dict(thrust=1000000, velocity=2000, diameter=1, efficiency=1,
            fmin=200, fmax=400, band="octave", directivity="isotropic",
            sourceBasis="custom", customSpectrum="0.001,0\n1,0",
            receiverX=0, receiverY=10, receiverZ=0, bendRadiusD=0,
            standOffD=4, turn=90)
power = 10000000.0  # 0.01 * (F Ue / 2)
width_factor = math.sqrt(2) - 1 / math.sqrt(2)
positions = [17.0, 11.5]  # Independent readings: Fig. 14 solid curve, St=.1,.2.
cases = []
for config in ["none", "open", "closed", "twin"]:
    xs = [5.7, 3.6] if config == "closed" else positions
    bands = []
    for f, station in zip([200.0, 400.0], xs):
        if config == "none" or station < 4:
            r2 = 100 + station**2
        else:
            r2 = 100 + 4**2 + (station - 4)**2
        watts = power * f * width_factor / 2000
        level = 10 * math.log10(watts) + 120 - 10 * math.log10(r2) - 11
        bands.append(dict(frequency=f, sourceWatts=watts, splDb=level))
    oa = 10 * math.log10(sum(10**(b["splDb"] / 10) for b in bands))
    cases.append(dict(id="analytical-apparent-" + config,
                      provenance="SP-8072 Eqs. 1–6; constant unit-Strouhal density; Fig. 14 knot positions; hand-computed squared distances. Twin branches are symmetric and share power.",
                      inputs={**base, "deflector": config},
                      toleranceDb=1e-8, expected=dict(acousticPower=power, overallDb=oa, bands=bands)))

# Uniform axial power q on [a,b] integrates to one. Local density is constant.
# x=xt*u. For isotropic radiation to (25,0,20), the receiver integral is
# q/xt * [0.5 ln(625+t²) - 20/25 atan(t/25)], t=20+xt*u.
a, b = .1, 4.7
xt = 3.45 * (1 + .38 * 3)**2
q = 1 / (b - a)
primitive = lambda t: .5 * math.log(625 + t*t) - 20/25 * math.atan(t/25)
geometric_integral = q / xt * (primitive(20 + xt*b) - primitive(20 + xt*a))
bands = []
for f in [20., 40.]:
    width = f * width_factor
    source_watts = power * q * width * xt / (3 * 343) * (b*b - a*a) / 2
    relative_pressure_energy = power * width / (3 * 343) * geometric_integral * 1e12 * 10**(-1.1)
    bands.append(dict(frequency=f, sourceWatts=source_watts, splDb=10*math.log10(relative_pressure_energy)))
cases.append(dict(id="analytical-distributed-integral",
                  provenance="SP-8072 Eqs. 7–10 and Fig. 11; uniform diagnostic axial power and local density; closed-form continuous axial receiver integral above. Does not import model slices or source data.",
                  inputs=dict(method="distributed", sourceBasis="custom", thrust=1000000, velocity=2000, diameter=1, efficiency=1,
                              mach=3, ambientSound=343, fmin=20, fmax=40, band="octave", directivity="isotropic",
                              receiverX=25, receiverY=0, receiverZ=20, customAxial=f"0.1,{10*math.log10(q)}\n4.7,{10*math.log10(q)}",
                              customLocal="0.000001,0\n1000,0", slices=256),
                  toleranceDb=.002, expected=dict(acousticPower=power, coreLength=xt, axialFraction=1,
                                                overallDb=10*math.log10(sum(10**(x["splDb"]/10) for x in bands)), bands=bands)))
fixture = dict(schema="sau-sp8072-benchmarks", version=1,
               limits="Analytical software diagnostics, not measured correlation. 1e-8 dB for algebra; 0.002 dB for finite-slice approximation to an independent continuous integral. Curve reading uncertainty is separate.",
               cases=cases)
(root / "tests/fixtures/sp8072-benchmarks.json").write_text(json.dumps(fixture, indent=2) + "\n")
print("Wrote five independent analytical cases")
