export function total(item) {
  const q = item.quantity;
  const p = Math.round(item.price * 100);
  const r = item.promo;
  if (item.weighted) return Math.round(p * q) / 100;
  if (!r || !r.eligible || q < r.threshold) return p * q / 100;
  const discountPrice = Math.round(r.price * 100);
  if (r.type === 'threshold') return discountPrice * q / 100;
  if (r.type === 'bundle') return (Math.floor(q / r.threshold) * discountPrice + q % r.threshold * p) / 100;
  return (Math.floor(q / r.threshold) * ((r.threshold - 1) * p + discountPrice) + q % r.threshold * p) / 100;
}
export function normalized(item) {
  const units = {g:['mass',1,'100 g',100],kg:['mass',1000,'100 g',100],ml:['volume',1,'100 ml',100],l:['volume',1000,'100 ml',100],un:['units',1,'unidade',1]};
  const [dimension,factor,label,base] = units[item.unit];
  const amount = item.weighted ? item.quantity * 1000 : item.size * factor * item.quantity;
  return {dimension,label,value:total(item) / amount * base};
}

// Signed estimate at the reference unit price: positive means saved, negative means extra cost.
// Reference quantity and promotion remain the original offer, not a hypothetical checkout.
export function swapDifference(item) {
  if (!item.reference) return 0;
  const chosen = normalized(item);
  const reference = normalized(item.reference);
  if (chosen.dimension !== reference.dimension || chosen.value <= 0) return 0;
  return Math.round((total(item) / chosen.value * reference.value - total(item)) * 100) / 100;
}
