# Leitura local de encartes

Arquivos distribuídos com o aplicativo para execução local, sem CDN, chave de API ou envio de fotos.
Carregados sob demanda (aproximadamente 5 MB); o service worker guarda os downloads concluídos.

- `tesseract.min.js` e `worker.min.js`: npm `tesseract.js@6.0.1`, pasta `dist/`. Apache-2.0, `LICENSE-tesseract.js` e avisos `*.LICENSE.txt`.
- `tesseract-core-lstm.wasm.js`: npm `tesseract.js-core@6.0.0`. Build LSTM sem SIMD, WebAssembly embutido, para compatibilidade. Apache-2.0, `LICENSE-core`.
- `por.traineddata.gz`: https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0_fast/por.traineddata.gz (modelo português tessdata_fast). Apache-2.0, `LICENSE-tessdata`.

SHA-256 dos arquivos usados em execução:

```
10fff78484067759c43028a02a72d76d0b90eb17302bb23b58a9ec5410bc928b  tesseract.min.js
38645599043239c0eb6db08a6504a92dcdc292200535f3e9339cd77c4443b842  worker.min.js
775a35df6f2ae100e02609443e6bd5cafcd07983dd6175454ca4a432a7730687  tesseract-core-lstm.wasm.js
7b0f1749aa255a593b14160c75f74690be740edcae94c5a45efc24ab50235f4d  por.traineddata.gz
```

O OCR fornece rascunhos, não ofertas verificadas. O formulário exige revisão antes de gravar na lista.
