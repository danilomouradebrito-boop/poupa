import {total, normalized} from './pricing.js';

export function productKey(name) {
 return name.trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
}
export function productName(item, fair) {
 return fair.list?.find(entry=>entry.id===item.listId)?.name || (item.compared ? item.name.replace(/ — Opção \d+$/, '') : item.name);
}
export function pendingItems(fair) {
 return (fair.list||[]).filter(entry=>!fair.items.some(item=>item.listId===entry.id || productKey(productName(item,fair))===productKey(entry.name)));
}
export function omittedItems(previous, current) {
 const present=new Set([...current.list||[], ...current.items.map(item=>({name:productName(item,current)}))].map(item=>productKey(item.name)));
 return (previous?.list||[]).filter((entry,index,list)=>!present.has(productKey(entry.name)) && list.findIndex(other=>productKey(other.name)===productKey(entry.name))===index);
}
export function purchaseStats(fairs) {
 const products=new Map();
 fairs.forEach((fair,index)=>{
  fair.items.forEach(item=>{
   const name=productName(item,fair), key=productKey(name);
   if(!products.has(key)) products.set(key,{name,spent:0,visits:new Set(),series:new Map()});
   const product=products.get(key), cost=total(item);
   product.spent+=cost; product.visits.add(index);
   // Unspecified package contents cannot be compared to measured packages.
   const rate=item.compared||item.weighted?normalized(item):{dimension:'package',label:'embalagem sem conteúdo informado',value:cost/item.quantity};
   if(!fair.date || !Number.isFinite(rate.value) || rate.value<=0) return;
   const seriesKey=rate.dimension, series=product.series.get(seriesKey)||{label:rate.label,points:[]};
   const amount=cost/rate.value;
   let point=series.points.find(point=>point.date===fair.date);
   if(!point){point={date:fair.date,cost:0,amount:0};series.points.push(point);}
   point.cost+=cost;point.amount+=amount;
   product.series.set(seriesKey,series);
  });
 });
 return [...products.values()].map(product=>({...product,frequency:product.visits.size,series:[...product.series.values()].map(series=>({...series,points:series.points.sort((a,b)=>a.date.localeCompare(b.date)).map(point=>({date:point.date,value:point.cost/point.amount}))}))}));
}

export function fairsInPeriod(fairs, start, end) {
 if(!start || !end || start>end) return [];
 return fairs.filter(fair=>fair.date && fair.date>=start && fair.date<=end);
}
export function monthBounds(month) {
 if(!/^\d{4}-\d{2}$/.test(month)) return ['', ''];
 const [year,number]=month.split('-').map(Number);
 return [month+'-01',month+'-'+new Date(year,number,0).getDate()];
}
