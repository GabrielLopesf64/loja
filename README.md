# Minha Loja (HTML + CSS3 + Vue 3)

Loja online com três áreas: vitrine e pagamento para o cliente, cadastro de clientes e
painel administrativo. Não precisa de build nem de servidor: abra o `index.html` no navegador.

## Estrutura

```
Loja/
├── index.html          # Casca da página (carrega Vue e os scripts)
├── css/
│   ├── style.css       # Estilos base (vitrine, carrinho, checkout)
│   └── painel.css      # Conta, pagamento e painel administrativo
└── js/
    ├── produtos.js     # Catálogo inicial de produtos
    ├── db.js           # Dados: produtos, pedidos, clientes, configurações
    ├── views-loja.js   # Vitrine, produto, carrinho, checkout e pagamento
    ├── views-conta.js  # Entrar, cadastrar e minha conta
    ├── views-admin.js  # Login, resumo, produtos, pedidos e aparência
    └── app.js          # Roteador (hash) e componente raiz
```

## Como abrir

1. Abra `index.html` no navegador. É preciso internet na primeira vez, para carregar o Vue do CDN.
2. Para evitar restrições de navegadores com arquivos locais, também é possível usar:
   ```bash
   python3 -m http.server 8080
   ```
   e acessar `http://localhost:8080`.

## Acesso

| Área | Como acessar |
|---|---|
| Cliente | Clique em **Entrar** no topo e depois em **Cadastre-se** |
| Administrador | Rodapé da loja → **Área administrativa** |

**Login inicial do administrador:** `admin@loja.com` / `admin123`.
Troque a senha em **Aparência → Senha do administrador** no primeiro acesso.

## Funcionalidades

### Cliente
- Vitrine com busca, filtro por categoria e ordenação por preço
- Página de detalhes do produto com escolha de quantidade
- Carrinho com alteração de quantidade, respeitando o estoque
- Cadastro e login (e-mail e senha)
- Checkout com dados de entrega e forma de pagamento (Pix, cartão ou boleto)
- Pagamento simulado, com validação do número do cartão (algoritmo de Luhn)
- Em **Minha conta**: edição dos dados, histórico de pedidos e pagamento de pedidos pendentes

### Administrador
- **Resumo:** faturamento, pedidos do dia, pedidos aguardando pagamento e estoque baixo
- **Produtos:** criar, editar, excluir, ativar/desativar e controlar estoque
- **Pedidos:** filtrar por status, alterar status e ver itens, entrega e histórico
  - Cancelar um pedido já pago devolve os itens ao estoque
- **Aparência:** nome da loja, cor principal, cor de destaque, frete grátis a partir de
  um valor, valor do frete e troca de senha. A alteração aparece na loja ao salvar.

## Onde os dados ficam

Os dados são salvos no `localStorage` do navegador, na chave `minha-loja-dados-v2`.
Isso significa que:
- os dados ficam apenas neste navegador e neste computador;
- limpar os dados do navegador apaga produtos, pedidos e contas;
- em **Aparência → Dados de demonstração** é possível restaurar o estado inicial.

## O que falta para produção

Esta versão é uma demonstração do fluxo completo. Para vender de verdade, é preciso:

1. **Backend e banco de dados** (por exemplo Node/Express, PHP, Laravel ou Supabase).
   Hoje, toda regra de negócio roda no navegador, e isso não é seguro.
2. **Autenticação no servidor**, com senhas hasheadas (bcrypt ou argon2), sessões ou JWT e HTTPS.
   O hash usado aqui (`hashSenha` em `db.js`) serve só para demonstração.
3. **Gateway de pagamento** (Mercado Pago, Pagar.me, Stripe etc.). As telas de pagamento
   em `views-loja.js` (`PaginaPagamento`) simulam a aprovação. Ao integrar, o servidor deve
   criar a cobrança e confirmar o pagamento por webhook, e não pelo navegador.
4. **Envio de e-mails** de confirmação e cálculo de frete real.

As funções de `db.js` foram separadas da interface justamente para facilitar essa troca.
