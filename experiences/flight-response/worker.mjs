import {compute,synthetic,estimateQualification,referenceOnGrid} from './physics.mjs';
self.onmessage=({data})=>{try{
  const record=data.record||synthetic(data.settings);
  const result=compute(record,data.settings,progress=>self.postMessage({type:'progress',progress}));
  const qual=data.reference.kind==='psd'?estimateQualification(data.reference,result.grid,data.settings):{values:referenceOnGrid(data.reference,result.grid,data.settings),label:'Imported precomputed ERS · primary+residual maximax',estimated:false};
  self.postMessage({type:'done',result,qual},[result.grid.buffer,result.peaks.buffer,result.running.buffer,result.final.buffer,result.primary.buffer,result.residual.buffer,qual.values.buffer]);
}catch(error){self.postMessage({type:'error',message:error.message});}};
