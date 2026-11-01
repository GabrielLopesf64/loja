// ==========================================================
// Aplicação principal: roteador (hash), guardas de acesso e montagem do Vue
// ==========================================================
const { createApp, ref, computed } = Vue;

// Rotas. "cliente: true" exige login de cliente; admin é protegido à parte.
const ROTAS = [
  { padrao: '/', componente: 'PaginaVitrine' },
  { padrao: '/produto/:id', componente: 'PaginaProduto' },
  { padrao: '/carrinho', componente: 'PaginaCarrinho' },
  { padrao: '/entrar', componente: 'PaginaEntrar' },
  { padrao: '/cadastro', componente: 'PaginaCadastro' },
  { padrao: '/conta', componente: 'PaginaConta', cliente: true },
  { padrao: '/checkout', componente: 'PaginaCheckout', cliente: true },
  { padrao: '/pagamento/:numero', componente: 'PaginaPagamento', cliente: true },
  { padrao: '/admin', componente: 'AdminLogin' },
  { padrao: '/admin/painel', componente: 'AdminResumo', admin: true },
  { padrao: '/admin/pedidos', componente: 'AdminPedidos', admin: true },
  { padrao: '/admin/produtos', componente: 'AdminProdutos', admin: true },
  { padrao: '/admin/aparencia', componente: 'AdminAparencia', admin: true }
];

function resolverRota(hash) {
  const L = window.Loja;
  const sessao = L.estado.sessao;
  const caminho = (hash.replace(/^#/, '') || '/').replace(/\/+$/, '') || '/';
  const partes = caminho.split('/').filter(Boolean);

  for (const rota of ROTAS) {
    const modelo = rota.padrao.split('/').filter(Boolean);
    if (modelo.length !== partes.length) continue;

    const params = {};
    let combina = true;
    modelo.forEach((segmento, i) => {
      if (segmento.startsWith(':')) {
        params[segmento.slice(1)] = decodeURIComponent(partes[i]);
      } else if (segmento !== partes[i]) {
        combina = false;
      }
    });
    if (!combina) continue;

    const area = modelo[0] === 'admin' ? 'admin' : 'loja';

    if (rota.cliente && !sessao.clienteId) {
      L.estado.proximo = caminho; // volta para cá depois do login
      return { redirecionar: '/entrar' };
    }
    if (rota.admin && !sessao.admin) {
      return { redirecionar: '/admin' };
    }
    if (rota.componente === 'AdminLogin' && sessao.admin) {
      return { redirecionar: '/admin/painel' };
    }

    return { componente: rota.componente, params, area };
  }

  return { componente: 'PaginaVitrine', params: {}, area: 'loja' };
}

const rota = ref(null);

function atualizarRota() {
  const resultado = resolverRota(location.hash);
  if (resultado.redirecionar) {
    location.hash = '#' + resultado.redirecionar;
    return;
  }
  rota.value = resultado;
  window.scrollTo({ top: 0 });
}

window.addEventListener('hashchange', atualizarRota);

const App = {
  setup() {
    const L = window.Loja;
    const busca = computed({
      get: () => L.ui.busca,
      set: (valor) => (L.ui.busca = valor)
    });

    return {
      rota,
      ui: L.ui,
      busca,
      logado: L.clienteLogado,
      quantidade: L.quantidadeCarrinho,
      nomeLoja: computed(() => L.estado.config.nomeLoja),
      anoAtual: new Date().getFullYear(),
      irParaVitrine() {
        location.hash = '#/';
      }
    };
  },
  template: `
  <div class="app">
    <template v-if="rota">
      <header v-if="rota.area === 'loja'" class="topbar">
        <div class="container topbar-inner">
          <a href="#/" class="logo">🛍️ {{ nomeLoja }}</a>

          <div class="busca">
            <input
              v-model="busca"
              type="search"
              placeholder="Buscar produtos..."
              aria-label="Buscar produtos"
              @focus="irParaVitrine"
            >
          </div>

          <nav class="acoes" aria-label="Conta e carrinho">
            <a v-if="!logado" href="#/entrar" class="link-nav">Entrar</a>
            <a v-else href="#/conta" class="link-nav">Minha conta</a>
            <a href="#/carrinho" class="btn-carrinho" aria-label="Carrinho">
              🛒<span class="badge" v-if="quantidade">{{ quantidade }}</span>
            </a>
          </nav>
        </div>
      </header>

      <component :is="rota.componente" v-bind="rota.params"></component>

      <footer v-if="rota.area === 'loja'" class="rodape">
        <p>© {{ anoAtual }} {{ nomeLoja }} ·
          <a href="#/admin">Área administrativa</a>
        </p>
      </footer>

      <div v-if="ui.toast" class="toast" role="status">{{ ui.toast }}</div>
    </template>
  </div>`
};

// Primeira renderização da rota atual antes de montar
atualizarRota();

const app = createApp(App);
Object.entries(window.VIEWS).forEach(([nome, componente]) => app.component(nome, componente));
app.mount('#app');
