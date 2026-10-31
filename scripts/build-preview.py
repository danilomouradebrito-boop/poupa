from pathlib import Path
p=Path(__file__).resolve().parents[1]
html=(p/'index.html').read_text().replace('<link rel="stylesheet" href="./style.css">','<style>'+(p/'style.css').read_text()+'</style>')
js=(p/'pricing.js').read_text().replace('export function','function')+'\n'+(p/'insights.js').read_text().replace('export function','function').replace("import {total, normalized} from './pricing.js';",'')+'\n'+(p/'app.js').read_text().replace("import {total,normalized,swapDifference} from './pricing.js';",'')
js=js.replace("import {productKey,productName,pendingItems,omittedItems,purchaseStats} from './insights.js';",'')
html=html.replace('<script type="module" src="./app.js"></script>','<script>'+js+'</script>')
(p/'preview'/'poupa.html').write_text(html)
