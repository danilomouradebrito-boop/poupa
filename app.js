import {productKey,productName,pendingItems,omittedItems,purchaseStats,fairsInPeriod,monthBounds} from './insights.js';
import {total,normalized,swapDifference} from './pricing.js';
const $=id=>document.getElementById(id);
const money=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state;try{state=JSON.parse(localStorage.getItem('poupa-v1'));}catch{}
if(!state?.fairs?.length) state={active:0,fairs:[{name:'Minha primeira feira',date:localDate(),budget:null,items:[]}]};
for(const f of state.fairs) if(!Array.isArray(f.list)) f.list=[];
let selectedListId=null;
const makeId=()=>globalThis.crypto?.randomUUID?.() ?? 'item-'+Date.now()+'-'+Math.random().toString(36).slice(2);
let comparing=false,options=[];
const fair=()=>state.fairs[state.active]||state.fairs[0];
function save(){try{localStorage.setItem('poupa-v1',JSON.stringify(state));$('storage-status').hidden=true;}catch{$('storage-status').hidden=false;$('storage-status').textContent='Não foi possível salvar neste navegador. Mantenha a página aberta para não perder suas alterações.';}}
function read(){const weighted=$('weighted').checked;const promo=$('rule').value==='none'||weighted?null:{type:$('rule').value,threshold:Number($('threshold').value),price:Number($('promo-price').value),condition:$('condition').value,eligible:!$('condition').value||$('eligible').checked};return {id:(globalThis.crypto?.randomUUID?.() ?? 'item-'+Date.now()+'-'+Math.random().toString(36).slice(2)),name:$('name').value.trim(),price:Number($('price').value),quantity:Number($('quantity').value),weighted,size:weighted?1:Number($('size').value),unit:weighted?'kg':$('unit').value,promo};}
function valid(i){return i.name&&i.price>0&&Number.isFinite(i.price)&&i.quantity>0&&(i.weighted||Number.isInteger(i.quantity))&&(!comparing||i.size>0)&&(!i.promo||(Number.isInteger(i.promo.threshold)&&i.promo.threshold>=2&&i.promo.price>=0&&i.promo.price<=(i.promo.type==='bundle'?i.price*i.promo.threshold:i.price)));}
function promoText(i){if(!i.promo)return '';const r=i.promo;const rule=r.type==='threshold'?`A partir de ${r.threshold}: ${money(r.price)} cada`:r.type==='bundle'?`A cada ${r.threshold}: ${money(r.price)} o conjunto`:`A cada ${r.threshold}: última por ${money(r.price)}`;return `<p>${rule}${r.condition?' · '+esc(r.condition):''}</p><p class="${!r.eligible||i.quantity<r.threshold?'notice':''}">${!r.eligible?'Condição não confirmada: preço original aplicado.':i.quantity<r.threshold?`Promoção inativa: mínimo de ${r.threshold}. Preço original aplicado.`:'Promoção aplicada. Unidades fora do conjunto usam o preço original.'}</p>`;}
function render(){const f=fair();renderList();const swaps=f.items.filter(i=>i.reference);const difference=swaps.reduce((sum,i)=>sum+swapDifference(i),0);$('swap-summary').hidden=!swaps.length;$('swap-value').textContent=money(Math.abs(difference));$('swap-label').textContent=difference>=0?'Economia estimada nas trocas':'Custo extra estimado nas trocas';const discounts=f.items.reduce((sum,i)=>sum+Math.max(0,Math.round(i.price*100)*i.quantity/100-total(i)),0);$('promo-savings').textContent=discounts>0?`Descontos aplicados: ${money(discounts)} em relação aos preços originais cadastrados.`:'';$('fair-select').innerHTML=state.fairs.map((x,i)=>`<option value="${i}" ${i===state.active?'selected':''}>${esc(x.name)}</option>`).join('');$('budget').value=f.budget??'';const spent=f.items.reduce((a,i)=>a+total(i),0);$('spent').textContent=money(spent);$('mobile-spent').textContent=money(spent);$('mobile-remaining').textContent=f.budget===null?'Sem limite definido':spent>f.budget?money(spent-f.budget)+' acima do limite':money(f.budget-spent)+' disponíveis';$('remaining').textContent=f.budget===null?'Defina um limite se quiser acompanhar seu orçamento.':spent>f.budget?`${money(spent-f.budget)} acima do limite`:`${money(f.budget-spent)} disponíveis`;$('progress').value=f.budget>0?Math.min(100,spent/f.budget*100):0;$('count').textContent=`${f.items.length} produtos`;$('items').innerHTML=f.items.length?f.items.map(i=>`<article class="item"><div class="item-head"><strong>${esc(i.name)}</strong><strong>${money(total(i))}</strong></div><p>Original: ${money(i.price)} / ${i.weighted?'kg':'unidade'}${i.compared?` · Embalagem: ${i.size} ${i.unit}`:''}</p>${promoText(i)}${swapDescription(i)}<div class="controls"><button data-action="minus" data-id="${i.id}" aria-label="Diminuir ${esc(i.name)}">−</button><span>${i.quantity.toLocaleString('pt-BR')}${i.weighted?' kg':''}</span><button data-action="plus" data-id="${i.id}" aria-label="Aumentar ${esc(i.name)}">+</button><button class="remove" data-action="remove" data-id="${i.id}">Remover</button></div>${i.weighted?'<p>Os botões ajustam 100 g por vez.</p>':''}</article>`).join(''):'<div class="empty">Seu carrinho começa aqui.<br>Toque em um produto da lista para colocar o preço.</div>';}
function renderOptions(){const best={};for(const i of options){const n=normalized(i);best[n.dimension]=Math.min(best[n.dimension]??Infinity,n.value);}$('options').innerHTML=options.map((i,k)=>{const n=normalized(i);const other=options.filter((_,index)=>index!==k).map(normalized).filter(x=>x.dimension===n.dimension);const reference=Math.min(...other.map(x=>x.value));const advantage=reference>n.value&&Number.isFinite(reference)?`<p class="notice">${((1-n.value/reference)*100).toLocaleString('pt-BR',{maximumFractionDigits:1})}% mais barato por ${n.label} que a outra opção mais econômica.</p>`:'';return `<article class="option"><strong>${esc(i.name)}</strong> ${n.value===best[n.dimension]?'<span class="badge">Menor preço proporcional</span>':''}<p>${money(n.value)} / ${n.label} · ${money(total(i))} no total</p><p>${i.quantity} ${i.weighted?'kg':`× ${i.size} ${i.unit}`}</p>${promoText(i)}${advantage}<button class="secondary" data-option="${k}">Levar esta opção</button></article>`;}).join('');}
function updateForm(){const weighted=$('weighted').checked;$('size-fields').hidden=!comparing||weighted;$('promotion').hidden=weighted;$('quantity').min=weighted?'0.001':'1';$('quantity').step=weighted?'0.001':'1';$('quantity-label').firstChild.textContent=weighted?'Peso comprado (kg)':'Número de embalagens';$('size').required=comparing&&!weighted;$('promo-fields').hidden=$('rule').value==='none';$('eligible-label').hidden=!$('condition').value;const i=read();$('estimate').textContent=i.price>0&&i.quantity>0?`Total desta opção: ${money(total(i))}`:'';}
function mode(value){comparing=value;$('simple-tab').classList.toggle('active',!value);$('compare-tab').classList.toggle('active',value);$('form-title').textContent=value?'Qual embalagem compensa?':'Pegou? Coloca aqui.';$('form-hint').textContent=value?'Preencha o preço e o conteúdo de cada embalagem abaixo.':'Nome e preço. Só isso já basta.';$('submit').textContent=value?'+ Incluir na comparação':'+ Adicionar ao carrinho';$('product-form').hidden=value;$('compare-form').hidden=!value;$('comparison').hidden=!value||!options.length;updateForm();}
function add(i){
 const selected=fair().list.find(entry=>entry.id===selectedListId);
 fair().items.push({...i,listId:selected?.id??null,id:makeId()});
 save();render();
 const message=`${selected?.name??i.name} adicionado ao carrinho.`;
 if(selected){closeEditor();$('list-message').textContent=message;}
 else{$('message').textContent=message;if(comparing)$('compare-message').textContent=message;}
}

