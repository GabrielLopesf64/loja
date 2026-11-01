// ==========================================================
// Camada de dados da loja (DEMONSTRAÇÃO com localStorage).
// Em produção, troque estas funções por chamadas a uma API
// com banco de dados e autenticação no servidor.
// ==========================================================
window.Loja = (() => {
  const { reactive, computed, watch } = Vue;

  const CHAVE = 'minha-loja-dados-v2';
  const SALT = 'minha-loja-demo';
  const ADMIN_EMAIL = 'admin@loja.com';
  const ADMIN_SENHA = 'admin123';

  const CONFIG_PADRAO = {
    nomeLoja: 'Minha Loja',
    corPrimaria: '#0071e3',
    corDestaque: '#2997ff',
    freteGratisAcima: 199,
    valorFrete: 19.9
  };

  const STATUS = {
    aguardando_pagamento: { nome: 'Aguardando pagamento', cor: '#d97706' },
    pago: { nome: 'Pago', cor: '#2563eb' },
    em_separacao: { nome: 'Em separação', cor: '#7c3aed' },
    enviado: { nome: 'Enviado', cor: '#0284c7' },
    entregue: { nome: 'Entregue', cor: '#16a34a' },
    cancelado: { nome: 'Cancelado', cor: '#dc2626' }
  };

  const PAGAMENTOS = {
    pix: 'Pix',
    cartao: 'Cartão de crédito',
    boleto: 'Boleto bancário'
  };

  // Hash simples (cyrb53) para não guardar senhas em texto puro.
  // ATENÇÃO: é apenas para demonstração. Em produção a autenticação
  // deve ser feita no servidor (bcrypt/argon2) e sempre por HTTPS.
  function hashSenha(texto) {
    const str = SALT + texto;
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  // Escurece uma cor #rrggbb (usada no hover dos botões)
  function escurecer(hex, fator = 0.8) {
    const n = parseInt(hex.slice(1), 16);
    const canais = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
      Math.round(c * fator).toString(16).padStart(2, '0')
    );
    return '#' + canais.join('');
  }

  function criarEstadoInicial() {
    return {
      config: { ...CONFIG_PADRAO },
      produtos: window.PRODUTOS.map((p) => ({ ...p, estoque: 20, ativo: true })),
      pedidos: [],
      clientes: [],
      admin: { email: ADMIN_EMAIL, senhaHash: hashSenha(ADMIN_SENHA) },
      carrinho: [],
      sessao: { clienteId: null, admin: false },
      proximo: null
    };
  }

  function carregarEstado() {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE));
      if (salvo && Array.isArray(salvo.produtos)) {
        return { ...criarEstadoInicial(), ...salvo, config: { ...CONFIG_PADRAO, ...salvo.config } };
      }
    } catch (e) {
      /* dados corrompidos: começa do zero */
    }
    return criarEstadoInicial();
  }

  const estado = reactive(carregarEstado());

  function salvarEstado() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch (e) {
      notificar('Não foi possível salvar: o armazenamento do navegador está cheio. Use fotos menores ou remova algumas.');
    }
  }
  watch(estado, salvarEstado, { deep: true });

  // Interface: notificações e busca do cabeçalho
  const ui = reactive({ toast: '', busca: '' });
  let timerToast = null;
  function notificar(texto) {
    ui.toast = texto;
    clearTimeout(timerToast);
    timerToast = setTimeout(() => (ui.toast = ''), 2400);
  }

  // Utilitários
  const formatarPreco = (valor) =>
    Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarData = (iso) =>
    new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  // Converte o arquivo enviado em JPEG redimensionado (lado maior = maxLado px).
  // Isso mantém as fotos pequenas o bastante para o armazenamento do navegador.
  function comprimirImagem(arquivo, maxLado = 800, qualidade = 0.8) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onerror = () => reject(new Error('Falha ao ler o arquivo'));
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Imagem inválida'));
        img.onload = () => {
          const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * escala));
          canvas.height = Math.max(1, Math.round(img.height * escala));
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff'; // fundo branco para imagens com transparência
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', qualidade));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  // ---------- Tema ----------
  function aplicarTema() {
    const { corPrimaria, corDestaque, nomeLoja } = estado.config;
    const estilo = document.documentElement.style;
    estilo.setProperty('--primaria', corPrimaria);
    estilo.setProperty('--primaria-escura', escurecer(corPrimaria));
    estilo.setProperty('--destaque', corDestaque);
    document.title = `${nomeLoja}`;
  }
  watch(
    () => [estado.config.corPrimaria, estado.config.corDestaque, estado.config.nomeLoja],
    aplicarTema,
    { immediate: true }
  );

  // ---------- Produtos ----------
  const produtosAtivos = computed(() => estado.produtos.filter((p) => p.ativo));
  const categoriasExistentes = computed(() => [...new Set(estado.produtos.map((p) => p.categoria))]);
  const produtoPorId = (id) => estado.produtos.find((p) => p.id === Number(id));

  function salvarProduto(dados) {
    if (dados.id) {
      const i = estado.produtos.findIndex((p) => p.id === dados.id);
      if (i >= 0) estado.produtos[i] = { ...estado.produtos[i], ...dados };
    } else {
      const id = Math.max(0, ...estado.produtos.map((p) => p.id)) + 1;
      estado.produtos.push({ ativo: true, ...dados, id });
    }
  }

  function excluirProduto(id) {
    estado.produtos = estado.produtos.filter((p) => p.id !== Number(id));
    estado.carrinho = estado.carrinho.filter((i) => i.id !== Number(id));
  }

  // ---------- Carrinho ----------
  const itensCarrinho = computed(() =>
    estado.carrinho
      .map((item) => {
        const produto = produtoPorId(item.id);
        return produto ? { ...produto, quantidade: item.quantidade } : null;
      })
      .filter(Boolean)
  );

  const quantidadeCarrinho = computed(() =>
    estado.carrinho.reduce((soma, item) => soma + item.quantidade, 0)
  );

  const subtotal = computed(() =>
    itensCarrinho.value.reduce((soma, item) => soma + item.preco * item.quantidade, 0)
  );

  function calcularFrete(valorSubtotal) {
    if (!valorSubtotal) return 0;
    return valorSubtotal >= estado.config.freteGratisAcima ? 0 : estado.config.valorFrete;
  }
  const frete = computed(() => calcularFrete(subtotal.value));
  const total = computed(() => subtotal.value + frete.value);

  function adicionarAoCarrinho(produto, quantidade = 1) {
    if (produto.estoque <= 0) return notificar('Produto esgotado');
    const item = estado.carrinho.find((i) => i.id === produto.id);
    const novaQuantidade = (item ? item.quantidade : 0) + quantidade;
    if (novaQuantidade > produto.estoque) {
      return notificar(`Estoque disponível: ${produto.estoque} unidade(s)`);
    }
    if (item) item.quantidade = novaQuantidade;
    else estado.carrinho.push({ id: produto.id, quantidade });
    notificar(`${produto.nome} adicionado ao carrinho`);
  }

  function alterarQtdCarrinho(id, variacao) {
    const item = estado.carrinho.find((i) => i.id === Number(id));
    if (!item) return;
    const nova = item.quantidade + variacao;
    if (nova <= 0) return removerDoCarrinho(id);
    const produto = produtoPorId(id);
    if (produto && nova > produto.estoque) {
      return notificar(`Estoque disponível: ${produto.estoque} unidade(s)`);
    }
    item.quantidade = nova;
  }

  function removerDoCarrinho(id) {
    estado.carrinho = estado.carrinho.filter((i) => i.id !== Number(id));
  }

  // ---------- Clientes ----------
  const clienteLogado = computed(
    () => estado.clientes.find((c) => c.id === estado.sessao.clienteId) || null
  );

  function cadastrarCliente({ nome, email, senha }) {
    const emailNormalizado = email.trim().toLowerCase();
    if (estado.clientes.some((c) => c.email === emailNormalizado)) {
      throw new Error('Já existe uma conta com este e-mail.');
    }
    const cliente = {
      id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nome: nome.trim(),
      email: emailNormalizado,
      senhaHash: hashSenha(senha),
      telefone: '',
      cep: '',
      endereco: '',
      criadoEm: new Date().toISOString()
    };
    estado.clientes.push(cliente);
    estado.sessao.clienteId = cliente.id;
    return cliente;
  }

  function entrarCliente(email, senha) {
    const cliente = estado.clientes.find((c) => c.email === email.trim().toLowerCase());
    if (!cliente || cliente.senhaHash !== hashSenha(senha)) {
      throw new Error('E-mail ou senha inválidos.');
    }
    estado.sessao.clienteId = cliente.id;
    return cliente;
  }

  function sairCliente() {
    estado.sessao.clienteId = null;
  }

  function atualizarCliente(dados) {
    const cliente = clienteLogado.value;
    if (cliente) Object.assign(cliente, dados);
  }

  const pedidosDoCliente = computed(() =>
    estado.pedidos.filter((p) => p.clienteId === estado.sessao.clienteId)
  );

  // ---------- Administrador ----------
  function entrarAdmin(email, senha) {
    const ok =
      email.trim().toLowerCase() === estado.admin.email &&
      hashSenha(senha) === estado.admin.senhaHash;
    if (!ok) throw new Error('E-mail ou senha de administrador inválidos.');
    estado.sessao.admin = true;
  }

  function sairAdmin() {
    estado.sessao.admin = false;
  }

  function alterarSenhaAdmin(novaSenha) {
    estado.admin.senhaHash = hashSenha(novaSenha);
  }

  function resetarDados() {
    Object.assign(estado, criarEstadoInicial());
    notificar('Dados de demonstração restaurados');
  }

  // ---------- Pedidos ----------
  const pedidoPorNumero = (numero) => estado.pedidos.find((p) => p.numero === Number(numero));

  function mudarStatus(pedido, status) {
    const agora = new Date().toISOString();
    pedido.status = status;
    pedido.historico.push({ status, em: agora });
  }

  function criarPedido({ pagamento, entrega }) {
    const cliente = clienteLogado.value;
    if (!cliente) throw new Error('Faça login para finalizar a compra.');

    const itens = itensCarrinho.value;
    if (!itens.length) throw new Error('Seu carrinho está vazio.');

    for (const item of itens) {
      if (item.quantidade > item.estoque) {
        throw new Error(`Estoque insuficiente para "${item.nome}".`);
      }
    }

    const agora = new Date().toISOString();
    const numero = Math.max(1000, ...estado.pedidos.map((p) => p.numero)) + 1;
    const pedido = {
      numero,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      clienteEmail: cliente.email,
      entrega: { ...entrega },
      pagamento,
      itens: itens.map((i) => ({
        id: i.id,
        nome: i.nome,
        emoji: i.emoji,
        imagem: i.imagem || null,
        preco: i.preco,
        quantidade: i.quantidade
      })),
      subtotal: subtotal.value,
      frete: frete.value,
      total: total.value,
      status: 'aguardando_pagamento',
      criadoEm: agora,
      pagoEm: null,
      historico: [{ status: 'aguardando_pagamento', em: agora }]
    };

    estado.pedidos.unshift(pedido);
    estado.carrinho = [];
    return pedido;
  }

  // Chamado após a aprovação do pagamento: baixa o estoque e marca como pago
  function confirmarPagamento(numero) {
    const pedido = pedidoPorNumero(numero);
    if (!pedido) throw new Error('Pedido não encontrado.');
    if (pedido.status !== 'aguardando_pagamento') return pedido;

    for (const item of pedido.itens) {
      const produto = produtoPorId(item.id);
      if (!produto || produto.estoque < item.quantidade) {
        throw new Error(`Sem estoque de "${item.nome}" para concluir este pedido.`);
      }
    }
    for (const item of pedido.itens) {
      produtoPorId(item.id).estoque -= item.quantidade;
    }

    pedido.pagoEm = new Date().toISOString();
    mudarStatus(pedido, 'pago');
    return pedido;
  }

  function atualizarStatus(numero, novoStatus) {
    const pedido = pedidoPorNumero(numero);
    if (!pedido || pedido.status === novoStatus) return;

    if (novoStatus === 'pago' && pedido.status === 'aguardando_pagamento') {
      confirmarPagamento(numero);
    } else {
      if (novoStatus === 'cancelado' && pedido.pagoEm) {
        // Devolve ao estoque os itens de um pedido já pago
        for (const item of pedido.itens) {
          const produto = produtoPorId(item.id);
          if (produto) produto.estoque += item.quantidade;
        }
        pedido.pagoEm = null;
      }
      mudarStatus(pedido, novoStatus);
    }
    notificar(`Pedido #${pedido.numero}: ${STATUS[novoStatus].nome}`);
  }

  const resumo = computed(() => {
    const hoje = new Date().toDateString();
    const efetivados = estado.pedidos.filter(
      (p) => p.status !== 'cancelado' && p.status !== 'aguardando_pagamento'
    );
    return {
      totalPedidos: estado.pedidos.length,
      aguardando: estado.pedidos.filter((p) => p.status === 'aguardando_pagamento').length,
      faturamento: efetivados.reduce((soma, p) => soma + p.total, 0),
      pedidosHoje: estado.pedidos.filter((p) => new Date(p.criadoEm).toDateString() === hoje).length,
      produtosAtivos: estado.produtos.filter((p) => p.ativo).length,
      estoqueBaixo: estado.produtos.filter((p) => p.ativo && p.estoque <= 3),
      ultimos: estado.pedidos.slice(0, 5)
    };
  });

  return {
    estado,
    ui,
    CONFIG_PADRAO,
    STATUS,
    PAGAMENTOS,
    formatarPreco,
    formatarData,
    comprimirImagem,
    notificar,
    aplicarTema,
    // produtos
    produtosAtivos,
    categoriasExistentes,
    produtoPorId,
    salvarProduto,
    excluirProduto,
    // carrinho
    itensCarrinho,
    quantidadeCarrinho,
    subtotal,
    frete,
    total,
    calcularFrete,
    adicionarAoCarrinho,
    alterarQtdCarrinho,
    removerDoCarrinho,
    // clientes
    clienteLogado,
    cadastrarCliente,
    entrarCliente,
    sairCliente,
    atualizarCliente,
    pedidosDoCliente,
    // admin
    entrarAdmin,
    sairAdmin,
    alterarSenhaAdmin,
    resetarDados,
    // pedidos
    criarPedido,
    pedidoPorNumero,
    confirmarPagamento,
    atualizarStatus,
    resumo
  };
})();
