import {parseOfferText, validateOffer, offerToItem} from './offers.js';
import {total} from './pricing.js';

export function setupOffers({getFair, save, render, makeId, goShopping, openEditor, localDate}) {
  const el = id => document.getElementById(id);
  const money = n => n.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
  const number = id => el(id).value === '' ? null : Number(el(id).value);
  let imageURL, selection = null, firstPoint = null, selecting = false;
  let worker = null, job = 0, scriptPromise = null, activeEntry = null;
  const message = text => { el('ocr-status').textContent = text; };

  function getOffer() {
    return {name: el('offer-name').value.trim(), store: el('offer-store').value.trim(),
      price: number('offer-price'), regularPrice: number('offer-regular'),
      rule: el('offer-rule').value, threshold: number('offer-threshold'), quantity: number('offer-quantity'),
      weighted: el('offer-unit').value === 'kg', validFrom: el('offer-from').value, validUntil: el('offer-until').value,
      condition: el('offer-condition').value.trim(), notes: el('offer-notes').value.trim()};
  }
  function description(offer) {
    const qty = `${offer.quantity} ${offer.weighted ? 'kg' : 'unidade(s)'}`;
    const price = Number.isFinite(offer.price) ? money(offer.price) : 'preço a conferir';
    const rule = offer.rule === 'threshold' ? `A partir de ${offer.threshold}, ${price} cada.` :
      offer.rule === 'bundle' ? `A cada ${offer.threshold}, ${price} o conjunto.` :
      offer.rule === 'nth' ? `A cada ${offer.threshold}, a última por ${price}.` : `${price} / ${offer.weighted ? 'kg' : 'unidade'}.`;
    return `${qty} · ${rule}${offer.store ? ' Mercado: ' + offer.store + '.' : ''}`;
  }
  function updateReview() {
    const o = getOffer();
    el('offer-threshold-label').hidden = o.rule === 'none';
    el('offer-price-label').querySelector('span').textContent = o.rule === 'bundle' ? 'Preço do conjunto (R$)' :
      o.rule === 'nth' ? 'Preço da última unidade (R$)' : `Preço ${o.weighted ? 'por kg' : 'por unidade'} na oferta (R$)`;
    el('offer-price').min = o.rule === 'nth' ? '0' : '0.01';
    el('offer-quantity').step = o.weighted ? '0.001' : '1';
    el('offer-quantity').min = o.weighted ? '0.001' : '1';
    el('offer-quantity-label').querySelector('span').textContent = o.weighted ? 'Peso para a lista (kg)' : 'Quantidade para a lista';
    el('offer-plan-summary').textContent = description(o);
    el('add-offer-list').textContent = `Adicionar ${o.quantity ?? ''}${o.weighted ? ' kg' : ''} à lista`;
  }
  el('offer-form').oninput = () => { el('offer-reviewed').checked = false; updateReview(); };
  // A checkbox's own input must not uncheck itself.
  el('offer-reviewed').oninput = e => e.stopPropagation();
  el('offer-rule').onchange = () => {
    if (el('offer-rule').value !== 'none') {
      el('offer-unit').value = 'un';
      el('offer-quantity').value = el('offer-threshold').value;
    }
    el('offer-reviewed').checked = false; updateReview();
  };
  el('offer-threshold').onchange = () => { el('offer-quantity').value = el('offer-threshold').value; updateReview(); };
  el('offer-unit').onchange = () => {
    if (el('offer-unit').value === 'kg') el('offer-rule').value = 'none';
    el('offer-quantity').value = 1; updateReview();
  };
  el('offer-form').onsubmit = e => {
    e.preventDefault();
    const offer = getOffer(), error = validateOffer(offer);
    if (error) { el('offer-message').textContent = error; return; }
    if (!el('offer-reviewed').checked) return;
    const f = getFair();
    const existing = f.list.find(entry => entry.name.trim().toLocaleLowerCase('pt-BR') === offer.name.toLocaleLowerCase('pt-BR'));
    if (existing) {
      el('offer-message').textContent = 'Esse produto já está na lista. Use um nome com a marca ou embalagem para distinguir esta oferta.';
      return;
    }
    f.list.push({id: makeId(), name: offer.name, offer});
    save(); render();
    el('offer-message').textContent = `${offer.name}: ${offer.quantity}${offer.weighted ? ' kg' : ' unidade(s)'} na lista de ${f.name}. Confirme na loja para colocar no carrinho.`;
    // Keep store/dates for the next offer, but clear all product-specific values.
    for (const id of ['offer-name','offer-price','offer-regular','offer-condition','offer-notes']) el(id).value = '';
    el('offer-unit').value = 'un'; el('offer-rule').value = 'none'; el('offer-quantity').value = 1;
    el('offer-reviewed').checked = false; el('offer-price-options').replaceChildren(); updateReview();
  };
  el('offer-back-shopping').onclick = goShopping;

  function drawSelection() {
    const box = el('flyer-selection');
    box.hidden = !selection && !firstPoint;
    const s = selection || (firstPoint && {x: firstPoint.x, y: firstPoint.y, w: .015, h: .015});
    if (s) Object.assign(box.style, {left: `${s.x * 100}%`, top: `${s.y * 100}%`, width: `${s.w * 100}%`, height: `${s.h * 100}%`});
    el('read-offer').textContent = selection ? 'Ler oferta marcada' : 'Ler oferta da imagem';
    el('flyer-stage').classList.toggle('selecting', selecting);
  }
  el('select-offer-region').onclick = () => {
    selection = null; firstPoint = null; selecting = true; drawSelection();
    el('region-help').textContent = 'Toque no canto superior esquerdo da oferta. Depois, toque no canto inferior direito, incluindo o nome, o preço e a regra.';
  };
  el('reset-offer-region').onclick = () => {
    selection = null; firstPoint = null; selecting = false; drawSelection();
    el('region-help').textContent = 'Imagem inteira selecionada. Para encartes com vários produtos, marque uma oferta por vez.';
  };
  el('flyer-stage').onclick = e => {
    if (!selecting) return;
    const bounds = el('flyer-image').getBoundingClientRect();
    const p = {x: Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (e.clientY - bounds.top) / bounds.height))};
    if (!firstPoint) { firstPoint = p; el('region-help').textContent = 'Agora toque no canto oposto da oferta.'; }
    else {
      const w = Math.abs(p.x - firstPoint.x), h = Math.abs(p.y - firstPoint.y);
      if (w < .025 || h < .025) { el('region-help').textContent = 'Marque uma área maior, incluindo o produto e o preço.'; return; }
      selection = {x: Math.min(p.x, firstPoint.x), y: Math.min(p.y, firstPoint.y), w, h};
      selecting = false; firstPoint = null;
      el('region-help').textContent = 'Área marcada. Toque em Ler oferta marcada; depois confira os dados.';
    }
    drawSelection();
  };
  async function cancelRead() {
    job++;
    const old = worker; worker = null;
    if (old) await old.terminate().catch(() => {});
    busy(false);
  }
  function busy(value) {
    el('read-offer').disabled = value;
    el('flyer-file').disabled = value;
    el('select-offer-region').disabled = value;
    el('reset-offer-region').disabled = value;
    el('cancel-offer-read').hidden = !value;
    el('offer-progress').hidden = !value;
    el('offer-review').setAttribute('aria-busy', String(value));
  }
  el('cancel-offer-read').onclick = async () => { await cancelRead(); message('Leitura cancelada. Você pode tentar novamente ou preencher a oferta.'); };
  el('flyer-file').onchange = async () => {
    const file = el('flyer-file').files[0];
    if (!file) return;
    await cancelRead();
    const token = ++job;
    if (imageURL) URL.revokeObjectURL(imageURL);
    el('flyer-tools').hidden = true; selection = null; firstPoint = null; selecting = false;
    el('offer-form').reset(); el('offer-price-options').replaceChildren();
    el('offer-raw-text').textContent = 'Ainda não foi feita uma leitura.';
    el('offer-message').textContent = ''; updateReview();
    if (file.size > 15 * 1024 * 1024) { message('A imagem tem mais de 15 MB. Use um print ou uma foto menor.'); return; }
    const url = URL.createObjectURL(file); imageURL = url;
    const img = el('flyer-image'); img.src = url;
    try {
      await img.decode();
      if (token !== job) return;
      el('flyer-tools').hidden = false; drawSelection();
      el('region-help').textContent = 'Marque uma oferta por vez, incluindo nome, preço e quantidade mínima.';
      message('Imagem pronta. Marque a oferta que deseja adicionar.');
    } catch { if (token === job) message('Não foi possível abrir a foto. Tente um print, JPG, PNG ou WebP.'); }
  };
  function loadReader() {
    if (globalThis.Tesseract) return Promise.resolve();
    if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('./vendor/ocr/tesseract.min.js', location.href).href;
      script.onload = resolve;
      script.onerror = () => { script.remove(); scriptPromise = null; reject(new Error('reader unavailable')); };
      document.head.append(script);
    });
    return scriptPromise;
  }
  function fillDraft(draft) {
    el('offer-name').value = draft.name;
    el('offer-price').value = draft.price ?? '';
    el('offer-regular').value = '';
    el('offer-rule').value = draft.rule;
    el('offer-threshold').value = draft.threshold;
    el('offer-quantity').value = draft.quantity;
    el('offer-unit').value = draft.weighted ? 'kg' : 'un';
    el('offer-condition').value = draft.condition;
    el('offer-notes').value = '';
    el('offer-reviewed').checked = false;
    el('offer-raw-text').textContent = draft.text || 'Não foi possível reconhecer texto nesta área.';
    el('offer-price-options').replaceChildren();
    if (draft.prices.length > 1) {
      const hint = document.createElement('p'); hint.className = 'muted';
      hint.textContent = 'Encontrei mais de um valor. Toque no preço anunciado e confira a regra:';
      el('offer-price-options').append(hint);
      draft.prices.slice(0, 12).forEach(price => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary';
        button.textContent = money(price);
        button.onclick = () => { el('offer-price').value = price; el('offer-reviewed').checked = false; updateReview(); };
        el('offer-price-options').append(button);
      });
    }
    el('offer-message').textContent = draft.needsRuleReview ? 'Confira a regra e os valores: a leitura não conseguiu determinar toda a oferta.' : 'Confira também a validade e as condições no rodapé do encarte.';
    updateReview();
    el('offer-review').scrollIntoView({behavior: 'smooth', block: 'start'});
  }
  el('read-offer').onclick = async () => {
    if (location.protocol === 'data:') { message('A leitura de imagem funciona no endereço do Poupa. Nesta prévia temporária, preencha os dados da oferta.'); return; }
    const token = ++job;
    const area = selection ? {...selection} : {x: 0, y: 0, w: 1, h: 1};
    selecting = false; firstPoint = null; drawSelection();
    busy(true); el('offer-progress').value = 0;
    message('Preparando a leitura no aparelho. Na primeira vez, é preciso baixar cerca de 5 MB.');
    let timer;
    try {
      const task = async () => {
        await loadReader();
        if (token !== job) return;
        const base = new URL('./vendor/ocr/', location.href).href;
        const created = await globalThis.Tesseract.createWorker('por', 1, {
          workerPath: base + 'worker.min.js', corePath: base + 'tesseract-core-lstm.wasm.js', langPath: base,
          workerBlobURL: false, logger: progress => {
            if (token !== job) return;
            if (progress.status === 'recognizing text') {
              el('offer-progress').value = progress.progress;
              message(`Lendo a oferta… ${Math.round(progress.progress * 100)}%`);
            }
          }
        });
        if (token !== job) { await created.terminate(); return; }
        worker = created;
        const img = el('flyer-image'), s = area;
        const width = img.naturalWidth * s.w, height = img.naturalHeight * s.h;
        const scale = Math.min(2200 / Math.max(width, height), Math.max(1, 1000 / width));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, img.naturalWidth * s.x, img.naturalHeight * s.y, width, height, 0, 0, canvas.width, canvas.height);
        await worker.setParameters({tessedit_pageseg_mode: '11'});
        const result = await worker.recognize(canvas);
        if (token !== job) return;
        fillDraft(parseOfferText(result.data.text));
        message(result.data.text.trim() ? 'Leitura concluída. Revise os dados antes de adicionar.' : 'Não consegui ler esta área. Tente uma imagem mais nítida ou preencha a oferta.');
      };
      await Promise.race([task(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 90000); })]);
    } catch {
      if (token === job) message('Não foi possível concluir a leitura. Confira a conexão na primeira utilização, tente uma área menor ou preencha a oferta.');
    } finally {
      clearTimeout(timer);
      if (token === job) await cancelRead();
    }
  };

  function calculateUse() {
    if (!activeEntry) return {error: 'Selecione uma oferta.'};
    const result = offerToItem(activeEntry.offer, number('use-offer-quantity'), number('use-offer-regular'), el('use-offer-eligible').checked, localDate());
    el('use-offer-total').textContent = result.error || `Total: ${money(total(result.item))}${result.item.promo && !result.item.promo.eligible ? ' · sem desconto: validade ou condição não atendida.' : ''}`;
    el('use-offer-submit').disabled = !!result.error;
    return result;
  }
  function openOffer(entry) {
    activeEntry = entry;
    const offer = entry.offer;
    el('use-offer-form').reset();
    el('use-offer-title').textContent = entry.name;
    el('use-offer-description').textContent = description(offer) + (offer.notes ? ' ' + offer.notes : '');
    const date = value => value ? value.split('-').reverse().join('/') : 'não informada';
    el('use-offer-dates').textContent = `Validade: ${date(offer.validFrom)} até ${date(offer.validUntil)}. Confira na loja antes de comprar.`;
    el('use-offer-quantity').value = offer.quantity;
    el('use-offer-quantity').min = el('use-offer-quantity').step = offer.weighted ? '.001' : '1';
    el('use-offer-quantity-label').querySelector('span').textContent = offer.weighted ? 'Peso comprado (kg)' : 'Número de embalagens';
    el('use-offer-regular').value = offer.regularPrice ?? '';
    el('use-offer-condition-label').hidden = !offer.condition;
    el('use-offer-condition-label').querySelector('span').textContent = `Posso usar esta condição: ${offer.condition}`;
    calculateUse(); el('use-offer-dialog').showModal();
  }
  el('use-offer-form').oninput = calculateUse;
  el('use-offer-form').onsubmit = e => {
    e.preventDefault();
    const result = calculateUse();
    if (result.error || !el('use-offer-confirm').checked || !getFair().list.includes(activeEntry)) return;
    if (getFair().items.some(item => item.listId === activeEntry.id)) return;
    getFair().items.push({...result.item, id: makeId(), listId: activeEntry.id});
    save(); render(); el('use-offer-dialog').close(); activeEntry = null;
  };
  el('use-offer-other').onclick = () => { const entry = activeEntry; el('use-offer-dialog').close(); openEditor(entry); };
  el('use-offer-cancel').onclick = () => el('use-offer-dialog').close();
  updateReview();
  return {openOffer, show() { el('offer-destination').textContent = `Adicionar à lista: ${getFair().name}`; }};
}