$('simple-tab').onclick=()=>mode(false);$('compare-tab').onclick=()=>mode(true);
$('product-form').oninput=updateForm;
$('condition').onchange=()=>{$('eligible').checked=false;updateForm();};
$('weighted').onchange=()=>{$('quantity').value=1;updateForm();};
$('product-form').onsubmit=e=>{e.preventDefault();const i=read();if(!valid(i)){$('message').textContent='Confira os valores. A promoção não pode custar mais que o preço original.';return;}i.compared=comparing;if(comparing){options.push(i);renderOptions();$('message').textContent='Opção incluída. Informe os valores da próxima embalagem.';}else{add(i);$('product-form').reset();updateForm();}};
$('options').onclick=e=>{const b=e.target.closest('[data-option]');if(!b)return;const index=Number(b.dataset.option);const item=structuredClone(options[index]);const alternatives=options.filter((_,k)=>k!==index).filter(other=>normalized(other).dimension===normalized(item).dimension).sort((a,b)=>normalized(a).value-normalized(b).value);if(alternatives.length)item.reference=structuredClone(alternatives[0]);add(item);options=[];renderOptions();$('comparison').hidden=true;$('compare-message').textContent='Escolha adicionada ao carrinho. As outras opções foram descartadas.';};
$('clear-options').onclick=()=>{options=[];renderOptions();$('comparison').hidden=true;};
$('items').onclick=e=>{const b=e.target.closest('[data-action]');if(!b)return;const i=fair().items.find(x=>x.id===b.dataset.id);if(!i)return;if(b.dataset.action==='remove')fair().items=fair().items.filter(x=>x.id!==i.id);else{const step=i.weighted?.1:1;i.quantity=Math.round((i.quantity+(b.dataset.action==='plus'?step:-step))*1000)/1000;if(i.quantity<=0)fair().items=fair().items.filter(x=>x.id!==i.id);}save();render();};
$('budget').onchange=()=>{const v=$('budget').value;fair().budget=v===''?null:Math.max(0,Number(v));save();render();};
$('fair-select').onchange=()=>{closeEditor(false);state.active=Number($('fair-select').value);save();render();};
$('new-fair').onclick=()=>$('fair-dialog').showModal();$('cancel-fair').onclick=()=>$('fair-dialog').close();
$('fair-form').onsubmit=e=>{e.preventDefault();const name=$('fair-name').value.trim();if(!name)return;closeEditor(false);state.fairs.push({name,date:localDate(),budget:null,items:[],list:[]});state.active=state.fairs.length-1;save();render();$('fair-dialog').close();$('fair-form').reset();};
render();updateForm();

