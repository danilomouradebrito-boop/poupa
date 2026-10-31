from pathlib import Path
p=Path(__file__).resolve().parents[1]
html=(p/'index.html').read_text().replace('<link rel="stylesheet" href="./style.css">','<style>'+(p/'style.css').read_text()+'</style>')
js=(p/'pricing.js').read_text().replace('export function','function')+'\n'+(p/'insights.js').read_text().replace('export function','function').replace("import {total, normalized} from './pricing.js';",'')+'\n'+(p/'app.js').read_text().replace("import {total,normalized,swapDifference} from './pricing.js';",'')
js=js.replace("import {productKey,productName,pendingItems,omittedItems,purchaseStats,fairsInPeriod,monthBounds} from './insights.js';",'')
offers=(p/'offers.js').read_text().replace('export function','function')
ui=(p/'offers-ui.js').read_text().replace('export function','function').replace("import {parseOfferText, validateOffer, offerToItem} from './offers.js';",'').replace("import {total} from './pricing.js';",'')
js=offers+'\n'+ui+'\n'+js.replace("import {setupOffers} from './offers-ui.js';",'').replace("import {canPriceQuantity} from './offers.js';",'')
html=html.replace('<script type="module" src="./app.js"></script>','<script>'+js+'</script>')
(p/'preview').mkdir(exist_ok=True)
(p/'preview'/'poupa.html').write_text(html)
