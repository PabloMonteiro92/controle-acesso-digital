import { CONFIG } from "./config.js";
import { store } from "./store/index.js";
import { $, $$, h, icone } from "./ui/dom.js";
import { toast } from "./ui/toast.js";
import { confirmar } from "./ui/dialog.js";
import { encontrarAutorizado, formatarPlaca, normalizar, placaValida } from "./lib/text.js";
import { chaveDia, fmtDataHora, fmtDataLonga, fmtHora, haQuanto } from "./lib/format.js";
import { presentes, registosDoDia, resumo, ultimoRegisto } from "./lib/stats.js";
import { descarregar, registosParaCSV } from "./lib/csv.js";

/* ==========================================================================
   Estado
   ========================================================================== */

const estado = {
  utilizador: null,
  registos: [], // mais recentes primeiro
  autorizados: [], // por ordem alfabética
  aba: "registar",
  cancelar: [], // funções para parar as subscrições
};

const ABAS = ["registar", "historico", "autorizados"];

/* ==========================================================================
   Arranque
   ========================================================================== */

async function iniciar() {
  registarServiceWorker();
  ligarEventos();

  try {
    await store.init();
  } catch (erro) {
    mostrarLogin();
    const msg = $("#login-erro");
    msg.textContent = erro.message;
    msg.hidden = false;
    $("#form-login").querySelectorAll("input, button").forEach((el) => (el.disabled = true));
    return;
  }

  store.onAuthChange((utilizador) => {
    estado.utilizador = utilizador;
    if (utilizador) entrar();
    else sair();
  });

  // Atualiza os "há 2 h" sem recarregar.
  setInterval(() => {
    if (estado.utilizador) desenharPortaria();
  }, 60000);
}

function registarServiceWorker() {
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch((e) => console.warn("Service worker não registado:", e));
  }
}

function mostrarLogin() {
  $("#vista-app").hidden = true;
  $("#vista-login").hidden = false;
  $("#aviso-demo").hidden = store.mode !== "demo";
  document.title = "Entrar | Controle de Acesso";
}

function entrar() {
  $("#vista-login").hidden = true;
  $("#vista-app").hidden = false;
  $("#utilizador-email").textContent = estado.utilizador.email;
  $("#faixa-demo").hidden = store.mode !== "demo";
  $("#form-login").reset();

  estado.cancelar.push(
    store.subscribeRegistos((lista) => {
      estado.registos = lista;
      desenharTudo();
    }),
    store.subscribeAutorizados((lista) => {
      estado.autorizados = lista;
      desenharTudo();
    }),
  );

  const inicial = location.hash.slice(1);
  mudarAba(ABAS.includes(inicial) ? inicial : "registar", { foco: false });
  $("#f-dia").value ||= chaveDia(new Date());
}

function sair() {
  estado.cancelar.forEach((parar) => parar?.());
  estado.cancelar = [];
  estado.registos = [];
  estado.autorizados = [];
  mostrarLogin();
}

/* ==========================================================================
   Navegação
   ========================================================================== */

const TITULOS = { registar: "Portaria", historico: "Histórico", autorizados: "Autorizados" };

