// ==========================================================
// Telas públicas: vitrine, produto, carrinho, checkout e pagamento
// ==========================================================
(function () {
  const { ref, reactive, computed } = Vue;

  // ----- Vitrine -----
  const PaginaVitrine = {
    setup() {
      const L = window.Loja;
      const categoria = ref('Todas');
      const ordenacao = ref('relevancia');

      const categorias = computed(() => [
        'Todas',
        ...new Set(L.produtosAtivos.value.map((p) => p.categoria))
      ]);

      const lista = computed(() => {
        const termo = L.ui.busca.trim().toLowerCase();
        let itens = L.produtosAtivos.value.filter(
          (p) =>
            (categoria.value === 'Todas' || p.categoria === categoria.value) &&
            (!termo ||
              p.nome.toLowerCase().includes(termo) ||
              p.descricao.toLowerCase().includes(termo))
        );
        if (ordenacao.value === 'menor') itens = [...itens].sort((a, b) => a.preco - b.preco);
        if (ordenacao.value === 'maior') itens = [...itens].sort((a, b) => b.preco - a.preco);
        return itens;
      });

      return { L, categoria, ordenacao, categorias, lista };
    },
    template: `
    <main class="container">
      <section class="hero">
        <h1>{{ L.estado.config.nomeLoja }}: ofertas para você</h1>
        <p>Frete grátis em compras acima de {{ L.formatarPreco(L.estado.config.freteGratisAcima) }}.</p>
      </section>

      <div class="toolbar">
        <nav class="categorias" aria-label="Categorias">
          <button
            v-for="c in categorias"
            :key="c"
            :class="{ ativo: c === categoria }"
            @mouseenter="categoria = c"
            @click="categoria = c"
          >{{ c }}</button>
        </nav>
        <select v-model="ordenacao" aria-label="Ordenar produtos">
          <option value="relevancia">Relevância</option>
          <option value="menor">Menor preço</option>
          <option value="maior">Maior preço</option>
        </select>
      </div>

      <p class="resultado">{{ lista.length }} produto(s) encontrado(s)</p>

      <div class="grid">
        <article v-for="p in lista" :key="p.id" class="card">
          <a :href="'#/produto/' + p.id" class="card-img" :style="{ background: p.cor }">
            <img v-if="p.imagem" :src="p.imagem" :alt="p.nome" class="foto" loading="lazy">
            <span v-else>{{ p.emoji }}</span>
          </a>
          <div class="card-body">
            <span class="tag">{{ p.categoria }}</span>
            <h3><a :href="'#/produto/' + p.id" class="nome-link">{{ p.nome }}</a></h3>
            <p class="desc">{{ p.descricao }}</p>
            <div class="card-footer">
              <strong class="preco">{{ L.formatarPreco(p.preco) }}</strong>
              <div class="card-acoes">
                <a :href="'#/produto/' + p.id" class="link-acao">Saiba mais</a>
                <button v-if="p.estoque > 0" class="btn btn-pequeno" @click="L.adicionarAoCarrinho(p)">Adicionar</button>
                <span v-else class="esgotado">Esgotado</span>
              </div>
            </div>
          </div>
        </article>
      </div>

      <p v-if="!lista.length" class="vazio">Nenhum produto encontrado.</p>
    </main>`
  };

  // ----- Detalhe do produto -----
  const PaginaProduto = {
    props: { id: { type: String, required: true } },
    setup(props) {
      const L = window.Loja;
      const produto = computed(() => L.produtoPorId(props.id));
      const quantidade = ref(1);

      function adicionar() {
        const qtd = Math.max(1, Math.floor(Number(quantidade.value) || 1));
        L.adicionarAoCarrinho(produto.value, qtd);
      }

      return { L, produto, quantidade, adicionar };
    },
    template: `
    <main class="container">
      <a href="#/" class="link">← Voltar para a loja</a>
      <div v-if="!produto" class="vazio">Produto não encontrado.</div>

      <div v-else class="detalhe">
        <div class="detalhe-img" :style="{ background: produto.cor }">
          <img v-if="produto.imagem" :src="produto.imagem" :alt="produto.nome" class="foto">
          <span v-else>{{ produto.emoji }}</span>
        </div>
        <div>
          <span class="tag">{{ produto.categoria }}</span>
          <h1>{{ produto.nome }}</h1>
          <p class="muted">{{ produto.descricao }}</p>
          <p class="preco-grande">{{ L.formatarPreco(produto.preco) }}</p>

          <p v-if="produto.estoque > 0" class="estoque" :class="{ baixo: produto.estoque <= 3 }">
            {{ produto.estoque <= 3 ? 'Últimas ' + produto.estoque + ' unidades' : 'Em estoque' }}
          </p>
          <p v-else class="esgotado">Produto esgotado</p>

          <div v-if="produto.estoque > 0" class="compra">
            <label>Quantidade
              <input type="number" v-model.number="quantidade" min="1" :max="produto.estoque">
            </label>
            <button class="btn" @click="adicionar">Adicionar ao carrinho</button>
          </div>
        </div>
      </div>
    </main>`
  };

  // ----- Carrinho -----
  const PaginaCarrinho = {
    setup() {
      const L = window.Loja;
      return {
        L,
        itens: L.itensCarrinho,
        subtotal: L.subtotal,
        frete: L.frete,
        total: L.total
      };
    },
    template: `
    <main class="container">
      <h1 class="titulo-secao">Seu carrinho</h1>

      <p v-if="!itens.length" class="vazio">
        Seu carrinho está vazio. <a href="#/">Ver produtos</a>
      </p>

      <div v-else class="checkout-grid">
        <ul class="lista-pagina">
          <li v-for="item in itens" :key="item.id" class="item-carrinho">
            <div class="thumb" :style="{ background: item.cor }">
              <img v-if="item.imagem" :src="item.imagem" :alt="item.nome" class="foto">
              <span v-else>{{ item.emoji }}</span>
            </div>
            <div class="info">
              <a :href="'#/produto/' + item.id" class="nome-link"><strong>{{ item.nome }}</strong></a>
              <span>{{ L.formatarPreco(item.preco) }}</span>
              <div class="qtd">
                <button @click="L.alterarQtdCarrinho(item.id, -1)" aria-label="Diminuir">−</button>
                <span>{{ item.quantidade }}</span>
                <button @click="L.alterarQtdCarrinho(item.id, 1)" aria-label="Aumentar">+</button>
                <button class="remover" @click="L.removerDoCarrinho(item.id)">Remover</button>
              </div>
            </div>
            <strong class="sub-item">{{ L.formatarPreco(item.preco * item.quantidade) }}</strong>
          </li>
        </ul>

        <aside class="resumo">
          <h3>Resumo</h3>
          <div class="linha"><span>Subtotal</span><span>{{ L.formatarPreco(subtotal) }}</span></div>
          <div class="linha"><span>Frete</span><span>{{ frete ? L.formatarPreco(frete) : 'Grátis' }}</span></div>
          <div class="linha total"><span>Total</span><span>{{ L.formatarPreco(total) }}</span></div>
          <a href="#/checkout" class="btn btn-bloco">Continuar para pagamento</a>
        </aside>
      </div>
    </main>`
  };

  // ----- Checkout (exige login; o router redireciona se necessário) -----
  const PaginaCheckout = {
    setup() {
      const L = window.Loja;
      const cliente = L.clienteLogado;

      const entrega = reactive({
        telefone: cliente.value ? cliente.value.telefone : '',
        cep: cliente.value ? cliente.value.cep : '',
        endereco: cliente.value ? cliente.value.endereco : '',
        pagamento: 'pix'
      });
      const erro = ref('');
      const opcoes = Object.entries(L.PAGAMENTOS).map(([valor, nome]) => ({ valor, nome }));

      function confirmar() {
        erro.value = '';
        try {
          const dadosEntrega = {
            telefone: entrega.telefone,
            cep: entrega.cep,
            endereco: entrega.endereco
          };
          L.atualizarCliente(dadosEntrega);
          const pedido = L.criarPedido({ pagamento: entrega.pagamento, entrega: dadosEntrega });
          location.hash = '#/pagamento/' + pedido.numero;
        } catch (e) {
          erro.value = e.message;
        }
      }

      return {
        L,
        itens: L.itensCarrinho,
        subtotal: L.subtotal,
        frete: L.frete,
        total: L.total,
        entrega,
        erro,
        opcoes,
        confirmar
      };
    },
    template: `
    <main class="container">
      <a href="#/carrinho" class="link">← Voltar ao carrinho</a>
      <h1 class="titulo-secao">Finalizar compra</h1>

      <p v-if="!itens.length" class="vazio">
        Seu carrinho está vazio. <a href="#/">Ver produtos</a>
      </p>

      <div v-else class="checkout-grid">
        <form class="form" @submit.prevent="confirmar">
          <h3>Dados de entrega</h3>
          <label>Telefone
            <input v-model.trim="entrega.telefone" type="tel" required autocomplete="tel">
          </label>
          <label>CEP
            <input v-model.trim="entrega.cep" required inputmode="numeric" maxlength="9" placeholder="00000-000">
          </label>
          <label>Endereço completo
            <input v-model.trim="entrega.endereco" required autocomplete="street-address">
          </label>

          <h3>Forma de pagamento</h3>
          <div class="opcoes">
            <label v-for="op in opcoes" :key="op.valor" class="opcao">
              <input type="radio" name="pagamento" :value="op.valor" v-model="entrega.pagamento">
              {{ op.nome }}
            </label>
          </div>

          <p v-if="erro" class="erro">{{ erro }}</p>
          <button class="btn btn-bloco" type="submit">Criar pedido · {{ L.formatarPreco(total) }}</button>
        </form>

        <aside class="resumo">
          <h3>Resumo do pedido</h3>
          <div v-for="item in itens" :key="item.id" class="linha">
            <span>{{ item.quantidade }}× {{ item.nome }}</span>
            <span>{{ L.formatarPreco(item.preco * item.quantidade) }}</span>
          </div>
          <hr>
          <div class="linha"><span>Subtotal</span><span>{{ L.formatarPreco(subtotal) }}</span></div>
          <div class="linha"><span>Frete</span><span>{{ frete ? L.formatarPreco(frete) : 'Grátis' }}</span></div>
          <div class="linha total"><span>Total</span><span>{{ L.formatarPreco(total) }}</span></div>
        </aside>
      </div>
    </main>`
  };

  // ----- Pagamento (simulado: pronto para ser trocado por um gateway real) -----
  const PaginaPagamento = {
    props: { numero: { type: String, required: true } },
    setup(props) {
      const L = window.Loja;

      // Só mostra pedidos do próprio cliente logado
      const pedido = computed(() => {
        const p = L.pedidoPorNumero(props.numero);
        return p && p.clienteId === L.estado.sessao.clienteId ? p : null;
      });

      const processando = ref(false);
      const erro = ref('');
      const cartao = reactive({ numero: '', nome: '', validade: '', cvv: '' });

      const codigoPix = computed(() =>
        pedido.value ? `PIX-SIMULADO-${pedido.value.numero}-${Math.round(pedido.value.total * 100)}` : ''
      );
      const codigoBoleto = computed(() =>
        pedido.value ? `BOLETO-SIMULADO-${pedido.value.numero}` : ''
      );

      // Algoritmo de Luhn: valida o número do cartão antes de "aprovar"
      function luhn(numero) {
        if (numero.length < 13) return false;
        let soma = 0;
        let dobrar = false;
        for (let i = numero.length - 1; i >= 0; i--) {
          let n = Number(numero[i]);
          if (dobrar) {
            n *= 2;
            if (n > 9) n -= 9;
          }
          soma += n;
          dobrar = !dobrar;
        }
        return soma % 10 === 0;
      }

      function aprovar(mensagem) {
        processando.value = true;
        erro.value = '';
        setTimeout(() => {
          try {
            L.confirmarPagamento(pedido.value.numero);
            L.notificar(mensagem);
            location.hash = '#/conta';
          } catch (e) {
            erro.value = e.message;
          } finally {
            processando.value = false;
          }
        }, 1200);
      }

      function pagarCartao() {
        const numero = cartao.numero.replace(/\D/g, '');
        if (!luhn(numero)) {
          erro.value = 'Número de cartão inválido. Confira os dados.';
          return;
        }
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cartao.validade)) {
          erro.value = 'Validade no formato MM/AA.';
          return;
        }
        if (!/^\d{3,4}$/.test(cartao.cvv)) {
          erro.value = 'CVV inválido.';
          return;
        }
        aprovar('Pagamento aprovado (simulado)!');
      }

      function copiar(texto) {
        if (!navigator.clipboard) return;
        navigator.clipboard
          .writeText(texto)
          .then(() => L.notificar('Código copiado'))
          .catch(() => {});
      }

      return {
        L,
        pedido,
        processando,
        erro,
        cartao,
        codigoPix,
        codigoBoleto,
        pagarCartao,
        aprovar,
        copiar
      };
    },
    template: `
    <main class="container">
      <div v-if="!pedido" class="vazio">
        Pedido não encontrado. <a href="#/conta">Ver meus pedidos</a>
      </div>

      <div v-else class="checkout-grid">
        <section class="form">
          <h2>Pagamento · Pedido #{{ pedido.numero }}</h2>

          <div v-if="pedido.status !== 'aguardando_pagamento'" class="aviso ok">
            Este pedido já foi pago. <a href="#/conta">Ver meus pedidos</a>
          </div>

          <template v-else>
            <p class="aviso">
              Ambiente de demonstração: nenhum valor é cobrado de verdade.
              Forma escolhida: <strong>{{ L.PAGAMENTOS[pedido.pagamento] }}</strong>.
            </p>

            <!-- Pix -->
            <div v-if="pedido.pagamento === 'pix'">
              <p>Copie o código abaixo no app do seu banco (simulado):</p>
              <div class="codigo">
                <span>{{ codigoPix }}</span>
                <button class="btn btn-pequeno btn-secundario" @click="copiar(codigoPix)">Copiar</button>
              </div>
              <p class="erro" v-if="erro">{{ erro }}</p>
              <button class="btn btn-bloco" :disabled="processando" @click="aprovar('Pix confirmado (simulado)!')">
                {{ processando ? 'Processando...' : 'Simular pagamento aprovado' }}
              </button>
            </div>

            <!-- Cartão -->
            <form v-else-if="pedido.pagamento === 'cartao'" @submit.prevent="pagarCartao">
              <p class="muted">Teste: 4111 1111 1111 1111 · validade 12/30 · CVV 123</p>
              <label class="campo">Número do cartão
                <input v-model="cartao.numero" inputmode="numeric" maxlength="19" placeholder="0000 0000 0000 0000" required>
              </label>
              <label class="campo">Nome impresso no cartão
                <input v-model.trim="cartao.nome" required autocomplete="cc-name">
              </label>
              <div class="linha-campos">
                <label class="campo">Validade
                  <input v-model.trim="cartao.validade" placeholder="MM/AA" maxlength="5" required>
                </label>
                <label class="campo">CVV
                  <input v-model.trim="cartao.cvv" inputmode="numeric" maxlength="4" required>
                </label>
              </div>
              <p class="erro" v-if="erro">{{ erro }}</p>
              <button class="btn btn-bloco" type="submit" :disabled="processando">
                {{ processando ? 'Processando...' : 'Pagar ' + L.formatarPreco(pedido.total) }}
              </button>
            </form>

            <!-- Boleto -->
            <div v-else>
              <p>Código de barras do boleto (simulado):</p>
              <div class="codigo">
                <span>{{ codigoBoleto }}</span>
                <button class="btn btn-pequeno btn-secundario" @click="copiar(codigoBoleto)">Copiar</button>
              </div>
              <p class="erro" v-if="erro">{{ erro }}</p>
              <button class="btn btn-bloco" :disabled="processando" @click="aprovar('Boleto compensado (simulado)!')">
                {{ processando ? 'Processando...' : 'Simular compensação do boleto' }}
              </button>
            </div>
          </template>
        </section>

        <aside class="resumo">
          <h3>Itens</h3>
          <div v-for="item in pedido.itens" :key="item.id" class="linha">
            <span>{{ item.quantidade }}× {{ item.nome }}</span>
            <span>{{ L.formatarPreco(item.preco * item.quantidade) }}</span>
          </div>
          <hr>
          <div class="linha"><span>Frete</span><span>{{ pedido.frete ? L.formatarPreco(pedido.frete) : 'Grátis' }}</span></div>
          <div class="linha total"><span>Total</span><span>{{ L.formatarPreco(pedido.total) }}</span></div>
        </aside>
      </div>
    </main>`
  };

  window.VIEWS = Object.assign(window.VIEWS || {}, {
    PaginaVitrine,
    PaginaProduto,
    PaginaCarrinho,
    PaginaCheckout,
    PaginaPagamento
  });
})();