$('see-cart').onclick=()=>$('cart').scrollIntoView({behavior:'smooth',block:'start'});

let comparisonCount=0;
function addCompareCard(){
 const n=++comparisonCount;
 const card=document.createElement('fieldset');card.className='compare-card';card.dataset.optionNumber=n;
 card.innerHTML=`<legend>Opção ${n}</legend>
 <label>Preço de uma embalagem (R$)<input data-field="price" type="number" min="0.01" step="0.01" inputmode="decimal" required placeholder="Ex.: 18,00"></label>
 <div class="two"><label>Peso ou volume da embalagem<input data-field="size" type="number" min="0.001" step="any" inputmode="decimal" required placeholder="Ex.: 750"></label>
 <label>Unidade de medida<select data-field="unit" required><option value="">Escolha</option><option value="g">g — gramas</option><option value="kg">kg — quilos</option><option value="ml">ml — mililitros</option><option value="l">L — litros</option><option value="un">un — unidades</option></select></label></div>
 <p class="package-explanation">Informe o que está escrito na embalagem: por exemplo, 750 g ou 1 L.</p>
 <details><summary>Levar mais de uma ou usar promoção?</summary><label>Número de embalagens que vai levar<input data-field="quantity" type="number" min="1" step="1" value="1" required></label>
 <label>Regra da promoção<select data-field="rule"><option value="none">Sem promoção</option><option value="threshold">A partir de X embalagens, cada uma custa…</option><option value="bundle">A cada X embalagens, o conjunto custa…</option><option value="nth">A cada X embalagens, a última custa…</option></select></label>
 <div data-promotion hidden><div class="two"><label>A cada / a partir de quantas embalagens?<input data-field="threshold" type="number" min="2" step="1" value="3"></label><label>Preço promocional (R$)<input data-field="promoPrice" type="number" min="0" step="0.01" value="0"></label></div>
 <label>Condição<select data-field="condition"><option value="">Sem condição extra</option><option>Clube ou CPF cadastrado</option><option>Cupom ativado</option><option>Forma de pagamento específica</option></select></label><label data-eligibility class="check" hidden><input data-field="eligible" type="checkbox">Posso usar essa oferta</label></div></details>
 <p class="package-summary" aria-live="polite">1 embalagem · preencha preço e conteúdo</p>`;
 $('compare-inputs').append(card);
}
function compareItems(){return [...$('compare-inputs').children].map(card=>{const value=k=>card.querySelector(`[data-field="${k}"]`).value;const rule=value('rule');return {name:$('compare-name').value.trim()+' — Opção '+card.dataset.optionNumber,price:Number(value('price')),size:Number(value('size')),unit:value('unit'),quantity:Number(value('quantity')),weighted:false,compared:true,promo:rule==='none'?null:{type:rule,threshold:Number(value('threshold')),price:Number(value('promoPrice')),condition:value('condition'),eligible:!value('condition')||card.querySelector('[data-field="eligible"]').checked}};});}
function refreshComparison(){
 const items=compareItems();
 [...$('compare-inputs').children].forEach((card,k)=>{const i=items[k];card.querySelector('[data-promotion]').hidden=!i.promo;card.querySelector('[data-eligibility]').hidden=!i.promo?.condition;card.querySelector('.package-summary').textContent=i.size>0&&i.unit&&i.price>0?`${i.quantity} embalagem(ns) de ${i.size} ${i.unit} · ${money(total(i))} no total`:'1 embalagem · preencha preço e conteúdo';});
 // Any edit invalidates the previous result, preventing an outdated option being added.
 options=[];$('comparison').hidden=true;$('compare-message').textContent='';
}
$('compare-form').oninput=refreshComparison;
$('compare-form').onchange=e=>{if(e.target.dataset.field==='condition')e.target.closest('fieldset').querySelector('[data-field="eligible"]').checked=false;refreshComparison();};
$('more-option').onclick=()=>{addCompareCard();refreshComparison();};
$('compare-form').onsubmit=e=>{e.preventDefault();const items=compareItems();if(items.some(i=>!valid(i)||!i.unit)){ $('compare-message').textContent='Confira o preço, o conteúdo e as regras de cada embalagem.';return;}
 if(new Set(items.map(i=>normalized(i).dimension)).size!==1){$('compare-message').textContent='Use medidas compatíveis: g com kg, ml com L, ou unidades com unidades. Peso e volume não podem ser comparados diretamente.';return;}
 options=items;renderOptions();$('comparison').hidden=false;$('comparison').scrollIntoView({behavior:'smooth',block:'start'});
};
addCompareCard();addCompareCard();