function mudarAba(nome, { foco = true } = {}) {
  estado.aba = nome;
  for (const id of ABAS) $(`#aba-${id}`).hidden = id !== nome;
  $$(".aba").forEach((b) => {
    if (b.dataset.aba === nome) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  document.title = `${TITULOS[nome]} | Controle de Acesso`;
  history.replaceState(null, "", `#${nome}`);
  window.scrollTo({ top: 0 });
  if (foco) $("#principal").focus({ preventScroll: true });
}

/* ==========================================================================
   Desenho
   ========================================================================== */

function desenharTudo() {
  desenharPortaria();
  desenharHistorico();
  desenharAutorizados();
  atualizarEstadoNome();
}

function desenharPortaria() {
  const agora = new Date();
  const hoje = registosDoDia(estado.registos, agora);
  const r = resumo(hoje);

  $("#data-hoje").textContent = fmtDataLonga(agora);
  $("#n-entradas").textContent = r.entradas;
  $("#n-saidas").textContent = r.saidas;
  $("#n-presentes").textContent = r.presentes;
  $("#n-sem-aut").textContent = r.semAutorizacao;
  $("#quadro-sem-aut").classList.toggle("quadro__item--alerta", r.semAutorizacao > 0);

  // Dentro agora
  const dentro = presentes(hoje);
  const ulDentro = $("#lista-dentro");
  ulDentro.replaceChildren(
    ...(dentro.length
      ? dentro.map((p) =>
          h(
            "li",
            {},
            h(
              "div",
              { class: "lista__texto" },
              h("div", { class: "lista__nome" }, p.nome, !p.autorizado && avisoSemAutorizacao()),
              h(
                "div",
                { class: "lista__meta" },
                p.placa ? [placaMini(p.placa), " "] : null,
                h("span", { class: "nao-quebra" }, `desde ${fmtHora(p.ts)} (${haQuanto(p.ts, agora)})`),
              ),
            ),
            h(
              "button",
              {
                class: "btn btn--secundario btn--pequeno",
                type: "button",
                "aria-label": `Registar saída de ${p.nome}`,
                onClick: () => prepararSaida(p),
              },
              icone("saida"),
              "Saída",
            ),
          ),
        )
      : [h("li", { class: "vazio" }, "Ninguém dentro neste momento.")]),
  );

  // Últimos registos de hoje
  const ulUltimos = $("#lista-ultimos");
  ulUltimos.replaceChildren(
    ...(hoje.length
      ? hoje.slice(0, 8).map((r) =>
          h(
            "li",
            {},
            h("span", { class: "hora" }, fmtHora(r.ts)),
            h(
              "div",
              { class: "lista__texto" },
              h("div", { class: "lista__nome" }, r.nome, !r.autorizado && avisoSemAutorizacao()),
              h(
                "div",
                { class: "lista__meta" },
                seloMovimento(r.tipo),
                r.placa ? [" · ", placaMini(r.placa)] : null,
                r.observacao ? ` · ${r.observacao}` : null,
              ),
            ),
          ),
        )
      : [h("li", { class: "vazio" }, "Ainda não há registos hoje. Use o formulário para registar o primeiro.")]),
  );

  // Sugestões de nomes
  $("#lista-nomes").replaceChildren(...estado.autorizados.map((a) => h("option", { value: a.nome }, a.empresa)));
}

const avisoSemAutorizacao = () => h("span", { class: "aviso-aut" }, "Sem autorização");
const placaMini = (placa) => h("span", { class: "placa-mini" }, placa);
const seloMovimento = (tipo) =>
  h("span", { class: `selo selo--${tipo}` }, icone(tipo === "entrada" ? "entrada" : "saida"), tipo === "entrada" ? "Entrada" : "Saída");

/* ----- Histórico ----- */

function registosFiltrados() {
  const dia = $("#f-dia").value;
  const tipo = $("#f-tipo").value;
  const busca = normalizar($("#f-busca").value);
  return estado.registos.filter((r) => {
    if (dia && chaveDia(r.ts) !== dia) return false;
    if (tipo && r.tipo !== tipo) return false;
    if (busca) {
      const palheiro = normalizar(`${r.nome} ${r.placa ?? ""} ${r.observacao ?? ""}`);
      if (!palheiro.includes(busca)) return false;
    }
    return true;
  });
}

function desenharHistorico() {
  const lista = registosFiltrados();
  const mostrarData = !$("#f-dia").value;
  const corpo = $("#corpo-historico");

  $("#historico-contagem").textContent =
    lista.length === 1 ? "1 registo" : `${lista.length} registos`;

  corpo.replaceChildren(
    ...(lista.length
      ? lista.map((r) =>
          h(
            "tr",
            {},
            h("td", { class: "hora" }, mostrarData ? fmtDataHora(r.ts) : fmtHora(r.ts)),
            h("td", { class: "cel-mov" }, seloMovimento(r.tipo)),
            h("td", { class: "cel-nome" }, r.nome, !r.autorizado && avisoSemAutorizacao()),
            h("td", { "data-rotulo": "Placa" }, r.placa ? placaMini(r.placa) : "Sem veículo"),
            h("td", { "data-rotulo": "Obs." }, r.observacao || "Nada consta"),
            h("td", { "data-rotulo": "Por" }, r.usuario ?? ""),
          ),
        )
      : [
          h(
            "tr",
            { class: "vazio-linha" },
            h("td", { colspan: 6 }, "Nenhum registo com estes filtros. Mude o dia ou limpe a pesquisa."),
          ),
        ]),
  );
}

/* ----- Autorizados ----- */

function desenharAutorizados() {
  const busca = normalizar($("#aut-busca").value);
  const lista = estado.autorizados.filter((a) => !busca || normalizar(`${a.nome} ${a.empresa}`).includes(busca));
  $("#autorizados-contagem").textContent =
    `${lista.length} de ${estado.autorizados.length} ${estado.autorizados.length === 1 ? "pessoa" : "pessoas"}`;

  $("#lista-autorizados").replaceChildren(
    ...(lista.length
      ? lista.map((a) =>
          h(
            "li",
            {},
            h(
              "div",
              { class: "lista__texto" },
              h("div", { class: "lista__nome" }, a.nome),
              h("div", { class: "lista__meta" }, a.empresa || "Sem empresa"),
            ),
            h(
              "button",
              {
                class: "btn-remover",
                type: "button",
                "aria-label": `Remover ${a.nome} da lista`,
                onClick: () => removerAutorizado(a),
              },
              icone("remover"),
            ),
          ),
        )
      : [h("li", { class: "vazio" }, estado.autorizados.length ? "Ninguém corresponde à pesquisa." : "A lista está vazia. Adicione a primeira pessoa acima.")]),
  );
}

/* ==========================================================================
   Registo
   ========================================================================== */

function tipoAtual() {
  return $('input[name="tipo"]:checked').value;
}

function atualizarTipo() {
  const entrada = tipoAtual() === "entrada";
  const btn = $("#btn-registar");
  btn.textContent = entrada ? "Registar entrada" : "Registar saída";
  btn.classList.toggle("btn--entrada", entrada);
  btn.classList.toggle("btn--saida", !entrada);
  atualizarEstadoNome();
}

/** Devolve os avisos sobre o nome escrito: autorização e entradas/saídas repetidas. */
function avaliarNome(nome) {
  const avisos = [];
  const autorizado = encontrarAutorizado(nome, estado.autorizados);
  const ultimo = ultimoRegisto(registosDoDia(estado.registos), nome);
  const tipo = tipoAtual();

  if (!autorizado) avisos.push({ tipo: "aut", texto: "Não consta na lista de autorizados." });
  if (tipo === "entrada" && ultimo?.tipo === "entrada") {
    avisos.push({ tipo: "dup", texto: `Já tem uma entrada registada hoje às ${fmtHora(ultimo.ts)}.` });
  }
  if (tipo === "saida" && ultimo?.tipo !== "entrada") {
    avisos.push({ tipo: "dup", texto: "Não tem entrada registada hoje." });
  }
  return { autorizado, avisos };
}

function atualizarEstadoNome() {
  const nome = $("#reg-nome").value.trim();
  const zona = $("#estado-nome");
  if (!nome) {
    zona.replaceChildren();
    return;
  }
  const { autorizado, avisos } = avaliarNome(nome);
  const linhas = [];
  if (autorizado) {
    linhas.push(h("span", { class: "estado estado--ok" }, icone("certo"), `Autorizado${autorizado.empresa ? `, ${autorizado.empresa}` : ""}`));
  }
  for (const a of avisos) {
    linhas.push(h("span", { class: "estado estado--aviso" }, icone("aviso"), a.texto));
  }
  zona.replaceChildren(...linhas);
}

function prepararSaida(registo) {
  $("#tipo-saida").checked = true;
  $("#reg-nome").value = registo.nome;
  $("#reg-placa").value = registo.placa ?? "";
  atualizarTipo();
  mudarAba("registar", { foco: false });
  $("#btn-registar").scrollIntoView({ block: "center", behavior: "smooth" });
  $("#btn-registar").focus({ preventScroll: true });
}

async function submeterRegisto(evento) {
  evento.preventDefault();
  const campoNome = $("#reg-nome");
  const campoPlaca = $("#reg-placa");
  const erroPlaca = $("#erro-placa");

  const nome = campoNome.value.replace(/\s+/g, " ").trim();
  const placaBruta = campoPlaca.value.trim();

  if (!nome) {
    toast("Escreva o nome da pessoa.", "erro");
    campoNome.focus();
    return;
  }
  if (placaBruta && !placaValida(placaBruta)) {
    erroPlaca.textContent = "A placa deve ter entre 5 e 8 letras ou números. Exemplo: 00-AA-00.";
    erroPlaca.hidden = false;
    campoPlaca.setAttribute("aria-invalid", "true");
    campoPlaca.focus();
    return;
  }
  erroPlaca.hidden = true;
  campoPlaca.removeAttribute("aria-invalid");

  const { autorizado, avisos } = avaliarNome(nome);
  if (avisos.length) {
    const prosseguir = await confirmar({
      titulo: "Confirmar registo",
      mensagem: `${autorizado?.nome ?? nome}: ${avisos.map((a) => a.texto).join(" ")} Registar mesmo assim?`,
      confirmar: "Registar mesmo assim",
    });
    if (!prosseguir) return;
  }

  const tipo = tipoAtual();
  const botao = $("#btn-registar");
  botao.disabled = true;
  try {
    await store.addRegisto({
      nome: autorizado?.nome ?? nome, // usa a grafia da lista, para o histórico ficar consistente
      placa: placaBruta ? formatarPlaca(placaBruta) : "",
      tipo,
      observacao: $("#reg-obs").value.trim(),
      usuario: estado.utilizador.email,
      autorizado: Boolean(autorizado),
    });
    toast(`${tipo === "entrada" ? "Entrada" : "Saída"} registada: ${autorizado?.nome ?? nome}.`);
    $("#form-registo").reset();
    atualizarTipo();
    campoNome.focus();
  } catch (erro) {
    console.error(erro);
    toast("Não foi possível guardar o registo. Verifique a ligação e tente novamente.", "erro");
  } finally {
    botao.disabled = false;
  }
}

/* ==========================================================================
   Autorizados: adicionar, remover, importar
   ========================================================================== */

async function adicionarAutorizado(evento) {
  evento.preventDefault();
  const nome = $("#aut-nome").value.replace(/\s+/g, " ").trim();
  const empresa = $("#aut-empresa").value.trim();
  if (!nome) {
    toast("Escreva o nome da pessoa.", "erro");
    $("#aut-nome").focus();
    return;
  }
  if (encontrarAutorizado(nome, estado.autorizados)) {
    toast(`${nome} já está na lista.`, "aviso");
    return;
  }
  try {
    await store.addAutorizado({ nome, empresa });
    toast(`${nome} adicionado à lista.`);
    $("#form-autorizado").reset();
    $("#aut-nome").focus();
  } catch (erro) {
    console.error(erro);
    toast("Não foi possível adicionar. Tente novamente.", "erro");
  }
}

async function removerAutorizado(a) {
  const ok = await confirmar({
    titulo: "Remover da lista",
    mensagem: `${a.nome} deixa de estar autorizado. Os registos antigos mantêm-se.`,
    confirmar: "Remover",
    perigo: true,
  });
  if (!ok) return;
  try {
    await store.removeAutorizado(a.id);
    toast(`${a.nome} removido da lista.`);
  } catch (erro) {
    console.error(erro);
    toast("Não foi possível remover. Tente novamente.", "erro");
  }
}

async function importarFicheiro(evento) {
  const ficheiro = evento.target.files[0];
  evento.target.value = "";
  if (!ficheiro) return;
  try {
    if (ficheiro.size > 1_000_000) throw new Error("O ficheiro é demasiado grande (máximo 1 MB).");
    const dados = JSON.parse(await ficheiro.text());
    if (!Array.isArray(dados)) throw new Error('O ficheiro deve conter uma lista, por exemplo [{"nome": "Ana", "empresa": "Alfa"}].');

    const existentes = new Set(estado.autorizados.map((a) => normalizar(a.nome)));
    const novos = [];
    for (const item of dados) {
      const nome = typeof item?.nome === "string" ? item.nome.replace(/\s+/g, " ").trim().slice(0, 120) : "";
      const chave = normalizar(nome);
      if (!nome || existentes.has(chave)) continue;
      existentes.add(chave);
      novos.push({ nome, empresa: typeof item.empresa === "string" ? item.empresa.trim().slice(0, 120) : "" });
    }
    if (!novos.length) {
      toast("Nenhuma pessoa nova no ficheiro. Os nomes já existentes foram ignorados.", "aviso");
      return;
    }
    await store.importarAutorizados(novos);
    toast(`${novos.length} ${novos.length === 1 ? "pessoa importada" : "pessoas importadas"}.`);
  } catch (erro) {
    toast(erro instanceof SyntaxError ? "O ficheiro não é um JSON válido." : erro.message, "erro");
  }
}

/* ==========================================================================
   Exportar e imprimir
   ========================================================================== */

function exportarCSV() {
  const lista = registosFiltrados();
  if (!lista.length) {
    toast("Não há registos para exportar com estes filtros.", "aviso");
    return;
  }
  const dia = $("#f-dia").value || "todos";
  descarregar(`registos-portaria-${dia}.csv`, registosParaCSV(lista));
}

function imprimirRelatorio() {
  const lista = [...registosFiltrados()].sort((a, b) => a.ts - b.ts);
  if (!lista.length) {
    toast("Não há registos para imprimir com estes filtros.", "aviso");
    return;
  }
  const dia = $("#f-dia").value;
  const entradas = lista.filter((r) => r.tipo === "entrada").length;

  $("#relatorio").replaceChildren(
    h("h1", {}, "Relatório de portaria"),
    h(
      "p",
      {},
      dia ? `Dia ${dia.split("-").reverse().join("/")}` : "Todos os dias carregados",
      `. ${lista.length} registos (${entradas} entradas, ${lista.length - entradas} saídas). Gerado em ${fmtDataHora(new Date())} por ${estado.utilizador.email}.`,
    ),
    h(
      "table",
      {},
      h("thead", {}, h("tr", {}, ...["Hora", "Movimento", "Nome", "Placa", "Autorizado", "Observação"].map((t) => h("th", {}, t)))),
      h(
        "tbody",
        {},
        ...lista.map((r) =>
          h(
            "tr",
            {},
            h("td", {}, dia ? fmtHora(r.ts) : fmtDataHora(r.ts)),
            h("td", {}, r.tipo === "entrada" ? "Entrada" : "Saída"),
            h("td", {}, r.nome),
            h("td", {}, r.placa || "-"),
            h("td", {}, r.autorizado ? "Sim" : "Não"),
            h("td", {}, r.observacao || ""),
          ),
        ),
      ),
    ),
    h("div", { class: "assinatura" }, h("div", {}, "Vigilante responsável"), h("div", {}, "Data e visto")),
  );

  const tituloAntes = document.title;
  document.title = `relatorio-portaria-${dia || "todos"}`;
  window.addEventListener(
    "afterprint",
    () => {
      document.title = tituloAntes;
    },
    { once: true },
  );
  window.print();
}

/* ==========================================================================
   Login e eventos
   ========================================================================== */

const MENSAGENS_LOGIN = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/invalid-email": "Escreva um e-mail válido.",
  "auth/too-many-requests": "Demasiadas tentativas. Aguarde alguns minutos e tente de novo.",
  "auth/network-request-failed": "Sem ligação à internet. Verifique a rede e tente de novo.",
};

async function submeterLogin(evento) {
  evento.preventDefault();
  const email = $("#login-email").value.trim();
  const senha = $("#login-senha").value;
  const erro = $("#login-erro");
  erro.hidden = true;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    erro.textContent = "Escreva um e-mail válido.";
    erro.hidden = false;
    $("#login-email").focus();
    return;
  }
  if (senha.length < 6) {
    erro.textContent = "A senha tem pelo menos 6 caracteres.";
    erro.hidden = false;
    $("#login-senha").focus();
    return;
  }

  const botao = $("#btn-login");
  botao.disabled = true;
  try {
    await store.login(email, senha);
  } catch (e) {
    erro.textContent = MENSAGENS_LOGIN[e.code] ?? "Não foi possível entrar. Tente novamente.";
    erro.hidden = false;
  } finally {
    botao.disabled = false;
  }
}

