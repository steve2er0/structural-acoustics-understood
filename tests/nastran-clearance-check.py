"""Full-deck parser and synthetic OP2/CLI checks. NOT a NASTRAN solution."""
import contextlib
import csv
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile

import numpy as np
from pyNastran.bdf.bdf import read_bdf
from pyNastran.op2.op2 import OP2, read_op2
from pyNastran.op2.tables.oug.oug_accelerations import ComplexAccelerationArray
from pyNastran.op2.tables.oug.oug_displacements import ComplexDisplacementArray

fixture = json.load(sys.stdin)
export = fixture["model"]
with contextlib.redirect_stdout(sys.stderr):
    deck = read_bdf(io.StringIO(export["deck"]), validate=True, xref=True, debug=False)
assert len(deck.nodes) == export["counts"]["grids"]
assert len(deck.rigid_elements) == export["counts"]["rbe2"] + export["counts"]["rbe3"]
output = deck.subcases[1].get_parameter("SET 99")[0]
for location in export["response"]["clearanceLocations"]:
    assert location["gridId"] in output
    assert location["baseGridId"] in output
    assert np.allclose(deck.nodes[location["gridId"]].xyz, np.array(location["positionM"]) / .0254)
assert set(deck.subcases[1].get_parameter("DISPLACEMENT")[1]) == {"SORT1", "REAL", "PLOT"}

lines = fixture["csv"].splitlines()
metadata = json.loads(lines[0][2:])
rows = list(csv.DictReader(lines[1:]))
frequencies = np.array([float(row["frequency_hz"]) for row in rows])
settings = metadata["clearance"]["environment"]
sid = "xyz".index(settings["axis"]) + 1
assert min(frequencies) <= settings["points"][0][0]
assert max(frequencies) >= settings["points"][-1][0]
grids = np.array(sorted(output), dtype="int32")
node_gridtype = np.column_stack([grids, np.ones(len(grids), dtype="int32")])
index = {grid: i for i, grid in enumerate(grids)}
input_g = 2 * np.exp(1j * np.linspace(-.5, .7, len(frequencies)))
base_acceleration = input_g * 386.08858267716535
op2 = OP2(debug=False, mode="msc")
for case, name in enumerate("xyz", 1):
    acceleration = np.zeros((len(frequencies), len(grids), 6), dtype="complex64")
    displacement = np.zeros_like(acceleration)
    for grid in export["isolators"]["groundGridIds"]:
        acceleration[:, index[grid], case - 1] = base_acceleration
        displacement[:, index[grid], case - 1] = -base_acceleration / (2 * np.pi * frequencies) ** 2
    response_grid = metadata["responseGrid"]
    transfer = np.array([complex(float(row[f"T{name}{name}_real"]), float(row[f"T{name}{name}_imag"])) for row in rows])
    acceleration[:, index[response_grid], case - 1] = base_acceleration * transfer
    if case == sid:
        for location in metadata["clearance"]["locations"]:
            for axis, direction in enumerate("xyz"):
                key = f"{location['id']}_{direction}_relative_in_per_g_"
                relative = np.array([complex(float(row[key + "real"]), float(row[key + "imag"])) for row in rows])
                displacement[:, index[location["gridId"]], axis] = displacement[:, index[location["baseGridId"]], axis] + relative * input_g
    a = ComplexAccelerationArray.add_freq_case("OAG1", node_gridtype, acceleration, case, frequencies.astype("float32"))
    a.table_name = "OAG1"
    a.table_code = 11
    a.data_code.update(table_name="OAG1", table_code=11)
    op2.accelerations[case] = a
    op2.displacements[case] = ComplexDisplacementArray.add_freq_case("OUGV1", node_gridtype, displacement, case, frequencies.astype("float32"))

script = Path(__file__).resolve().parents[1] / "scripts/nastran-transmissibility.py"
with tempfile.TemporaryDirectory(prefix="sau-clearance-op2-") as temporary:
    directory = Path(temporary)
    op2_path = directory / "synthetic.op2"
    with contextlib.redirect_stdout(sys.stderr):
        op2.write_op2(str(op2_path), nastran_format="msc")
    browser = directory / "browser.csv"
    browser.write_text(fixture["csv"], encoding="utf-8")
    output_path = directory / "clearance.csv"
    result = subprocess.run([sys.executable, str(script), str(op2_path), "--browser-csv", str(browser), "--output", str(directory / "transmission.csv"), "--clearance-output", str(output_path)], text=True, capture_output=True)
    assert result.returncode == 0, result.stdout + result.stderr
    with output_path.open() as stream:
        summary = list(csv.DictReader(line for line in stream if not line.startswith("#")))
    assert len(summary) == len(metadata["clearance"]["locations"]) * 3
    for row in summary:
        rms = float(row["solver_rms_in"])
        reference = float(row["browser_rms_in"])
        assert np.isclose(rms, reference, rtol=5e-5, atol=1e-9), row
        assert np.isclose(float(row["solver_factored_peak_in"]), rms * settings["peakFactor"])
    spec = importlib.util.spec_from_file_location("converter", script)
    converter = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(converter)
    parsed = read_op2(str(op2_path), debug=False)
    parsed.displacements.clear()
    try:
        converter.write_clearance(output_path, parsed, browser)
        raise AssertionError("Missing displacement tables were accepted")
    except ValueError as error:
        assert "complex displacement" in str(error)
print("Synthetic clearance OP2 checks passed; no solver was run")
