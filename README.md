# Poupa

Aplicativo web de comparação de preços e orçamento de supermercado, adaptado ao celular. Servidor sem dependências npm; OCR local incluído em `vendor/ocr`. Requer Node.js 22 ou superior para executar o servidor.

## Executar

```sh
npm start
```

Servidor na porta 3000 (substituível por `PORT`). Para verificar os cálculos: `npm test`.

Adicione produtos só com nome e preço ou abra Comparar para informar conteúdo e medida. Promoções são opcionais: preço por unidade a partir de uma quantidade, preço de conjunto ou desconto na última unidade de cada grupo. Condições de clube, cupom e pagamento exigem confirmação explícita. Produtos por peso aceitam preço por kg e peso fracionado.

Cada feira mantém orçamento e carrinho separados. Alterar quantidades recalcula promoções a partir do preço original. Dados persistem no localStorage deste navegador; não há conta, sincronização ou integração com lojas. Comparações em andamento não persistem ao recarregar. O carrinho mantém as opções adicionadas.

Limitações atuais: uma regra por produto; sem combinação entre produtos diferentes, limite promocional por CPF ou leitura de etiquetas. Valores por kg são calculados a partir do peso informado, sem estimativa automática.

## Encartes

A aba Encartes aceita foto ou print (até 15 MB), sem API de alimentos nem cadastro de supermercados. Marque uma oferta com dois toques nos cantos opostos da imagem e use Ler oferta marcada. O Tesseract lê a área no aparelho; a foto não é enviada a um serviço. Os arquivos do leitor, de aproximadamente 5 MB, são baixados do próprio site apenas na primeira leitura e guardados pelo service worker, quando o navegador permite. O OCR precisa de HTTP local ou HTTPS; prévias `data:` permitem apenas revisão/preenchimento manual.

Revise nome, preço, regra, quantidade, mercado, validade e condições. A leitura de layouts variados e valores em sobrescrito pode falhar; múltiplos preços ficam para escolha manual. Datas, preços sem oferta e restrições não são inventados. Descontos percentuais e “leve e pague” devem ser convertidos manualmente para preço por unidade, conjunto ou última unidade. O usuário confirma a revisão antes de adicionar. A regra de quantidade mínima sugere a quantidade necessária para a lista. Uma imagem pode fornecer várias ofertas, lidas uma de cada vez. A foto e o rascunho não persistem ao recarregar; os dados revisados dos produtos adicionados persistem na lista.

Tocar no produto planejado abre a confirmação da compra. Condições precisam ser marcadas novamente; datas informadas são verificadas contra o dia local da confirmação. Ofertas vencidas/futuras ou sem condição atendida usam o preço sem oferta, se informado, ou pedem esse valor. Uma promoção por quantidade sem preço normal só pode entrar no carrinho nas quantidades cujo total é conhecido (mínimo cumprido ou conjuntos completos). Diminuir abaixo do mínimo ou comprar sobras exige informar o preço normal. Não são calculadas economias em relação a preços normais desconhecidos. Compras já confirmadas mantêm seu preço histórico.

Validação: testes de regras, condições e validade em `tests/offers.test.js`, além de OCR real em Chromium com imagem de teste, confirmação da lista/carrinho, persistência e telas móveis. Safari/iPhone físico ainda depende de validação no aparelho. Fontes e licenças do leitor em `vendor/ocr/README.md`.

## Uso pessoal no iPhone

O aplicativo é uma PWA: após a publicação HTTPS, abra o endereço no Safari e use Compartilhar → Adicionar à Tela de Início. Não exige App Store, cadastro ou backend. O manifest, ícones para iOS e service worker estão incluídos. Após a primeira carga completa, os arquivos ficam disponíveis offline. As feiras são gravadas em localStorage, somente no navegador/dispositivo atual; apagar os dados do site pode apagá-las. O endereço do aplicativo não contém as compras pessoais.

Os recursos usam caminhos relativos, compatíveis com GitHub Pages em `/poupa/`. Para publicar, use a branch `main`, pasta raiz, no GitHub Pages. A publicação depende de acesso à API e permissões do repositório; só uma resposta HTTPS validada confirma que o site está disponível.

A versão móvel e a reabertura offline foram verificadas em Chromium com viewport 390 × 844. Safari/iPhone físico ainda não foi testado. `data:` previews servem apenas para interação temporária: não instalam PWA nem garantem persistência.

Ao alterar recursos estáticos, incremente o nome do cache em `sw.js`. A nova versão do service worker assume quando as janelas da versão anterior são fechadas.

## Lista e escolha no comparador

Cada feira tem uma lista de produtos planejados separada do carrinho. É possível digitar vários nomes separados por vírgula, sem preço. Tocar em um produto abre preço direto ou comparação; apenas a escolha explícita adiciona ao carrinho. Ao retirar um produto do carrinho, ele volta a ficar pendente na lista. Feiras antigas continuam funcionando e recebem uma lista vazia.

O comparador não exige marcar uma escolha inicial. Ao tocar em “Levar esta opção”, a alternativa descartada de menor preço por quantidade é guardada como referência, e as demais opções saem da tela. O saldo das trocas estima o custo da mesma quantidade de produto ao preço proporcional dessa referência, com as condições promocionais cadastradas naquele momento. Não representa necessariamente uma compra de embalagens inteiras nem desconto efetivo no caixa. Trocas por alternativas mais caras reduzem o saldo; alterações de quantidade e promoções no carrinho recalculam a estimativa. Descontos promocionais são mostrados separadamente e não somados à economia estimada das trocas.

### Histórico e insights
A aba separada reúne calendário, itens fora do carrinho, diferenças em relação à lista anterior (ordem de criação), frequência por número de feiras e gastos acumulados. O filtro aceita dia, mês completo, intervalo inclusivo entre datas e todo o histórico. Resumo, rankings, preços e lista de feiras seguem o mesmo período. No modo intervalo, dois toques no calendário definem os limites, inclusive ao navegar entre meses. Feiras sem data só entram em Todo o histórico. Os detalhes individuais comparam a lista da feira selecionada com a anterior na ordem de criação. Novas feiras recebem a data local atual, editável no histórico. Registros antigos continuam sem data até o usuário informá-la. Tendências usam preços efetivos em datas diferentes, agrupam produtos pelo nome da lista e separam massa, volume, unidades e embalagens sem conteúdo informado. Não representam um índice de inflação nem comprovam pagamento no caixa.
