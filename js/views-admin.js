// ==========================================================
// Painel administrativo: login, resumo, produtos, pedidos e aparência
// ==========================================================
(function () {
  const { ref, reactive, computed } = Vue;

  const CORES_CARD = [
    'linear-gradient(135deg,#dbeafe,#93c5fd)',
    'linear-gradient(135deg,#fef3c7,#fcd34d)',
    'linear-gradient(135deg,#fee2e2,#fca5a5)',
    'linear-gradient(135deg,#dcfce7,#86efac)',
    'linear-gradient(135deg,#f3e8ff,#c4b5fd)',
    'linear-gradient(135deg,#ffedd5,#fdba74)',
    'linear-gradient(135deg,#e0f2fe,#7dd3fc)',
    'linear-gradient(135deg,#f1f5f9,#94a3b8)'
  ];

  const CORES_MARCA = ['#4f46e5', '#0ea5e9', '#16a34a', '#f97316', '#e11d48', '#111827'];

  // ----- Estrutura comum (menu lateral) -----
  const AdminLayout = {
    props: { titulo: { type: String, default: '' } },
    setup() {
      const L = window.Loja;
      const menu = [
        { href: '#/admin/painel', nome: 'Resumo', icone: '📊' },
        { href: '#/admin/pedidos', nome: 'Pedidos', icone: '🧾' },
        { href: '#/admin/produtos', nome: 'Produtos', icone: '📦' },
        { href: '#/admin/aparencia', nome: 'Aparência', icone: '🎨' }
      ];

      function sair() {
        L.sairAdmin();
        location.hash = '#/admin';
      }

      return {
        menu,
        sair,
        atual: location.hash,
        nomeLoja: computed(() => L.estado.config.nomeLoja)
      };
    },
    template: `
    <div class="admin">
      <aside class="admin-side">
        <div class="admin-marca">
          {{ nomeLoja }}
          <small>Painel administrativo</small>
        </div>
        <nav>
          <a v-for="m in menu" :key="m.href" :href="m.href" :class="{ ativo: m.href === atual }">
            {{ m.icone }} {{ m.nome }}
          </a>
        </nav>
        <a href="#/" class="link-nav" style="color:#9ca3af;font-size:.85rem">← Ver loja</a>
        <button class="sair" @click="sair">Sair do painel</button>
      </aside>
      <main class="admin-main">
        <h1>{{ titulo }}</h1>
        <slot></slot>
      </main>
    </div>`
  };

  // ----- Login do administrador -----
  const AdminLogin = {
    setup() {
      const form = reactive({ email: '', senha: '' });
      const erro = ref('');

      function entrar() {
        erro.value = '';
        try {
          window.Loja.entrarAdmin(form.email, form.senha);
          location.hash = '#/admin/painel';
        } catch (e) {
          erro.value = e.message;
        }
      }

      return { form, erro, entrar };
    },
    template: `
    <main class="auth-admin">
      <div class="auth-card">
        <div class="logo-admin">🔐</div>
        <h1>Área administrativa</h1>
        <p class="muted">Acesso restrito a administradores da loja.</p>
        <form @submit.prevent="entrar">
          <label class="campo">E-mail
            <input v-model.trim="form.email" type="email" required autocomplete="username">
          </label>
          <label class="campo">Senha
            <input v-model="form.senha" type="password" required autocomplete="current-password">
          </label>
          <p v-if="erro" class="erro">{{ erro }}</p>
          <button class="btn btn-bloco" type="submit">Entrar</button>
        </form>
        <p style="margin-top:16px"><a href="#/">← Voltar para a loja</a></p>
      </div>
    </main>`
  };

  // ----- Resumo -----
  const AdminResumo = {
    setup() {
      const L = window.Loja;
      return { L, resumo: L.resumo, formatarPreco: L.formatarPreco, STATUS: L.STATUS, formatarData: L.formatarData };
    },
    template: `
    <AdminLayout titulo="Resumo">
      <div class="kpis">
        <div class="kpi"><span>Faturamento</span><strong>{{ formatarPreco(resumo.faturamento) }}</strong></div>
        <div class="kpi"><span>Pedidos hoje</span><strong>{{ resumo.pedidosHoje }}</strong></div>
        <div class="kpi"><span>Aguardando pagamento</span><strong>{{ resumo.aguardando }}</strong></div>
        <div class="kpi"><span>Produtos ativos</span><strong>{{ resumo.produtosAtivos }}</strong></div>
      </div>

      <div class="grade-admin">
        <section class="card-painel">
          <h3>Últimos pedidos</h3>
          <p v-if="!resumo.ultimos.length" class="muted">Nenhum pedido ainda.</p>
          <div class="tabela-wrap" v-else>
            <table>
              <thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="p in resumo.ultimos" :key="p.numero">
                  <td>#{{ p.numero }}</td>
                  <td>{{ p.clienteNome }}</td>
                  <td>{{ formatarPreco(p.total) }}</td>
                  <td><span class="status" :style="{ background: STATUS[p.status].cor }">{{ STATUS[p.status].nome }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="card-painel">
          <h3>Estoque baixo (até 3 unidades)</h3>
          <p v-if="!resumo.estoqueBaixo.length" class="muted">Nenhum produto com estoque baixo.</p>
          <ul v-else class="lista-simples">
            <li v-for="p in resumo.estoqueBaixo" :key="p.id">
              {{ p.emoji }} {{ p.nome }} — <strong class="estoque-baixo">{{ p.estoque }} un.</strong>
            </li>
          </ul>
        </section>
      </div>
    </AdminLayout>`
  };

  // ----- Produtos (lista + formulário) -----
  const AdminProdutos = {
    setup() {
      const L = window.Loja;
      const editando = ref(null);
      const erro = ref('');
      const enviando = ref(false);

      function novo() {
        erro.value = '';
        editando.value = {
          nome: '',
          categoria: '',
          preco: 0,
          estoque: 0,
          emoji: '📦',
          cor: CORES_CARD[0],
          descricao: '',
          ativo: true
        };
      }

      function editar(produto) {
        erro.value = '';
        editando.value = { ...produto };
      }

      function cancelar() {
        editando.value = null;
      }

      function salvar() {
        const f = editando.value;
        erro.value = '';
        if (!f.nome.trim()) return (erro.value = 'Informe o nome do produto.');
        if (!f.categoria.trim()) return (erro.value = 'Informe a categoria.');
        if (!(Number(f.preco) >= 0)) return (erro.value = 'Preço inválido.');

        L.salvarProduto({
          ...f,
          nome: f.nome.trim(),
          categoria: f.categoria.trim(),
          descricao: f.descricao.trim(),
          preco: Number(f.preco),
          estoque: Math.max(0, Math.floor(Number(f.estoque) || 0))
        });
        L.notificar('Produto salvo');
        editando.value = null;
      }

      async function escolherImagem(evento) {
        const arquivo = evento.target.files && evento.target.files[0];
        evento.target.value = '';
        if (!arquivo) return;

        if (!arquivo.type.startsWith('image/')) {
          erro.value = 'Escolha um arquivo de imagem (JPG, PNG ou WebP).';
          return;
        }
        if (arquivo.size > 10 * 1024 * 1024) {
          erro.value = 'A imagem deve ter no máximo 10 MB.';
          return;
        }

        enviando.value = true;
        erro.value = '';
        try {
          const dataUrl = await L.comprimirImagem(arquivo);
          if (editando.value) editando.value.imagem = dataUrl;
        } catch (e) {
          erro.value = 'Não foi possível processar esta imagem.';
        } finally {
          enviando.value = false;
        }
      }

      function removerImagem() {
        if (editando.value) editando.value.imagem = null;
      }

      function excluir(produto) {
        if (!confirm(`Excluir "${produto.nome}"? Esta ação não pode ser desfeita.`)) return;
        L.excluirProduto(produto.id);
        L.notificar('Produto excluído');
      }

      function alternarAtivo(produto) {
        L.salvarProduto({ ...produto, ativo: !produto.ativo });
      }

      return {
        L,
        editando,
        erro,
        produtos: computed(() => L.estado.produtos),
        categorias: L.categoriasExistentes,
        cores: CORES_CARD,
        formatarPreco: L.formatarPreco,
        novo,
        editar,
        cancelar,
        salvar,
        excluir,
        alternarAtivo,
        escolherImagem,
        removerImagem,
        enviando
      };
    },
    template: `
    <AdminLayout titulo="Produtos">
      <div class="barra-acoes">
        <p class="muted">{{ produtos.length }} produto(s) cadastrado(s)</p>
        <button class="btn" @click="novo">+ Novo produto</button>
      </div>

      <div class="grade-admin">
        <section class="card-painel" style="padding:0;overflow:hidden">
          <div class="tabela-wrap">
            <table>
              <thead>
                <tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Ativo</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="p in produtos" :key="p.id">
                  <td>
                    <span class="thumb-admin" :style="{ background: p.cor }">
                      <img v-if="p.imagem" :src="p.imagem" alt="">
                      <template v-else>{{ p.emoji }}</template>
                    </span>
                    {{ p.nome }}
                  </td>
                  <td>{{ p.categoria }}</td>
                  <td>{{ formatarPreco(p.preco) }}</td>
                  <td :class="{ 'estoque-baixo': p.estoque <= 3 }">{{ p.estoque }}</td>
                  <td>
                    <input type="checkbox" :checked="p.ativo" @change="alternarAtivo(p)" aria-label="Ativo">
                  </td>
                  <td class="acoes-tabela" style="white-space:nowrap">
                    <button class="btn btn-pequeno btn-secundario" @click="editar(p)">Editar</button>
                    <button class="btn btn-pequeno btn-perigo" @click="excluir(p)">Excluir</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="editando" class="card-painel form-produto">
          <h3>{{ editando.id ? 'Editar produto' : 'Novo produto' }}</h3>
          <form @submit.prevent="salvar">
            <label class="campo">Nome
              <input v-model="editando.nome" required>
            </label>
            <label class="campo">Categoria
              <input v-model="editando.categoria" list="lista-categorias" required>
              <datalist id="lista-categorias">
                <option v-for="c in categorias" :key="c" :value="c"></option>
              </datalist>
            </label>
            <div class="linha-campos">
              <label class="campo">Preço (R$)
                <input v-model.number="editando.preco" type="number" step="0.01" min="0" required>
              </label>
              <label class="campo">Estoque
                <input v-model.number="editando.estoque" type="number" step="1" min="0" required>
              </label>
            </div>
            <label class="campo">Descrição
              <textarea v-model="editando.descricao" rows="3"></textarea>
            </label>
            <div class="campo">
              <span>Foto do produto</span>
              <div class="upload-foto">
                <div class="foto-preview" :style="{ background: editando.cor }">
                  <img v-if="editando.imagem" :src="editando.imagem" alt="Pré-visualização da foto">
                  <span v-else>{{ editando.emoji }}</span>
                </div>
                <div class="upload-acoes">
                  <label class="btn btn-pequeno btn-secundario">
                    {{ enviando ? 'Processando...' : 'Escolher imagem' }}
                    <input type="file" accept="image/*" class="sr-only" :disabled="enviando" @change="escolherImagem">
                  </label>
                  <button v-if="editando.imagem" type="button" class="btn btn-pequeno btn-perigo" @click="removerImagem">
                    Remover foto
                  </button>
                  <small class="muted">JPG, PNG ou WebP. A foto é redimensionada automaticamente.</small>
                </div>
              </div>
            </div>
            <label class="campo">Cor de fundo (usada quando não há foto)
              <select v-model="editando.cor">
                <option v-for="(c, i) in cores" :key="c" :value="c">Cor {{ i + 1 }}</option>
              </select>
            </label>
            <label class="marcar" style="display:flex;gap:8px;align-items:center;margin-bottom:14px">
              <input type="checkbox" v-model="editando.ativo"> Exibir na loja
            </label>
            <p v-if="erro" class="erro">{{ erro }}</p>
            <div style="display:flex;gap:8px">
              <button class="btn" type="submit">Salvar</button>
              <button class="btn btn-secundario" type="button" @click="cancelar">Cancelar</button>
            </div>
          </form>
        </section>
      </div>
    </AdminLayout>`
  };

  // ----- Pedidos -----
  const AdminPedidos = {
    setup() {
      const L = window.Loja;
      const filtro = ref('todos');

      const lista = computed(() =>
        L.estado.pedidos.filter((p) => filtro.value === 'todos' || p.status === filtro.value)
      );

      function mudarStatus(pedido, status) {
        try {
          L.atualizarStatus(pedido.numero, status);
        } catch (e) {
          L.notificar(e.message);
        }
      }

      return {
        L,
        filtro,
        lista,
        mudarStatus,
        opcoesStatus: Object.entries(L.STATUS).map(([valor, s]) => ({ valor, nome: s.nome })),
        opcoesPagamento: L.PAGAMENTOS
      };
    },
    template: `
    <AdminLayout titulo="Pedidos">
      <div class="barra-acoes">
        <select v-model="filtro" aria-label="Filtrar por status" style="min-width:220px">
          <option value="todos">Todos os status</option>
          <option v-for="s in opcoesStatus" :key="s.valor" :value="s.valor">{{ s.nome }}</option>
        </select>
        <p class="muted">{{ lista.length }} pedido(s)</p>
      </div>

      <p v-if="!lista.length" class="card-painel muted">Nenhum pedido encontrado.</p>

      <article v-for="p in lista" :key="p.numero" class="pedido-admin">
        <header style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div>
            <strong>Pedido #{{ p.numero }}</strong>
            <span class="muted"> · {{ L.formatarData(p.criadoEm) }}</span>
            <div>{{ p.clienteNome }} · {{ p.clienteEmail }}</div>
          </div>
          <div style="display:flex;gap:10px;align-items:center">
            <strong>{{ L.formatarPreco(p.total) }}</strong>
            <select :value="p.status" @change="mudarStatus(p, $event.target.value)" aria-label="Alterar status">
              <option v-for="s in opcoesStatus" :key="s.valor" :value="s.valor">{{ s.nome }}</option>
            </select>
          </div>
        </header>

        <details>
          <summary>Ver detalhes</summary>
          <div class="detalhes-grid">
            <div>
              <h4>Itens</h4>
              <div v-for="i in p.itens" :key="i.id" class="linha">
                <span>{{ i.quantidade }}× {{ i.nome }}</span>
                <span>{{ L.formatarPreco(i.preco * i.quantidade) }}</span>
              </div>
              <div class="linha"><span>Frete</span><span>{{ p.frete ? L.formatarPreco(p.frete) : 'Grátis' }}</span></div>
            </div>
            <div>
              <h4>Entrega e pagamento</h4>
              <p>{{ p.entrega.endereco || '—' }}<br>CEP {{ p.entrega.cep || '—' }}<br>Tel. {{ p.entrega.telefone || '—' }}</p>
              <p>Pagamento: <strong>{{ opcoesPagamento[p.pagamento] }}</strong></p>
              <h4>Histórico</h4>
              <ul class="lista-simples">
                <li v-for="(h, i) in p.historico" :key="i">
                  {{ L.STATUS[h.status].nome }} — {{ L.formatarData(h.em) }}
                </li>
              </ul>
            </div>
          </div>
        </details>
      </article>
    </AdminLayout>`
  };

  // ----- Aparência (cores, nome, frete, senha, dados) -----
  const AdminAparencia = {
    setup() {
      const L = window.Loja;
      const rascunho = reactive({ ...L.estado.config });
      const novaSenha = ref('');
      const mensagemSenha = ref('');

      function salvar() {
        Object.assign(L.estado.config, {
          nomeLoja: rascunho.nomeLoja.trim() || L.CONFIG_PADRAO.nomeLoja,
          corPrimaria: rascunho.corPrimaria,
          corDestaque: rascunho.corDestaque,
          freteGratisAcima: Math.max(0, Number(rascunho.freteGratisAcima) || 0),
          valorFrete: Math.max(0, Number(rascunho.valorFrete) || 0)
        });
        L.notificar('Aparência salva');
      }

      function restaurarPadrao() {
        Object.assign(rascunho, L.CONFIG_PADRAO);
      }

      function trocarSenha() {
        if (novaSenha.value.length < 6) {
          mensagemSenha.value = 'A nova senha deve ter pelo menos 6 caracteres.';
          return;
        }
        L.alterarSenhaAdmin(novaSenha.value);
        novaSenha.value = '';
        mensagemSenha.value = '';
        L.notificar('Senha do administrador alterada');
      }

      function resetar() {
        if (!confirm('Restaurar produtos, pedidos e clientes de demonstração? Isso apaga os dados atuais.')) return;
        L.resetarDados();
      }

      return {
        L,
        rascunho,
        novaSenha,
        mensagemSenha,
        cores: CORES_MARCA,
        salvar,
        restaurarPadrao,
        trocarSenha,
        resetar
      };
    },
    template: `
    <AdminLayout titulo="Aparência e configurações">
      <div class="grade-admin">
        <section class="card-painel">
          <h3>Identidade e cores</h3>
          <form @submit.prevent="salvar">
            <label class="campo">Nome da loja
              <input v-model="rascunho.nomeLoja" maxlength="40" required>
            </label>

            <label class="campo">Cor principal (botões e destaques)
              <div class="cor-linha">
                <input type="color" v-model="rascunho.corPrimaria" aria-label="Cor principal">
                <span>{{ rascunho.corPrimaria }}</span>
              </div>
              <div class="swatches">
                <button v-for="c in cores" :key="c" type="button" class="swatch"
                  :style="{ background: c }" :aria-label="'Usar cor ' + c"
                  @click="rascunho.corPrimaria = c"></button>
              </div>
            </label>

            <label class="campo">Cor de destaque (faixa do topo)
              <div class="cor-linha">
                <input type="color" v-model="rascunho.corDestaque" aria-label="Cor de destaque">
                <span>{{ rascunho.corDestaque }}</span>
              </div>
            </label>

            <div class="linha-campos">
              <label class="campo">Frete grátis acima de (R$)
                <input v-model.number="rascunho.freteGratisAcima" type="number" min="0" step="1">
              </label>
              <label class="campo">Valor do frete (R$)
                <input v-model.number="rascunho.valorFrete" type="number" min="0" step="0.1">
              </label>
            </div>

            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn" type="submit">Salvar alterações</button>
              <button class="btn btn-secundario" type="button" @click="restaurarPadrao">Restaurar padrão</button>
            </div>
          </form>
        </section>

        <div>
          <section class="card-painel">
            <h3>Pré-visualização</h3>
            <div class="preview" :style="{ '--primaria': rascunho.corPrimaria, '--destaque': rascunho.corDestaque }">
              <div class="preview-topo" :style="{ background: 'var(--primaria)' }">{{ rascunho.nomeLoja }}</div>
              <div class="preview-corpo">
                <p>Exemplo de texto da vitrine.</p>
                <span class="preview-btn">Adicionar</span>
                <span class="preview-destaque" style="margin-left:8px;color:#fff;padding:8px 14px;border-radius:8px">Destaque</span>
              </div>
            </div>
          </section>

          <section class="card-painel">
            <h3>Senha do administrador</h3>
            <form @submit.prevent="trocarSenha">
              <label class="campo">Nova senha
                <input v-model="novaSenha" type="password" autocomplete="new-password">
              </label>
              <p v-if="mensagemSenha" class="erro">{{ mensagemSenha }}</p>
              <button class="btn btn-secundario" type="submit">Alterar senha</button>
            </form>
          </section>

          <section class="card-painel">
            <h3>Dados de demonstração</h3>
            <p class="muted">Restaura o catálogo inicial e apaga pedidos e clientes.</p>
            <button class="btn btn-perigo" @click="resetar">Restaurar dados de demonstração</button>
          </section>
        </div>
      </div>
    </AdminLayout>`
  };

  window.VIEWS = Object.assign(window.VIEWS || {}, {
    AdminLayout,
    AdminLogin,
    AdminResumo,
    AdminProdutos,
    AdminPedidos,
    AdminAparencia
  });
})();