function ligarEventos() {
  $("#form-login").addEventListener("submit", submeterLogin);
  $("#btn-preencher-demo").addEventListener("click", () => {
    $("#login-email").value = CONFIG.demo.email;
    $("#login-senha").value = CONFIG.demo.password;
    $("#btn-login").focus();
  });
  $("#btn-sair").addEventListener("click", () => store.logout());

  $$(".aba").forEach((b) => b.addEventListener("click", () => mudarAba(b.dataset.aba)));
  window.addEventListener("hashchange", () => {
    const alvo = location.hash.slice(1);
    if (estado.utilizador && ABAS.includes(alvo) && alvo !== estado.aba) mudarAba(alvo);
  });

  // Registo
  $("#form-registo").addEventListener("submit", submeterRegisto);
  $$('input[name="tipo"]').forEach((r) => r.addEventListener("change", atualizarTipo));
  $("#reg-nome").addEventListener("input", atualizarEstadoNome);
  $("#reg-placa").addEventListener("blur", (e) => {
    if (placaValida(e.target.value)) e.target.value = formatarPlaca(e.target.value);
  });
  $("#reg-placa").addEventListener("input", (e) => {
    $("#erro-placa").hidden = true;
    e.target.removeAttribute("aria-invalid");
  });

  // Histórico
  ["#f-dia", "#f-tipo", "#f-busca"].forEach((id) => $(id).addEventListener("input", desenharHistorico));
  $("#btn-csv").addEventListener("click", exportarCSV);
  $("#btn-imprimir").addEventListener("click", imprimirRelatorio);

  // Autorizados
  $("#form-autorizado").addEventListener("submit", adicionarAutorizado);
  $("#aut-busca").addEventListener("input", desenharAutorizados);
  $("#btn-importar").addEventListener("click", () => $("#ficheiro-importar").click());
  $("#ficheiro-importar").addEventListener("change", importarFicheiro);

  // Demonstração
  $("#btn-repor").addEventListener("click", async () => {
    const ok = await confirmar({
      titulo: "Repor dados de demonstração",
      mensagem: "Isto apaga os registos e a lista de autorizados deste navegador e volta aos dados fictícios iniciais.",
      confirmar: "Repor dados",
      perigo: true,
    });
    if (ok) {
      await store.reporDemo();
      toast("Dados de demonstração repostos.");
    }
  });
}

iniciar();
