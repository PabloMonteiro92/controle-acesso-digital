import { CONFIG } from "../config.js";
import { seedRegistros } from "./seed.js";

/**
 * Adaptador de demonstração: guarda tudo no localStorage do navegador.
 * Implementa o mesmo contrato que firebase.js, por isso a interface não sabe a diferença.
 */

const K_REG = "acd:v2:registros";
const K_AUT = "acd:v2:autorizados";
const K_SESSAO = "acd:v2:sessao";

const ouvintes = { auth: new Set(), registos: new Set(), autorizados: new Set() };

function ler(chave, porDefeito) {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : porDefeito;
  } catch {
    return porDefeito;
  }
}

function escrever(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Armazenamento cheio ou bloqueado: a app continua a funcionar, só não persiste.
  }
}

const novoId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const reviver = (r) => ({ ...r, ts: new Date(r.ts) });
const lerRegistos = () => ler(K_REG, []).map(reviver);
const lerAutorizados = () => ler(K_AUT, []);

function emitirRegistos() {
  const lista = lerRegistos().sort((a, b) => b.ts - a.ts);
  ouvintes.registos.forEach((cb) => cb(lista));
}

function emitirAutorizados() {
  const lista = lerAutorizados().sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
  ouvintes.autorizados.forEach((cb) => cb(lista));
}

function utilizador() {
  try {
    const email = sessionStorage.getItem(K_SESSAO);
    return email ? { email } : null;
  } catch {
    return null;
  }
}

async function carregarAutorizadosIniciais() {
  const resposta = await fetch("./data/autorizados.json");
  const dados = await resposta.json();
  return dados.map((a) => ({ id: novoId(), nome: a.nome, empresa: a.empresa ?? "" }));
}

async function repor() {
  const autorizados = await carregarAutorizadosIniciais();
  escrever(K_AUT, autorizados);
  escrever(K_REG, seedRegistros(new Date(), autorizados));
}

export const localStore = {
  mode: "demo",

  async init() {
    if (localStorage.getItem(K_AUT) === null) await repor();
    // Mantém vários separadores sincronizados.
    window.addEventListener("storage", (e) => {
      if (e.key === K_REG) emitirRegistos();
      if (e.key === K_AUT) emitirAutorizados();
    });
  },

  onAuthChange(cb) {
    ouvintes.auth.add(cb);
    cb(utilizador());
    return () => ouvintes.auth.delete(cb);
  },

  async login(email, password) {
    const { demo } = CONFIG;
    if (email.toLowerCase() !== demo.email || password !== demo.password) {
      const erro = new Error("credenciais-invalidas");
      erro.code = "auth/invalid-credential";
      throw erro;
    }
    try {
      sessionStorage.setItem(K_SESSAO, email.toLowerCase());
    } catch {
      /* sem sessionStorage: a sessão vale só até recarregar */
    }
    ouvintes.auth.forEach((cb) => cb({ email: email.toLowerCase() }));
  },

  async logout() {
    try {
      sessionStorage.removeItem(K_SESSAO);
    } catch {
      /* ignorar */
    }
    ouvintes.auth.forEach((cb) => cb(null));
  },

  subscribeRegistos(cb) {
    ouvintes.registos.add(cb);
    emitirRegistos();
    return () => ouvintes.registos.delete(cb);
  },

  async addRegisto(dados) {
    const lista = ler(K_REG, []);
    lista.push({ ...dados, id: novoId(), ts: new Date().toISOString() });
    escrever(K_REG, lista);
    emitirRegistos();
  },

  subscribeAutorizados(cb) {
    ouvintes.autorizados.add(cb);
    emitirAutorizados();
    return () => ouvintes.autorizados.delete(cb);
  },

  async addAutorizado({ nome, empresa }) {
    const lista = lerAutorizados();
    lista.push({ id: novoId(), nome, empresa });
    escrever(K_AUT, lista);
    emitirAutorizados();
  },

  async removeAutorizado(id) {
    escrever(
      K_AUT,
      lerAutorizados().filter((a) => a.id !== id),
    );
    emitirAutorizados();
  },

  async importarAutorizados(lista) {
    const atuais = lerAutorizados();
    const novos = lista.map((a) => ({ id: novoId(), nome: a.nome, empresa: a.empresa ?? "" }));
    escrever(K_AUT, [...atuais, ...novos]);
    emitirAutorizados();
  },

  /** Só existe no modo demonstração. */
  async reporDemo() {
    await repor();
    emitirRegistos();
    emitirAutorizados();
  },
};
