import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOfferText, validateOffer, offerToItem, canPriceQuantity} from '../offers.js';
import {total} from '../pricing.js';

const today = '2026-10-31';
const offer = {name:'Leite integral 1 L',price:4.5,regularPrice:null,rule:'threshold',threshold:3,quantity:3,weighted:false,condition:'',validFrom:'2026-10-01',validUntil:'2026-11-01'};

test('OCR suggests minimum quantity but does not invent a regular price', () => {
  const result = parseOfferText('LEITE INTEGRAL 1 L\nR$ 4,50\nA partir de 3 unidades\nSomente no clube');
  assert.equal(result.name,'LEITE INTEGRAL 1 L');
  assert.equal(result.price,4.5);
  assert.equal(result.regularPrice,null);
  assert.equal(result.rule,'threshold');
  assert.equal(result.quantity,3);
  assert.match(result.condition,/clube/);
});
test('conflicting prices and percentage deals are left for review', () => {
  const result = parseOfferText('ARROZ\nDe R$ 8,99 por R$ 6,99\nSegunda unidade com 50%');
  assert.equal(result.price,null);
  assert.deepEqual(result.prices,[8.99,6.99]);
  assert.equal(result.rule,'none');
  assert.equal(result.needsRuleReview,true);
  assert.equal(parseOfferText('Leve 3 por R$ 12,00').rule,'bundle');
});
test('minimum offer can be purchased without inventing the non-promotional price', () => {
  const {item} = offerToItem(offer,3,null,false,today);
  assert.equal(total(item),13.5);
  assert.equal(item.regularPriceUnknown,true);
  assert.equal(canPriceQuantity(item,2),false);
  assert.equal(canPriceQuantity(item,4),true);
  assert.ok(offerToItem(offer,2,null,false,today).error);
  const known = offerToItem(offer,2,5,false,today).item;
  assert.equal(total(known),10);
  assert.equal(canPriceQuantity(known,1),true);
});
test('bundles without regular price allow only whole groups; nth needs regular price', () => {
  const bundle = {...offer,rule:'bundle',price:12};
  assert.equal(total(offerToItem(bundle,6,null,false,today).item),24);
  assert.ok(offerToItem(bundle,4,null,false,today).error);
  assert.equal(total(offerToItem(bundle,4,5,false,today).item),17);
  const nth = {...offer,rule:'nth',price:0};
  assert.ok(offerToItem(nth,3,null,false,today).error);
  assert.equal(total(offerToItem(nth,3,5,false,today).item),10);
});
test('conditions and validity are checked again at cart confirmation', () => {
  const conditional = {...offer,condition:'CPF no clube'};
  assert.ok(offerToItem(conditional,3,null,false,today).error);
  assert.equal(total(offerToItem(conditional,3,5,false,today).item),15);
  assert.equal(total(offerToItem(conditional,3,null,true,today).item),13.5);
  assert.ok(offerToItem(offer,3,null,true,'2026-11-02').error);
  assert.ok(offerToItem(offer,3,null,true,'2026-09-30').error);
  assert.equal(total(offerToItem(offer,3,5,true,'2026-11-02').item),15);
  assert.equal(total(offerToItem(offer,3,null,true,'2026-11-01').item),13.5);
});
test('single price and weighed offers respect conditions and fractional weight', () => {
  const weighted = {...offer,rule:'none',weighted:true,price:20,quantity:.35};
  assert.equal(total(offerToItem(weighted,.35,null,false,today).item),7);
  assert.ok(validateOffer({...weighted,rule:'threshold'}));
  const single = {...offer,rule:'none',condition:'Cupom'};
  assert.ok(offerToItem(single,1,null,false,today).error);
  assert.equal(total(offerToItem(single,1,6,false,today).item),6);
});
