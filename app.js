import {total,normalized,swapDifference} from './pricing.js';
const $=id=>document.getElementById(id);
const money=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state;try{state=JSON.parse(localStorage.getItem('poupa-v1'));}catch{}
if(!state?.fairs?.length) state={active:0,fairs:[{name:'Minha primeira feira',budget:null,items:[]}]};
for(const f of state.fairs) if(!Array.isArray(f.list)) f.list=[];
let selectedListId=null;
const makeId=()=>globalThis.crypto?.randomUUID?.() ?? 'item-'+Date.now()+'-'+Math.random().toString(36).slice(2);
let comparing=false,options=[];
const fair=()=>state.fairs[state.active]||state.fairs[0];
function save(){try{localStorage.setItem('poupa-v1',JSON.stringify(state));$('storage-status').hidden=true;}catch{$('storage-status').hidden=false;$('storage-status').textContent='Não foi possível salvar as feiras. Nesta prévia, elas duram apenas enquanto a página estiver aberta.';}}
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
$('fair-form').onsubmit=e=>{e.preventDefault();const name=$('fair-name').value.trim();if(!name)return;closeEditor(false);state.fairs.push({name,budget:null,items:[],list:[]});state.active=state.fairs.length-1;save();render();$('fair-dialog').close();$('fair-form').reset();};
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
 navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
   $('offline-status').textContent='Pronto para usar sem internet neste dispositivo.';
 }).catch(() => { $('offline-status').textContent='A preparação para uso sem internet falhou. Abra novamente com conexão.'; });
} else {
 $('offline-status').textContent='Esta prévia não é instalável. A instalação no iPhone requer o endereço publicado no Safari.';
}

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
