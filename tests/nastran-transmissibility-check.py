"""Synthetic arithmetic tests; not evidence of a NASTRAN solution."""
import csv
import importlib.util
import json
from pathlib import Path
import tempfile
import subprocess
import sys
from types import SimpleNamespace

import numpy as np

spec = importlib.util.spec_from_file_location("transmissibility", Path(__file__).resolve().parents[1] / "scripts/nastran-transmissibility.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

frequency = np.array([10., 100., 1000.])
expected = {axis: np.array([6.+1j, 1.-1j, .01+.02j]) * sid for sid, axis in enumerate("xyz", 1)}
base = 386.088582677 * np.exp(1j * np.array([.4, -.2, 1.]))
results = {}
for sid, axis in enumerate("xyz", 1):
    data = np.zeros((3, 2, 6), dtype=complex)
    data[:, 0, sid-1] = base * expected[axis]
    data[:, 1, sid-1] = base
    results[sid] = SimpleNamespace(isubcase=sid, data=data, _times=frequency, node_gridtype=np.array([[9002, 1], [8001, 1]]))
model = SimpleNamespace(accelerations=results)
actual_frequency, curves = module.extract_curves(model, 9002, 8001)
assert np.array_equal(actual_frequency, frequency)
for axis in "xyz":
    assert np.allclose(curves[axis], expected[axis]), "input units and phase must divide out"

with tempfile.TemporaryDirectory(prefix="sau-op2-curves-") as directory:
    path = Path(directory) / "curves.csv"
    module.write_curves(path, frequency, curves, (frequency, expected))
    with path.open() as stream:
        rows = list(csv.DictReader(stream))
    assert len(rows) == 3
    for row in rows:
        for axis in "xyz":
            assert abs(float(row[f"T{axis}{axis}_delta_db"])) < 1e-10
            assert abs(float(row[f"T{axis}{axis}_delta_phase_deg"])) < 1e-10
    try:
        module.write_curves(path, frequency, curves, (frequency * 2, expected))
        raise AssertionError("mismatched frequency grids were accepted")
    except ValueError as error:
        assert "frequencies do not match" in str(error)

    # A genuine OP2 serialization/read/CLI round trip with synthetic results.
    # This exercises file handling, not a NASTRAN solve or physical correlation.
    from pyNastran.op2.op2 import OP2
    from pyNastran.op2.tables.oug.oug_accelerations import ComplexAccelerationArray
    op2_path = Path(directory) / "synthetic.op2"
    op2 = OP2(debug=False, mode="msc")
    for sid, result in results.items():
        acceleration = ComplexAccelerationArray.add_freq_case("OAG1", result.node_gridtype.astype("int32"), result.data.astype("complex64"), sid, frequency.astype("float32"))
        # pyNastran 1.4.1's inherited factory hard-codes the displacement
        # table header. Set the actual acceleration header for this fixture.
        acceleration.table_name = "OAG1"
        acceleration.table_code = 11
        acceleration.data_code.update(table_name="OAG1", table_code=11)
        op2.accelerations[sid] = acceleration
    op2.write_op2(str(op2_path), nastran_format="msc")
    from pyNastran.op2.op2 import read_op2
    check = read_op2(str(op2_path), debug=False)
    assert sorted(check.accelerations) == [1, 2, 3]
    browser_path = Path(directory) / "browser.csv"
    with browser_path.open("w", newline="") as stream:
        stream.write("# " + json.dumps({"responseGrid": 9002, "baseGrid": 8001}) + "\n")
        writer = csv.writer(stream)
        writer.writerow(["frequency_hz", *[f"T{axis}{axis}_{part}" for axis in "xyz" for part in ["real", "imag"]]])
        for index, frequency_value in enumerate(frequency):
            writer.writerow([frequency_value, *[part for axis in "xyz" for part in [expected[axis][index].real, expected[axis][index].imag]]])
    command = [sys.executable, str(Path(__file__).resolve().parents[1] / "scripts/nastran-transmissibility.py"), str(op2_path), "--browser-csv", str(browser_path), "--output", str(path)]
    plot_path = Path(directory) / "comparison.png"
    if importlib.util.find_spec("matplotlib"):
        command.extend(["--plot", str(plot_path)])
    completed = subprocess.run(command, text=True, capture_output=True)
    assert completed.returncode == 0, completed.stdout + completed.stderr
    with path.open() as stream:
        round_trip = list(csv.DictReader(stream))
    for index, row in enumerate(round_trip):
        for axis in "xyz":
            value = complex(float(row[f"T{axis}{axis}_real"]), float(row[f"T{axis}{axis}_imag"]))
            assert np.isclose(value, expected[axis][index], rtol=2e-6)
            assert abs(float(row[f"T{axis}{axis}_delta_db"])) < 2e-5
    if plot_path.exists():
        assert plot_path.read_bytes().startswith(b"\x89PNG\r\n\x1a\n")

results[1].data[:, 1, 0] = 0
try:
    module.extract_curves(model, 9002, 8001)
    raise AssertionError("zero input acceleration was accepted")
except ValueError as error:
    assert "zero base" in str(error)
results[1].data[:, 1, 0] = base
try:
    module.extract_curves(model, 9001, 8001)
    raise AssertionError("a missing response grid was accepted")
except ValueError as error:
    assert "GRID 9001" in str(error)
print("Synthetic complex acceleration-ratio checks passed")
