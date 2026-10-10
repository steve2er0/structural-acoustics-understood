"""Optional independent validation; Python + NumPy/SciPy only, no app runtime dependency."""
import json, subprocess
from pathlib import Path
import numpy as np
from scipy.linalg import expm
from scipy.integrate import quad

root=Path(__file__).resolve().parent.parent
source="""
import {coefficients,spectralMoments,parseCurve,DEMO_PSD} from './physics.mjs';
const cases=[];for(const fn of [1,30,100,800])for(const q of [1,10,50,100])for(const fs of [20000,200000])cases.push({fn,q,fs,c:coefficients(fn,q,fs)});
const curve=parseCurve(DEMO_PSD,'m/s^2','psd');const spectra=[];for(const fn of [10,70,420,800])for(const q of [2,10,50])for(const response of ['absolute','pseudo'])spectra.push({fn,q,response,m:spectralMoments(curve,fn,q,response,2)});
console.log(JSON.stringify({cases,spectra,curve}));
"""
data=json.loads(subprocess.check_output(['node','--input-type=module','-e',source],cwd=root,text=True))
max_state_error=0
for case in data['cases']:
    fn,q,fs,c=case['fn'],case['q'],case['fs'],case['c']
    w=2*np.pi*fn;z=1/(2*q);u,v,prev,now=.2,-.3,.4,-.2
    A=np.array([[0,w,0,0],[-w,-2*z*w,w,0],[0,0,0,1],[0,0,0,0]])
    independent=(expm(A/fs)@np.array([u,v,prev,(now-prev)*fs]))[:2]
    actual=np.array([c['p00']*u+c['p01']*v+c['b00']*prev+c['b10']*now,c['p10']*u+c['p11']*v+c['b01']*prev+c['b11']*now])
    max_state_error=max(max_state_error,float(np.max(np.abs(actual-independent))))
assert max_state_error<1e-10,max_state_error
curve=data['curve'];logs=np.log(curve['f']);levels=np.log(curve['y']);max_moment_error=0
for case in data['spectra']:
    fn,q,response=case['fn'],case['q'],case['response']
    def integrand(x,p):
        f=np.exp(x);r=f/fn;den=(1-r*r)**2+(r/q)**2
        H=((1+(r/q)**2) if response=='absolute' else 1)/den
        return np.exp(np.interp(x,logs,levels))*H*f**(p+1)
    points=sorted(set([*logs,np.log(fn)]))
    points=[x for x in points if logs[0]<x<logs[-1]]
    for p in [0,2,4]:
        independent=quad(integrand,logs[0],logs[-1],args=(p,),points=points,epsrel=1e-10,limit=400)[0]
        err=abs(case['m'][f'm{p}']/independent-1);max_moment_error=max(max_moment_error,err)
assert max_moment_error<5e-5,max_moment_error
rng=np.random.default_rng(314159);N=32;trials=100000;p=.95
k=np.sqrt(-2*np.log(-np.expm1(np.log(p)/N)))
envelopes=rng.rayleigh(size=(trials,N));observed=float(np.mean(envelopes.max(axis=1)<=k))
one=np.sqrt(2*np.log(N));exceedance=float(np.mean((envelopes>one).sum(axis=1)))
assert abs(observed-p)<.003,(observed,p)
assert abs(exceedance-1)<.012,exceedance
report={'state_cases':len(data['cases']),'scipy_expm_max_absolute_error':max_state_error,'spectral_cases':len(data['spectra']),'scipy_quad_max_relative_error':max_moment_error,'independent_Rayleigh_envelope_trials':trials,'target_probability':p,'observed_probability':observed,'one_expected_exceedance_observed':exceedance,'scope':'Independent mathematical/numerical checks only; no validation of real Gaussianity, narrowband assumptions or achieved qualification.'}
print(json.dumps(report,indent=2))
