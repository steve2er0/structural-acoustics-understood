"""Reproducible free-edge Kirchhoff–Love plate Rayleigh–Ritz model.
Run: python3 scripts/generate-modal-plate.py (NumPy + SciPy only).
No displacement constraints. Remove three out-of-plane rigid-body functions.
Energy and basis details: docs/MODAL_MODEL.md; NASA SP-160, Leissa.
"""
from pathlib import Path
import json
import numpy as np
from numpy.polynomial.legendre import Legendre, leggauss
from scipy.linalg import eigh
A, B, H, E, RHO, NU = .6, .4, .004, 69e9, 2700., .33
D = E*H**3/(12*(1-NU**2))

def solve(degree):
    p, w = leggauss(22)
    xx, yy = np.meshgrid(p, p, indexing='ij')
    weights = (w[:,None]*w[None,:]*A*B/4).ravel()
    basis = [(i,j) for i in range(degree+1) for j in range(degree+1) if (i,j) not in [(0,0),(1,0),(0,1)]]
    polys = [Legendre.basis(i) for i in range(degree+1)]
    value = lambda dx,dy: np.array([(polys[i].deriv(dx)(xx)*(2/A)**dx*polys[j].deriv(dy)(yy)*(2/B)**dy).ravel() for i,j in basis])
    v, vx, vy, vxy = value(0,0),value(2,0),value(0,2),value(1,1)
    mass = RHO*H*(v*weights)@v.T
    stiff = D*((vx*weights)@vx.T+(vy*weights)@vy.T+NU*((vx*weights)@vy.T+(vy*weights)@vx.T)+2*(1-NU)*(vxy*weights)@vxy.T)
    eig, modes = eigh(stiff,mass)
    return np.sqrt(eig[:6])/(2*np.pi), modes[:,:6], basis

freq, vectors, basis = solve(8)
check, _, _ = solve(10)
xx, yy = np.meshgrid(np.linspace(-1,1,161),np.linspace(-1,1,121),indexing='ij')
v = np.array([(Legendre.basis(i)(xx)*Legendre.basis(j)(yy)).ravel() for i,j in basis])
modes = []
for k in range(6):
    values = vectors[:,k]@v
    peak = np.max(np.abs(values))
    sign = 1 if values[np.argmax(np.abs(values))] > 0 else -1
    modes.append(dict(frequency=round(float(freq[k]),8),mass=round(float(1/peak**2),10),coefficients=[round(float(c*sign/peak),12) for c in vectors[:,k]],convergencePercent=round(float(abs(freq[k]/check[k]-1)*100),6)))
data = dict(length=A,width=B,thickness=H,youngModulus=E,density=RHO,poisson=NU,degree=8,basis=basis,modes=modes)
output=Path(__file__).resolve().parents[1]/'src/labs/modal/plate-data.json'
output.write_text(json.dumps(data,separators=(',',':'))+'\n')
print('Frequencies (Hz):',freq)
print('Degree 8 → 10 differences (%):',[m['convergencePercent'] for m in modes])
print('Modal masses (kg, peak normalized):',[m['mass'] for m in modes])
