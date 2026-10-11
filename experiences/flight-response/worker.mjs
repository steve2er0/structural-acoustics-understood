import {compute,synthetic,estimateQualification,referenceOnGrid,parseFlightFile} from './physics.mjs';
self.onmessage=async({data})=>{try{
  const record=data.file?await parseFlightFile(data.file,data.unit,{progress:p=>self.postMessage({type:'progress',...p})}):data.record||synthetic(data.settings);
  if(data.type==='load'){const {chunks,a,...metadata}=record;self.postMessage({type:'loaded',record:metadata});return;}
  const result=compute(record,data.settings,progress=>self.postMessage({type:'progress',phase:'compute',progress}));
  const qual=data.reference.kind==='psd'?estimateQualification(data.reference,result.grid,data.settings):{values:referenceOnGrid(data.reference,result.grid,data.settings),label:'Imported precomputed ERS · primary+residual maximax',estimated:false};
  self.postMessage({type:'done',result,qual},[result.grid.buffer,result.peaks.buffer,result.running.buffer,result.final.buffer,result.primary.buffer,result.residual.buffer,qual.values.buffer]);
}catch(error){self.postMessage({type:'error',message:error.message});}};
