import test from 'node:test';
import assert from 'node:assert/strict';
import {purchaseStats,pendingItems,omittedItems} from '../insights.js';
const item=(name,price,extra={})=>({name,price,quantity:1,size:1,unit:'un',...extra});
test('previous list excludes planned and directly purchased products',()=>{
 const previous={list:[{name:'Leite'},{name:'Arroz'},{name:'Café'}]};
 const current={list:[{id:'a',name:' leite '}],items:[item('ARROZ',5)]};
 assert.deepEqual(omittedItems(previous,current).map(i=>i.name),['Café']);
 assert.equal(omittedItems(null,current).length,0);
 assert.equal(pendingItems(current).length,1);
 current.items.push(item('Marca diferente — Opção 2',4,{listId:'a',compared:true}));
 assert.equal(pendingItems(current).length,0);
});
test('frequency counts fairs, spend counts every purchase, dates are not invented',()=>{
 const stats=purchaseStats([{list:[],items:[item('Leite',5),item('leite',6)]},{date:'2026-10-01',list:[],items:[item('Leite',7)]}]);
 assert.equal(stats.length,1);assert.equal(stats[0].frequency,2);assert.equal(stats[0].spent,18);
 assert.equal(stats[0].series[0].points.length,1);
});
test('price trends normalize sizes and keep unspecified packages separate',()=>{
 const stats=purchaseStats([
 {date:'2026-09-01',list:[],items:[item('Leite — Opção 1',5,{compared:true,size:500,unit:'ml'})]},
 {date:'2026-10-01',list:[],items:[item('Leite — Opção 2',12,{compared:true,size:1,unit:'l'}),item('Leite',6)]}
 ]);
 assert.equal(stats.length,1);assert.equal(stats[0].series.length,2);
 const volume=stats[0].series.find(s=>s.label==='100 ml');
 assert.deepEqual(volume.points.map(p=>p.value),[1,1.2]);
});

import {fairsInPeriod,monthBounds} from '../insights.js';
test('inclusive date ranges include intermediate purchases and exclude undated fairs',()=>{
 const fairs=['2026-10-11','2026-10-12','2026-10-28','2026-11-20','2026-11-21',null].map(date=>({date}));
 assert.deepEqual(fairsInPeriod(fairs,'2026-10-12','2026-11-20').map(f=>f.date),['2026-10-12','2026-10-28','2026-11-20']);
 assert.equal(fairsInPeriod(fairs,'2026-10-12','2026-10-12').length,1);
 assert.equal(fairsInPeriod(fairs,'2026-11-20','2026-10-12').length,0);
 assert.deepEqual(monthBounds('2024-02'),['2024-02-01','2024-02-29']);
 assert.equal(fairsInPeriod(fairs,...monthBounds('2026-10')).length,3);
});
