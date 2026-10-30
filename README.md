# Poupa

Aplicativo web de comparação de preços e orçamento de supermercado, adaptado ao celular. Sem dependências externas. Requer Node.js 22 ou superior.

## Executar

```sh
npm start
```

Servidor na porta 3000 (substituível por `PORT`). Para verificar os cálculos: `npm test`.

Adicione produtos só com nome e preço ou abra Comparar para informar conteúdo e medida. Promoções são opcionais: preço por unidade a partir de uma quantidade, preço de conjunto ou desconto na última unidade de cada grupo. Condições de clube, cupom e pagamento exigem confirmação explícita. Produtos por peso aceitam preço por kg e peso fracionado.

Cada feira mantém orçamento e carrinho separados. Alterar quantidades recalcula promoções a partir do preço original. Dados persistem no localStorage deste navegador; não há conta, sincronização ou integração com lojas. Comparações em andamento não persistem ao recarregar. O carrinho mantém as opções adicionadas.

Limitações atuais: uma regra por produto; sem combinação entre produtos diferentes, limite promocional por CPF ou leitura de etiquetas. Valores por kg são calculados a partir do peso informado, sem estimativa automática.

## Uso pessoal no iPhone

O aplicativo é uma PWA: após a publicação HTTPS, abra o endereço no Safari e use Compartilhar → Adicionar à Tela de Início. Não exige App Store, cadastro ou backend. O manifest, ícones para iOS e service worker estão incluídos. Após a primeira carga completa, os arquivos ficam disponíveis offline. As feiras são gravadas em localStorage, somente no navegador/dispositivo atual; apagar os dados do site pode apagá-las. O endereço do aplicativo não contém as compras pessoais.

Os recursos usam caminhos relativos, compatíveis com GitHub Pages em `/poupa/`. Para publicar, use a branch `main`, pasta raiz, no GitHub Pages. A publicação depende de acesso à API e permissões do repositório; só uma resposta HTTPS validada confirma que o site está disponível.

A versão móvel e a reabertura offline foram verificadas em Chromium com viewport 390 × 844. Safari/iPhone físico ainda não foi testado. `data:` previews servem apenas para interação temporária: não instalam PWA nem garantem persistência.

Ao alterar recursos estáticos, incremente o nome do cache em `sw.js`. A nova versão do service worker assume quando as janelas da versão anterior são fechadas.

## Lista e escolha no comparador

Cada feira tem uma lista de produtos planejados separada do carrinho. É possível digitar vários nomes separados por vírgula, sem preço. Tocar em um produto abre preço direto ou comparação; apenas a escolha explícita adiciona ao carrinho. Ao retirar um produto do carrinho, ele volta a ficar pendente na lista. Feiras antigas continuam funcionando e recebem uma lista vazia.

O comparador não exige marcar uma escolha inicial. Ao tocar em “Levar esta opção”, a alternativa descartada de menor preço por quantidade é guardada como referência, e as demais opções saem da tela. O saldo das trocas estima o custo da mesma quantidade de produto ao preço proporcional dessa referência, com as condições promocionais cadastradas naquele momento. Não representa necessariamente uma compra de embalagens inteiras nem desconto efetivo no caixa. Trocas por alternativas mais caras reduzem o saldo; alterações de quantidade e promoções no carrinho recalculam a estimativa. Descontos promocionais são mostrados separadamente e não somados à economia estimada das trocas.