if ('serviceWorker' in navigator && ['http:', 'https:'].includes(location.protocol)) {
 navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Não foi possível preparar o acesso offline.', error));
}
if(location.protocol==='data:') $('storage-note').textContent='Prévia temporária: aqui o salvamento não está disponível.';

function renderList(){
 const f=fair();const bought=entry=>f.items.some(i=>i.listId===entry.id);
 const count=f.list.filter(bought).length;
 $('list-count').textContent=`${count} de ${f.list.length} no carrinho`;
 $('planned-items').innerHTML=f.list.length?f.list.map(entry=>`<div class="planned-row ${bought(entry)?'bought':''}"><button type="button" class="planned-open" data-plan="${esc(entry.id)}"><span class="list-check">${bought(entry)?'✓':'○'}</span><span><strong>${esc(entry.name)}</strong><small>${bought(entry)?'No carrinho · toque para ver':'Colocar preço ou comparar'}</small></span><span>›</span></button>${!bought(entry)?`<button type="button" class="planned-remove" data-remove-plan="${esc(entry.id)}" aria-label="Retirar ${esc(entry.name)} da lista">×</button>`:''}</div>`).join(''):'<p class="empty">Sua lista ainda está vazia.<br>Pode anotar só os nomes, sem preço.</p>';
}
function closeEditor(scroll=true){selectedListId=null;$('item-editor').hidden=true;if(scroll)$('shopping-list').scrollIntoView({behavior:'smooth',block:'start'});}
function openEditor(entry){
 selectedListId=entry?.id??null;
 $('product-form').reset();$('compare-form').reset();options=[];renderOptions();
 $('compare-inputs').innerHTML='';comparisonCount=0;addCompareCard();addCompareCard();
 $('name').value=entry?.name??'';$('compare-name').value=entry?.name??'';
 $('selected-item').textContent=entry?`Da sua lista: ${entry.name}`:'Produto fora da lista';
 $('message').textContent='';$('compare-message').textContent='';$('item-editor').hidden=false;mode(false);
 $('item-editor').scrollIntoView({behavior:'smooth',block:'start'});
}
$('list-form').onsubmit=e=>{
 e.preventDefault();const names=$('list-name').value.split(/[,;\n]/).map(n=>n.trim()).filter(Boolean);
 if(!names.length)return;
 const existing=new Set(fair().list.map(i=>i.name.toLocaleLowerCase('pt-BR')));let added=0;
 for(const name of names){const key=name.toLocaleLowerCase('pt-BR');if(!existing.has(key)){fair().list.push({id:makeId(),name});existing.add(key);added++;}}
 save();render();$('list-form').reset();$('list-message').textContent=added?`${added} item(ns) na lista. Toque em um deles para colocar o preço.`:'Esses produtos já estão na lista.';
};
$('planned-items').onclick=e=>{
 const remove=e.target.closest('[data-remove-plan]');if(remove){fair().list=fair().list.filter(i=>i.id!==remove.dataset.removePlan);if(selectedListId===remove.dataset.removePlan)closeEditor(false);save();render();return;}
 const button=e.target.closest('[data-plan]');if(!button)return;
 const entry=fair().list.find(i=>i.id===button.dataset.plan);if(!entry)return;
 if(fair().items.some(i=>i.listId===entry.id)){$('cart').scrollIntoView({behavior:'smooth',block:'start'});return;}
 openEditor(entry);
};
$('direct-add').onclick=()=>openEditor(null);$('back-list').onclick=()=>closeEditor();

