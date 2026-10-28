#!/usr/bin/env python3
"""Convert SOL 111 OP2 acceleration results to complex Txx/Tyy/Tzz.

Requires pyNastran (tests/requirements-nastran.txt); matplotlib only for --plot.
This reads solver output. It does not run NASTRAN or certify model correlation.
"""
import argparse
import csv
import json
from pathlib import Path

import numpy as np


def extract_curves(model, response_grid=9001, base_grid=8001):
    curves = {}
    frequencies = None
    for sid, axis in enumerate("xyz", 1):
        candidates = [value for key, value in model.accelerations.items()
                      if getattr(value, "isubcase", key[0] if isinstance(key, tuple) else key) == sid]
        if len(candidates) != 1:
            raise ValueError(f"Expected one complex acceleration result for subcase {sid} ({axis.upper()}); found {len(candidates)}")
        result = candidates[0]
        if not np.iscomplexobj(result.data):
            raise ValueError("Expected complex SOL 111 acceleration results, not real modal accelerations")
        grid_ids = result.node_gridtype[:, 0]
        indices = []
        for grid in [response_grid, base_grid]:
            matches = np.flatnonzero(grid_ids == grid)
            if len(matches) != 1:
                raise ValueError(f"Subcase {sid} must contain GRID {grid} exactly once")
            indices.append(int(matches[0]))
        current = np.asarray(result._times, dtype=float)
        if np.any(~np.isfinite(current)) or np.any(current <= 0) or np.any(np.diff(current) <= 0):
            raise ValueError("Frequency samples must be positive, finite and strictly increasing")
        if frequencies is not None and (current.shape != frequencies.shape or not np.allclose(current, frequencies)):
            raise ValueError("X/Y/Z subcases have different excitation frequencies")
        frequencies = current
        response = result.data[:, indices[0], sid - 1]
        base = result.data[:, indices[1], sid - 1]
        if np.any(~np.isfinite(response)) or np.any(~np.isfinite(base)) or np.any(np.abs(base) < 1e-12):
            raise ValueError(f"Non-finite response or zero base acceleration in subcase {sid}")
        # Divide COMPLEX quantities: this removes input units, magnitude and phase.
        curves[axis] = response / base
    return frequencies, curves


def read_browser_csv(path):
    metadata = {}
    with open(path, newline="", encoding="utf-8") as stream:
        lines = stream.readlines()
    for line in lines:
        if line.startswith("# "):
            metadata = json.loads(line[2:])
            break
    rows = list(csv.DictReader(line for line in lines if not line.startswith("#")))
    frequency = np.array([float(row["frequency_hz"]) for row in rows])
    curves = {axis: np.array([complex(float(row[f"T{axis}{axis}_real"]), float(row[f"T{axis}{axis}_imag"])) for row in rows]) for axis in "xyz"}
    return metadata, frequency, curves


def write_curves(path, frequencies, curves, browser=None):
    if browser is not None:
        browser_frequency, _ = browser
        if frequencies.shape != browser_frequency.shape or not np.allclose(frequencies, browser_frequency, rtol=3e-6, atol=1e-5):
            raise ValueError("Browser CSV frequencies do not match this OP2. Export a matching deck/CSV; no silent interpolation is performed.")
    headers = ["frequency_hz"]
    for axis in "xyz":
        headers.extend(f"T{axis}{axis}_{suffix}" for suffix in ["real", "imag", "magnitude", "db", "phase_deg"])
        if browser is not None:
            headers.extend([f"T{axis}{axis}_browser_db", f"T{axis}{axis}_delta_db", f"T{axis}{axis}_delta_phase_deg"])
    with open(path, "w", newline="", encoding="utf-8") as stream:
        writer = csv.writer(stream)
        writer.writerow(headers)
        for index, frequency in enumerate(frequencies):
            row = [frequency]
            for axis in "xyz":
                value = curves[axis][index]
                db = 20 * np.log10(max(abs(value), 1e-12))
                row.extend([value.real, value.imag, abs(value), db, np.angle(value, deg=True)])
                if browser is not None:
                    reference = browser[1][axis][index]
                    browser_db = 20 * np.log10(max(abs(reference), 1e-12))
                    phase_delta = np.angle(value * np.conj(reference), deg=True)
                    row.extend([browser_db, db - browser_db, phase_delta])
            writer.writerow(row)


