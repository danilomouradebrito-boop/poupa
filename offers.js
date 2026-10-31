// Drafts from OCR must always be reviewed. Never infer a missing regular price.
export function parseOfferText(text) {
  const clean = text.replace(/\r/g, '').trim();
  const plain = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const prices = [...clean.matchAll(/(?:R\$\s*)?(\d{1,4}[,.]\d{2})(?!\d)/g)].map(match => Number(match[1].replace(',', '.')));
  const unique = [...new Set(prices)];
  const minimum = plain.match(/(?:a\s+partir|na\s+compra)\s+de\s+(\d+)\b/);
  const bundle = plain.match(/(?:leve\s+|\b)(\d+)\s*(?:unidades?|embalagens?)?\s*por\s*r?\$?\s*\d+[,.]\d{2}/);
  const name = clean.split('\n').find(line => /[a-zà-ú]{3}/i.test(line) && !/r\$|oferta|promo[cç]|valid|clube|cupom|partir|leve|pague|aplicativo/i.test(line)) || '';
  const condition = clean.split('\n').filter(line => /clube|cpf|cupom|aplicativo|\bapp\b|cart[aã]o|pix/i.test(line)).join(' · ');
  // Conflicting amounts and percentage/"leve e pague" deals need manual interpretation.
  const unsupported = /%|pague|segunda|terceira|[23][ªa]\s*unidade/.test(plain);
  const rule = unsupported ? 'none' : minimum ? 'threshold' : bundle ? 'bundle' : 'none';
  const threshold = Number(minimum?.[1] || bundle?.[1] || 3);
  return {name: name.trim().slice(0, 100), price: unique.length === 1 ? unique[0] : null,
    regularPrice: null, rule, threshold, quantity: rule === 'none' ? 1 : threshold,
    weighted: /(?:por|\/)\s*kg\b|\bkg\s*$/.test(plain) && !/\d\s*kg/.test(plain),
    condition: condition.slice(0, 240), prices: unique, text: clean,
    needsRuleReview: unsupported || unique.length !== 1};
}

export function validateOffer(offer) {
  if (!offer.name.trim() || offer.name.length > 100) return 'Informe o nome do produto.';
  if (!Number.isFinite(offer.price) || offer.price < 0 || (offer.price === 0 && offer.rule !== 'nth')) return 'Informe o preço anunciado.';
  if (!['none','threshold','bundle','nth'].includes(offer.rule)) return 'Confira a regra da oferta.';
  if (!Number.isFinite(offer.quantity) || offer.quantity <= 0 || (!offer.weighted && !Number.isInteger(offer.quantity))) return 'Confira a quantidade.';
  if (offer.weighted && offer.rule !== 'none') return 'Ofertas por kg devem usar preço por kg, sem regra de embalagens.';
  if (offer.rule !== 'none' && (!Number.isInteger(offer.threshold) || offer.threshold < 2)) return 'A promoção precisa de pelo menos duas embalagens.';
  if (offer.regularPrice !== null && (!Number.isFinite(offer.regularPrice) || offer.regularPrice <= 0)) return 'Confira o preço sem oferta ou deixe em branco.';
  if (offer.regularPrice !== null && offer.price > offer.regularPrice * (offer.rule === 'bundle' ? offer.threshold : 1)) return 'O preço da oferta está maior que o preço sem oferta.';
  if (offer.validFrom && offer.validUntil && offer.validUntil < offer.validFrom) return 'A validade final deve ser igual ou posterior à inicial.';
  return '';
}

export function canPriceQuantity(item, quantity) {
  if (!item.regularPriceUnknown || quantity === 0) return true;
  const promo = item.promo;
  return !!promo?.eligible && quantity >= promo.threshold &&
    (promo.type === 'threshold' || (promo.type === 'bundle' && quantity % promo.threshold === 0));
}

export function offerToItem(offer, quantity, regularPrice, eligible, today) {
  const error = validateOffer({...offer, quantity, regularPrice});
  if (error) return {error};
  const inDate = (!offer.validFrom || today >= offer.validFrom) && (!offer.validUntil || today <= offer.validUntil);
  const applicable = inDate && (!offer.condition || eligible);
  if (!applicable && regularPrice === null) return {error: 'Informe o preço sem oferta: a validade ou a condição desta promoção não foi atendida.'};
  const hasRule = offer.rule !== 'none';
  const item = {name: offer.name, quantity, weighted: offer.weighted, size: 1, unit: offer.weighted ? 'kg' : 'un',
    price: hasRule ? regularPrice ?? (offer.rule === 'bundle' ? offer.price / offer.threshold : offer.price) : applicable ? offer.price : regularPrice,
    promo: hasRule ? {type: offer.rule, threshold: offer.threshold, price: offer.price, condition: offer.condition || '', eligible: applicable} : null,
    regularPriceUnknown: hasRule && regularPrice === null,
    offerSource: {store: offer.store || '', validFrom: offer.validFrom || '', validUntil: offer.validUntil || '', condition: offer.condition || '', notes: offer.notes || ''}};
  if (!canPriceQuantity(item, quantity)) return {error: 'Informe o preço sem oferta para calcular essa quantidade. O encarte só informa o valor promocional.'};
  return {item};
}