function swapDescription(item){
 if(!item.reference)return '';
 const difference=swapDifference(item);const rate=normalized(item.reference);
 return `<p class="swap-note">${difference>=0?'Economia estimada':'Custo extra estimado'}: <strong>${money(Math.abs(difference))}</strong><br>Em relação a ${esc(item.reference.name)} (${money(rate.value)} / ${rate.label}), para a mesma quantidade de produto.</p>`;
}

function localDate(){const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
let historyIndex=state.active;
$('history-month').value=localDate().slice(0,7);
$('period-start').value=localDate();$('period-end').value=localDate();
let rangeAnchor=null;
function periodFairs(){
 const mode=$('period-mode').value;
 if(mode==='all')return state.fairs;
 const [start,end]=mode==='month'?monthBounds($('history-month').value):[$('period-start').value,mode==='day'?$('period-start').value:$('period-end').value];
 return fairsInPeriod(state.fairs,start,end);
}
function switchPage(insights){
 $('shopping-view').hidden=insights;$('insights-view').hidden=!insights;
 for(const [id,active] of [['shopping-tab',!insights],['insights-tab',insights]]){$(id).classList.toggle('active',active);$(id).setAttribute('aria-pressed',String(active));}
 if(insights){historyIndex=state.active;renderInsights();}
}
$('shopping-tab').onclick=()=>switchPage(false);
$('insights-tab').onclick=()=>switchPage(true);
function dateLabel(date){return date?new Date(date+'T12:00:00').toLocaleDateString('pt-BR'):'Sem data';}
function renderInsights(){
 const mode=$('period-mode').value, filtered=periodFairs();
 const [start,end]=mode==='month'?monthBounds($('history-month').value):[$('period-start').value,mode==='day'?$('period-start').value:$('period-end').value];
 $('period-dates').hidden=mode==='month'||mode==='all';$('period-end-label').hidden=mode==='day';
 $('period-error').textContent=mode!=='all'&&(!start||!end||start>end)?'Informe uma data final igual ou posterior à inicial.':'';
 $('period-hint').textContent=mode==='range'?(rangeAnchor?'Agora escolha o último dia, neste mês ou em outro.':'No calendário, toque no primeiro e no último dia. Você pode mudar o mês entre os toques.') : mode==='day'?'Toque em um dia no calendário.':mode==='month'?'Todas as feiras do mês selecionado entram nos cálculos.':'Inclui todas as feiras salvas, inclusive as que ainda estão sem data.';
 $('period-summary').textContent=(mode==='all'?'Todo o histórico':start&&end&&start<=end?dateLabel(start)+' a '+dateLabel(end):'Período incompleto')+' · '+filtered.length+' feira(s) · '+money(filtered.reduce((sum,f)=>sum+f.items.reduce((sum,item)=>sum+total(item),0),0))+' no carrinho';
 if(!filtered.includes(state.fairs[historyIndex]))historyIndex=state.fairs.indexOf(filtered[0]);
 $('history-selected').hidden=historyIndex<0;
 const selected=state.fairs[historyIndex]||{name:'',items:[],list:[]};
 $('history-name').textContent=selected.name;
 $('history-date').value=selected.date||'';
 const pending=pendingItems(selected), omitted=omittedItems(state.fairs[historyIndex-1],selected);
 $('history-detail').innerHTML=`<p><strong>${money(selected.items.reduce((sum,item)=>sum+total(item),0))}</strong> no carrinho · ${selected.items.length} produtos</p><h3>Ficou fora do carrinho</h3><p class="muted">Itens desta lista sem compra registrada.</p><p>${pending.length?pending.map(item=>esc(item.name)).join(' · '):'Nenhum item pendente nesta lista.'}</p>${historyIndex>0?`<h3>Da lista anterior</h3><p class="muted">Estavam em ${esc(state.fairs[historyIndex-1].name)} e não entraram nesta lista nem no carrinho.</p><p>${omitted.length?omitted.map(item=>esc(item.name)).join(' · '):'Todos os itens da lista anterior estão presentes.'}</p>`:''}`;
 const month=$('history-month').value;
 const dated=state.fairs.map((f,i)=>({f,i})).filter(({f})=>f.date?.slice(0,7)===month);
 const periodEntries=state.fairs.map((f,i)=>({f,i})).filter(({f})=>filtered.includes(f));
 const buttons=entries=>entries.map(({f,i})=>`<button class="history-fair secondary" data-history="${i}" aria-pressed="${i===historyIndex}">${esc(f.name)} · ${dateLabel(f.date)}</button>`).join('');
 $('history-fairs').innerHTML=buttons(periodEntries)+(periodEntries.length?'':'<p class="muted">Nenhuma feira neste período.</p>')+(mode!=='all'&&state.fairs.some(f=>!f.date)?'<p class="muted">Feiras sem data ficam fora deste filtro. Selecione Todo o histórico para informar as datas.</p>':'');
 let calendar=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(day=>`<span class="weekday">${day}</span>`).join('');
 if(/^\d{4}-\d{2}$/.test(month)){
  const [year,m]=month.split('-').map(Number), offset=new Date(year,m-1,1).getDay(), days=new Date(year,m,0).getDate();
  calendar+='<span></span>'.repeat(offset);
  for(let day=1;day<=days;day++){
   const date=month+'-'+String(day).padStart(2,'0'), entries=dated.filter(({f})=>f.date===date);
   const inRange=mode==='all'||(start&&end&&date>=start&&date<=end);
   calendar+=`<button class="calendar-day ${entries.length?'has-fair':''} ${inRange?'in-period':''}" data-day="${date}" aria-pressed="${Boolean(inRange)}" aria-label="${dateLabel(date)}: ${entries.length} feira(s)">${day}${entries.length?`<small>${entries.length} feira(s)</small>`:''}</button>`;
  }
 }
 $('fair-calendar').innerHTML=calendar;
 const stats=purchaseStats(filtered);
 const ranking=(items,kind)=>items.slice(0,5).map(item=>`<div class="insight-row"><span>${esc(item.name)}</span><strong>${kind==='spent'?money(item.spent):item.frequency+' feira(s)'}</strong></div>`).join('')||'<p class="muted">Nenhuma compra registrada neste período.</p>';
 $('frequent-products').innerHTML=ranking([...stats].sort((a,b)=>b.frequency-a.frequency),'frequency');
 $('rare-products').innerHTML=ranking([...stats].sort((a,b)=>a.frequency-b.frequency),'frequency');
 $('costly-products').innerHTML=ranking([...stats].sort((a,b)=>b.spent-a.spent),'spent');
 const trends=stats.flatMap(product=>product.series.filter(series=>series.points.length>=2).map(series=>({product,series})));
 $('price-history').innerHTML=trends.map(({product,series})=>{
  const first=series.points[0],last=series.points.at(-1),change=(last.value/first.value-1)*100;
  return `<details><summary>${esc(product.name)} · ${Math.abs(change).toLocaleString('pt-BR',{maximumFractionDigits:1})}% ${change>0?'a mais':change<0?'a menos':'de variação'}</summary><p class="muted">Por ${esc(series.label)}, entre ${dateLabel(first.date)} e ${dateLabel(last.date)}.</p><table class="price-table"><thead><tr><th>Data</th><th>Preço efetivo</th></tr></thead><tbody>${series.points.map(point=>`<tr><td>${dateLabel(point.date)}</td><td>${money(point.value)}</td></tr>`).join('')}</tbody></table></details>`;
 }).join('')||'<p class="muted">As variações aparecem quando o mesmo produto tem registros em pelo menos duas datas. Produtos sem conteúdo informado são acompanhados por embalagem.</p>';
}
$('history-month').onchange=renderInsights;
$('history-date').onchange=()=>{state.fairs[historyIndex].date=$('history-date').value||null;save();renderInsights();};
$('history-fairs').onclick=e=>{const button=e.target.closest('[data-history]');if(button){historyIndex=Number(button.dataset.history);renderInsights();}};
$('fair-calendar').onclick=e=>{
 const button=e.target.closest('[data-day]');if(!button)return;
 const date=button.dataset.day;
 if($('period-mode').value==='range'){
  if(!rangeAnchor){rangeAnchor=date;$('period-start').value=date;$('period-end').value=date;}
  else{[$('period-start').value,$('period-end').value]=[rangeAnchor,date].sort();rangeAnchor=null;}
 }else{$('period-mode').value='day';$('period-start').value=date;$('period-end').value=date;rangeAnchor=null;}
 renderInsights();
};
$('period-mode').onchange=()=>{rangeAnchor=null;renderInsights();};
for(const id of ['period-start','period-end'])$(id).onchange=()=>{rangeAnchor=null;if(id==='period-start'&&$(id).value)$('history-month').value=$(id).value.slice(0,7);renderInsights();};
