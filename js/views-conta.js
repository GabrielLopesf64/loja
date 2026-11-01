// ==========================================================
// Conta do cliente: cadastro, login, dados e pedidos
// ==========================================================
(function () {
  const { ref, reactive, computed } = Vue;

  // Após login/cadastro, volta para a página que exigiu a conta (ex.: checkout)
  function irParaProximo(padrao) {
    const L = window.Loja;
    const destino = L.estado.proximo || padrao;
    L.estado.proximo = null;
    location.hash = '#' + destino;
  }

  const PaginaEntrar = {
    setup() {
      const form = reactive({ email: '', senha: '' });
      const erro = ref('');

      function entrar() {
        erro.value = '';
        try {
          window.Loja.entrarCliente(form.email, form.senha);
          window.Loja.notificar('Login realizado!');
          irParaProximo('/conta');
        } catch (e) {
          erro.value = e.message;
        }
      }

      return { form, erro, entrar };
    },
    template: `
    <main class="auth container">
      <div class="auth-card">
        <h1>Entrar</h1>
        <p class="muted">Acesse sua conta para comprar e acompanhar pedidos.</p>
        <form @submit.prevent="entrar">
          <label class="campo">E-mail
            <input v-model.trim="form.email" type="email" required autocomplete="email">
          </label>
          <label class="campo">Senha
            <input v-model="form.senha" type="password" required autocomplete="current-password">
          </label>
          <p v-if="erro" class="erro">{{ erro }}</p>
          <button class="btn btn-bloco" type="submit">Entrar</button>
        </form>
        <p class="muted" style="margin-top:16px">
          Não tem conta? <a href="#/cadastro">Cadastre-se</a>
        </p>
      </div>
    </main>`
  };

  const PaginaCadastro = {
    setup() {
      const form = reactive({ nome: '', email: '', senha: '', confirmar: '' });
      const erro = ref('');

      function cadastrar() {
        erro.value = '';
        if (form.nome.trim().length < 2) return (erro.value = 'Informe seu nome completo.');
        if (!/^\S+@\S+\.\S+$/.test(form.email)) return (erro.value = 'Informe um e-mail válido.');
        if (form.senha.length < 6) return (erro.value = 'A senha deve ter pelo menos 6 caracteres.');
        if (form.senha !== form.confirmar) return (erro.value = 'As senhas não conferem.');

        try {
          window.Loja.cadastrarCliente({ nome: form.nome, email: form.email, senha: form.senha });
          window.Loja.notificar(`Conta criada! Bem-vindo, ${form.nome.trim()}.`);
          irParaProximo('/conta');
        } catch (e) {
          erro.value = e.message;
        }
      }

      return { form, erro, cadastrar };
    },
    template: `
    <main class="auth container">
      <div class="auth-card">
        <h1>Criar conta</h1>
        <p class="muted">Leva menos de um minuto.</p>
        <form @submit.prevent="cadastrar">
          <label class="campo">Nome completo
            <input v-model.trim="form.nome" required autocomplete="name">
          </label>
          <label class="campo">E-mail
            <input v-model.trim="form.email" type="email" required autocomplete="email">
          </label>
          <label class="campo">Senha (mínimo 6 caracteres)
            <input v-model="form.senha" type="password" required autocomplete="new-password">
          </label>
          <label class="campo">Confirmar senha
            <input v-model="form.confirmar" type="password" required autocomplete="new-password">
          </label>
          <p v-if="erro" class="erro">{{ erro }}</p>
          <button class="btn btn-bloco" type="submit">Criar conta</button>
        </form>
        <p class="muted" style="margin-top:16px">
          Já tem conta? <a href="#/entrar">Entrar</a>
        </p>
      </div>
    </main>`
  };

  const PaginaConta = {
    setup() {
      const L = window.Loja;
      const cliente = L.clienteLogado;
      const perfil = reactive({
        nome: cliente.value ? cliente.value.nome : '',
        telefone: cliente.value ? cliente.value.telefone : '',
        cep: cliente.value ? cliente.value.cep : '',
        endereco: cliente.value ? cliente.value.endereco : ''
      });
      const mensagem = ref('');

      function salvarPerfil() {
        if (perfil.nome.trim().length < 2) {
          mensagem.value = 'Informe um nome válido.';
          return;
        }
        L.atualizarCliente({ ...perfil, nome: perfil.nome.trim() });
        mensagem.value = '';
        L.notificar('Dados atualizados');
      }

      function sair() {
        L.sairCliente();
        L.notificar('Você saiu da conta');
        location.hash = '#/';
      }

      return {
        L,
        cliente,
        perfil,
        mensagem,
        pedidos: L.pedidosDoCliente,
        salvarPerfil,
        sair
      };
    },
    template: `
    <main class="container">
      <h1 class="titulo-secao">Minha conta</h1>

      <div class="conta-grid">
        <section class="card-painel">
          <h3>Meus dados</h3>
          <p class="muted">{{ cliente && cliente.email }}</p>
          <form @submit.prevent="salvarPerfil">
            <label class="campo">Nome
              <input v-model="perfil.nome" required>
            </label>
            <label class="campo">Telefone
              <input v-model.trim="perfil.telefone" type="tel">
            </label>
            <label class="campo">CEP
              <input v-model.trim="perfil.cep" inputmode="numeric" maxlength="9" placeholder="00000-000">
            </label>
            <label class="campo">Endereço
              <input v-model.trim="perfil.endereco">
            </label>
            <p v-if="mensagem" class="erro">{{ mensagem }}</p>
            <button class="btn btn-bloco" type="submit">Salvar dados</button>
          </form>
          <button class="btn btn-bloco btn-secundario" style="margin-top:12px" @click="sair">Sair da conta</button>
        </section>

        <section>
          <h3>Meus pedidos</h3>
          <p v-if="!pedidos.length" class="vazio" style="padding:16px 0">
            Você ainda não fez pedidos. <a href="#/">Ver produtos</a>
          </p>

          <article v-for="p in pedidos" :key="p.numero" class="pedido-card card-painel">
            <header>
              <strong>Pedido #{{ p.numero }}</strong>
              <span class="status" :style="{ background: L.STATUS[p.status].cor }">
                {{ L.STATUS[p.status].nome }}
              </span>
            </header>
            <p class="muted">
              {{ L.formatarData(p.criadoEm) }} · {{ L.PAGAMENTOS[p.pagamento] }} · {{ L.formatarPreco(p.total) }}
            </p>
            <p class="lista-itens">{{ p.itens.map(i => i.quantidade + '× ' + i.nome).join(', ') }}</p>
            <a v-if="p.status === 'aguardando_pagamento'" :href="'#/pagamento/' + p.numero" class="btn btn-pequeno">
              Pagar agora
            </a>
          </article>
        </section>
      </div>
    </main>`
  };

  window.VIEWS = Object.assign(window.VIEWS || {}, {
    PaginaEntrar,
    PaginaCadastro,
    PaginaConta
  });
})();
