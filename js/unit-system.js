export const ENGLISH_UNIT_CONVERSIONS = Object.freeze({
  m:{unit:'ft',factor:3.280839895},mm:{unit:'in',factor:0.03937007874},'µm':{unit:'mil',factor:0.03937007874},
  'm²':{unit:'ft²',factor:10.76391042},'m² sabins':{unit:'ft² sabins',factor:10.76391042},'m³':{unit:'ft³',factor:35.31466672},'m⁴':{unit:'ft⁴',factor:115.862369},
  'm/s':{unit:'ft/s',factor:3.280839895},'mm/s':{unit:'in/s',factor:0.03937007874},'m/s peak':{unit:'ft/s peak',factor:3.280839895},
  'm/s²':{unit:'ft/s²',factor:3.280839895},'m/s2':{unit:'ft/s²',factor:3.280839895},'m/s2/g':{unit:'ft/s²/g',factor:3.280839895},'m/s² RMS':{unit:'ft/s² RMS',factor:3.280839895},'m/s RMS':{unit:'ft/s RMS',factor:3.280839895},'m/s RMS-equivalent':{unit:'ft/s RMS-equivalent',factor:3.280839895},
  'm RMS':{unit:'in RMS',factor:39.37007874},'m peak':{unit:'in peak',factor:39.37007874},'mm RMS':{unit:'in RMS',factor:0.03937007874},'mm/s RMS':{unit:'in/s RMS',factor:0.03937007874},
  kg:{unit:'lbm',factor:2.204622622},'kg/m':{unit:'lbm/ft',factor:0.6719689751},'kg/m²':{unit:'lbm/ft²',factor:0.2048161436},'kg/m³':{unit:'lbm/ft³',factor:0.06242796058},
  N:{unit:'lbf',factor:0.2248089431},MN:{unit:'kip',factor:224.8089431},'N peak':{unit:'lbf peak',factor:0.2248089431},'N RMS':{unit:'lbf RMS',factor:0.2248089431},'N/√Hz':{unit:'lbf/√Hz',factor:0.2248089431},
  'N/m':{unit:'lbf/in',factor:0.005710147163},'N·m':{unit:'lbf·in',factor:8.850745791},'N·s/m':{unit:'lbf·s/in',factor:0.005710147163},'N/(m/s)':{unit:'lbf/(in/s)',factor:0.005710147163},
  Pa:{unit:'psi',factor:0.0001450377377},kPa:{unit:'psi',factor:0.1450377377},MPa:{unit:'ksi',factor:0.1450377377},GPa:{unit:'Mpsi',factor:0.1450377377},'Pa RMS':{unit:'psi RMS',factor:0.0001450377377},
  'W/m²':{unit:'W/ft²',factor:0.09290304},'W/m':{unit:'W/ft',factor:0.3048},'W/N²':{unit:'W/lbf²',factor:19.73854254},
  J:{unit:'ft·lbf',factor:0.7375621493},'J/N²':{unit:'in/lbf',factor:175.1268352},
  'm/(N·s)':{unit:'in/(lbf·s)',factor:175.1268352},'m/N·s':{unit:'in/(lbf·s)',factor:175.1268352},'m/N':{unit:'in/lbf',factor:175.1268352},'(m/s)/N':{unit:'(in/s)/lbf',factor:175.1268352},'(m/s²)/N':{unit:'(in/s²)/lbf',factor:175.1268352},
  'Pa·s/m':{unit:'psi·s/in',factor:0.000003683958},'Pa·s/m²':{unit:'psi·s/in²',factor:9.357258e-8},
  'rad/m':{unit:'rad/ft',factor:0.3048},'1/m':{unit:'1/ft',factor:0.3048},'s/kg':{unit:'s/lbm',factor:0.45359237},
  '°C':{unit:'°F',factor:1.8,offset:32}
});

const AXIS_UNITS = Object.keys(ENGLISH_UNIT_CONVERSIONS).sort((a,b)=>b.length-a.length);

export const unitConversion=unit=>ENGLISH_UNIT_CONVERSIONS[unit]||null;
export const toDisplayUnit=(unit,system)=>system==='English'&&unitConversion(unit)?.unit||unit;
export const toDisplayNumber=(value,unit,system)=>{const x=Number(value),conversion=system==='English'?unitConversion(unit):null;return Number.isFinite(x)&&conversion?x*conversion.factor+(conversion.offset||0):value;};
export const fromDisplayNumber=(value,unit,system)=>{const x=Number(value),conversion=system==='English'?unitConversion(unit):null;return Number.isFinite(x)&&conversion?(x-(conversion.offset||0))/conversion.factor:value;};
export const toDisplayStep=(value,unit,system)=>{const x=Number(value),conversion=system==='English'?unitConversion(unit):null;return Number.isFinite(x)&&conversion?x*conversion.factor:value;};

export function axisUnitInfo(label){
  const text=String(label||'');
  const unit=AXIS_UNITS.find(candidate=>text.endsWith(`(${candidate})`));
  const conversion=unitConversion(unit);
  return conversion?{unit,conversion,label:`${text.slice(0,-unit.length-2)}(${conversion.unit})`}:null;
}

export function displayEngineeringResult(result,system){
  if(system!=='English')return result;
  const convertValue=value=>{const conversion=unitConversion(value.unit);return conversion&&Number.isFinite(Number(value.value))?{...value,value:toDisplayNumber(value.value,value.unit,system),unit:conversion.unit}:{...value};};
  const plots=(result.plots||[]).map(plot=>{const x=axisUnitInfo(plot.xLabel),y=axisUnitInfo(plot.yLabel);return {...plot,xLabel:x?.label||plot.xLabel,yLabel:y?.label||plot.yLabel,traces:(plot.traces||[]).map(trace=>({...trace,name:trace.displayNameByUnit?.[system]||trace.name,x:x?trace.x.map(value=>toDisplayNumber(value,x.unit,system)):[...trace.x],y:y?trace.y.map(value=>toDisplayNumber(value,y.unit,system)):[...trace.y]}))};});
  const rangeCharts=(result.rangeCharts||[]).map(chart=>{const conversion=unitConversion(chart.unit);if(!conversion)return {...chart};const convert=value=>value==null?value:toDisplayNumber(value,chart.unit,system);return {...chart,unit:conversion.unit,axisLabel:String(chart.axisLabel||'').replace(`(${chart.unit})`,`(${conversion.unit})`),min:convert(chart.min),max:convert(chart.max),lanes:(chart.lanes||[]).map(lane=>({...lane,start:convert(lane.start),end:convert(lane.end),startLabel:'',endLabel:''})),markers:(chart.markers||[]).map(marker=>({...marker,value:convert(marker.value)}))};});
  const tables=(result.tables||[]).map(table=>{const conversions=(table.columns||[]).map(column=>axisUnitInfo(column));return {...table,columns:(table.columns||[]).map((column,index)=>conversions[index]?.label||column),rows:(table.rows||[]).map(row=>row.map((value,index)=>conversions[index]?toDisplayNumber(value,conversions[index].unit,system):value))};});
  return {...result,values:(result.values||[]).map(convertValue),plots,rangeCharts,tables,interpretation:result.interpretationByUnit?.[system]||result.interpretation};
}
