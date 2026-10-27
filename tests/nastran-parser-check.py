"""Read complete generated decks with an independent NASTRAN parser.

Invoked by the Node test suite; JSON input/output avoids checked-in BDF fixtures.
"""
import contextlib
import io
import json
import sys

try:
    import numpy as np
    from pyNastran.bdf.bdf import read_bdf
except ImportError:
    sys.exit("Install parser test dependency: python3 -m pip install -r tests/requirements-nastran.txt")

results = []
for fixture in json.load(sys.stdin):
    with contextlib.redirect_stdout(sys.stderr):
        model = read_bdf(io.StringIO(fixture["deck"]), validate=True, xref=True, debug=False)
        model.validate()
    mass = next(iter(model.masses.values()))
    result = {
        "name": fixture["name"], "solution": model.sol,
        "cbush": sum(element.type == "CBUSH" for element in model.elements.values()),
        "cquad4": sum(element.type == "CQUAD4" for element in model.elements.values()),
        "grids": len(model.nodes), "pbush": len(model.properties) - 1,
        "inertia": list(mass.I), "mass": mass.mass,
        "loss": {str(pid): list(prop.GEi) for pid, prop in model.properties.items() if prop.type == "PBUSH"},
    }
    if model.sol == 111:
        result["subcases"] = [sid for sid in model.subcases if sid > 0]
        result["responseGrid"] = fixture["responseGrid"]
        assert fixture["responseGrid"] in model.nodes
        result["point"] = model.nodes[fixture["responseGrid"]].xyz.tolist()
        result["frequencies"] = model.frequencies[50][0].freqs.tolist()
        result["modeCount"] = model.methods[42].nd
        result["cutoff"] = model.methods[42].v2
        for sid in result["subcases"]:
            subcase = model.subcases[sid]
            assert subcase.get_parameter("METHOD")[0] == 42
            assert subcase.get_parameter("SPC")[0] == 1
            dload_id = subcase.get_parameter("DLOAD")[0]
            load = model.dload_entries[model.dloads[dload_id][0].load_ids[0]][0]
            assert load.Type == "ACCE"
            spcd_cards = model.loads[load.excite_id]
            assert len(spcd_cards) == result["cbush"]
            assert all(card.components == [str(sid)] and abs(card.enforced[0] - fixture["g0"]) < 1e-6 for card in spcd_cards)
            assert sorted(card.nodes[0] for card in spcd_cards) == fixture["groundGrids"]
        assert sorted(node for card in model.spcs[1] for node in card.nodes) == fixture["groundGrids"]
        assert all(card.components == "123456" for card in model.spcs[1])
        result["tables"] = {}
        for pid, prop in model.pbusht.items():
            k_tables = prop.k_tables[:3]
            ge_tables = prop.ge_tables[:3]
            assert all(tid in model.tables_d for tid in [*k_tables, *ge_tables])
            result["tables"][str(pid)] = {
                "rates": [model.tables_d[tid].y.tolist() for tid in k_tables],
                "loss": [model.tables_d[tid].y.tolist() for tid in ge_tables],
            }
        # Independent rigid-box surrogate reconstructed from PARSED cards.
        # Intentionally excludes shell mass/flexibility; this checks export
        # units, kinematics, signed inertia, tables and forcing, not SOL 111.
        def kinematics(point):
            x, y, z = point
            return np.array([[1,0,0,0,z,-y], [0,1,0,-z,0,x], [0,0,1,y,-x,0]], dtype=float)
        center = model.nodes[mass.nid].xyz
        rigid_mass = np.zeros((6, 6))
        rigid_mass[:3, :3] = np.eye(3) * mass.mass
        rigid_mass[3:, 3:] = mass.Inertia()
        point_kinematics = kinematics(model.nodes[fixture["responseGrid"]].xyz - center)
        result["rigidSurrogate"] = []
        for sample in range(0, len(result["frequencies"]), 7):
            frequency = result["frequencies"][sample]
            stiffness = np.zeros((6, 6), dtype=complex)
            forcing = np.zeros((6, 3), dtype=complex)
            for element in model.elements.values():
                if element.type != "CBUSH":
                    continue
                prop = model.pbusht[element.pid]
                rates = np.array([float(model.tables_d[tid].interpolate(frequency)) for tid in prop.k_tables[:3]])
                loss = np.array([float(model.tables_d[tid].interpolate(frequency)) for tid in prop.ge_tables[:3]])
                local = np.diag(rates * (1 + 1j * loss))
                transform = kinematics(model.nodes[element.node_ids[0]].xyz - center)
                stiffness += transform.T @ local @ transform
                forcing += transform.T @ local
            response = point_kinematics @ np.linalg.solve(stiffness - (2*np.pi*frequency)**2 * rigid_mass, forcing)
            result["rigidSurrogate"].append({"frequency": frequency, "diagonal": [[response[i,i].real, response[i,i].imag] for i in range(3)]})
    results.append(result)
print(json.dumps(results))