def plot_curves(path, frequencies, curves, browser=None):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    figure, axes = plt.subplots(figsize=(10, 6))
    for axis, color in zip("xyz", ["#1968b3", "#d16b16", "#238957"]):
        axes.semilogx(frequencies, 20 * np.log10(np.maximum(np.abs(curves[axis]), 1e-12)), color=color, label=f"NASTRAN T{axis}{axis}")
        if browser is not None:
            axes.semilogx(browser[0], 20 * np.log10(np.maximum(np.abs(browser[1][axis]), 1e-12)), "--", color=color, label=f"Browser T{axis}{axis}")
    axes.set(xlabel="Frequency (Hz)", ylabel="Transmissibility (dB, acceleration ratio)", title="SOL 111 / browser nominal response comparison")
    axes.grid(True, which="both", alpha=.25)
    axes.legend(ncol=2)
    figure.tight_layout()
    figure.savefig(path, dpi=160)
    plt.close(figure)


def write_clearance(path, model, browser_path):
    """Fold one shaker-axis FRF through the matching one-sided base PSD.

    Displacements are absolute solver inches. Subtract the complex base motion
    BEFORE taking magnitudes, and normalize by actual complex input in g.
    This is linear statistical postprocessing, not a contact/peak simulation.
    """
    metadata, frequencies, _ = read_browser_csv(browser_path)
    spec = metadata.get("clearance")
    if not spec:
        raise ValueError("Matching browser CSV must contain a PSD clearance environment")
    environment = spec["environment"]
    sid = "xyz".index(environment["axis"]) + 1

    def case(table):
        cases = [r for key, r in table.items() if getattr(r, "isubcase", key[0] if isinstance(key, tuple) else key) == sid]
        if len(cases) != 1 or not np.iscomplexobj(cases[0].data):
            raise ValueError("Clearance needs one complex displacement and acceleration result for the selected subcase")
        result = cases[0]
        if result._times.shape != frequencies.shape or not np.allclose(result._times, frequencies, rtol=3e-6, atol=1e-5):
            raise ValueError("Displacement/acceleration frequencies do not match the browser CSV")
        return result

    displacement = case(model.displacements)
    acceleration = case(model.accelerations)

    def node(result, grid):
        indices = np.flatnonzero(result.node_gridtype[:, 0] == grid)
        if len(indices) != 1:
            raise ValueError(f"Clearance result must contain GRID {grid} exactly once")
        return result.data[:, int(indices[0]), :3]

    points = np.asarray(environment["points"], dtype=float)
    if points.ndim != 2 or points.shape[1] != 2 or len(points) < 2 or np.any(~np.isfinite(points)) or np.any(points[:, 0] <= 0) or np.any(np.diff(points[:, 0]) <= 0) or np.any(points[:, 1] < 0):
        raise ValueError("Invalid PSD breakpoints in comparison metadata")
    factor = environment["peakFactor"]
    if not np.isfinite(factor) or not 1 <= factor <= 10:
        raise ValueError("Invalid statistical peak factor")
    # Include the full PSD band, not any extra displayed-FRF frequencies.
    mask = (frequencies >= points[0, 0] * (1 - 1e-10)) & (frequencies <= points[-1, 0] * (1 + 1e-10))
    f = frequencies[mask]
    if len(f) < 2 or not np.isclose(f[0], points[0, 0]) or not np.isclose(f[-1], points[-1, 0]):
        raise ValueError("Solver grid does not cover both PSD endpoints")
    levels = np.zeros_like(f)
    for index, ((f0, s0), (f1, s1)) in enumerate(zip(points[:-1], points[1:])):
        selected = (f >= f0 * (1 - 1e-10)) & (f <= f1 * (1 + 1e-10))
        levels[selected] = s0 * (f[selected] / f0) ** (np.log(s1 / s0) / np.log(f1 / f0)) if s0 > 0 and s1 > 0 else s0 + (s1 - s0) * (f[selected] - f0) / (f1 - f0)
    levels = np.maximum(levels, 0)
    with open(browser_path, newline="", encoding="utf-8") as stream:
        rows = list(csv.DictReader(line for line in stream if not line.startswith("#")))
    output = []
    for location in spec["locations"]:
        base = node(acceleration, location["baseGridId"])[:, sid - 1] / 386.08858267716535
        if np.any(~np.isfinite(base)) or np.any(np.abs(base) < 1e-12):
            raise ValueError("Zero or non-finite base acceleration in clearance result")
        relative = (node(displacement, location["gridId"]) - node(displacement, location["baseGridId"])) / base[:, None]
        if np.any(~np.isfinite(relative)):
            raise ValueError("Non-finite complex displacement")
        for axis, name in enumerate("xyz"):
            key = f"{location['id']}_{name}_relative_in_per_g_"
            reference = np.array([complex(float(row[key + "real"]), float(row[key + "imag"])) for row in rows])
            rms = np.sqrt(np.trapz(np.abs(relative[mask, axis]) ** 2 * levels, f))
            browser_rms = np.sqrt(np.trapz(np.abs(reference[mask]) ** 2 * levels, f))
            gap = environment["gapsM"][axis] / .0254 if location["kind"] == "box" else 0
            output.append([location["id"], name, environment["axis"], rms, factor * rms, browser_rms, rms - browser_rms, gap - factor * rms if gap > 0 else ""])
    with open(path, "w", newline="", encoding="utf-8") as stream:
        stream.write("# Nominal linear stationary prediction; factor times RMS is not a guaranteed maximum. Check grid convergence, contact and model differences.\n")
        writer = csv.writer(stream)
        writer.writerow(["location", "response_axis", "input_axis", "solver_rms_in", "solver_factored_peak_in", "browser_rms_in", "delta_rms_in", "remaining_gap_in"])
        writer.writerows(output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("op2", type=Path)
    parser.add_argument("--browser-csv", type=Path)
    parser.add_argument("--response-grid", type=int)
    parser.add_argument("--base-grid", type=int)
    parser.add_argument("--output", type=Path, default=Path("nastran-transmissibility.csv"))
    parser.add_argument("--plot", type=Path, help="Optional single plot of all three translational curves")
    parser.add_argument("--clearance-output", type=Path, help="PSD displacement RMS/peak comparison; requires matching --browser-csv exported with PSD enabled")
    args = parser.parse_args()
    try:
        from pyNastran.op2.op2 import read_op2
        metadata, browser_frequency, browser_curves = read_browser_csv(args.browser_csv) if args.browser_csv else ({}, None, None)
        response_grid = args.response_grid if args.response_grid is not None else metadata.get("responseGrid", 9001)
        base_grid = args.base_grid if args.base_grid is not None else metadata.get("baseGrid", 8001)
        if metadata and (metadata.get("responseGrid") != response_grid or metadata.get("baseGrid") != base_grid):
            raise ValueError("Requested response/base grids disagree with the browser CSV metadata")
        model = read_op2(str(args.op2), debug=False, build_dataframe=False)
        frequencies, curves = extract_curves(model, response_grid, base_grid)
        browser = (browser_frequency, browser_curves) if args.browser_csv else None
        write_curves(args.output, frequencies, curves, browser)
        if args.plot:
            plot_curves(args.plot, frequencies, curves, browser)
        if args.clearance_output:
            if not args.browser_csv:
                raise ValueError("--clearance-output requires --browser-csv")
            write_clearance(args.clearance_output, model, args.browser_csv)
        print(f"Wrote {args.output}: {len(frequencies)} frequencies; response GRID {response_grid}, base GRID {base_grid}")
        print("Review mesh/modal convergence, plate mass/flexibility, coupling and material assumptions before interpreting differences.")
    except (ValueError, KeyError, OSError, ImportError) as error:
        parser.exit(2, f"Transmissibility conversion stopped: {error}\n")


if __name__ == "__main__":
    main()
