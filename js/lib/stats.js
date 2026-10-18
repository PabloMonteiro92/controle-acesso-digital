import { normalizar } from "./text.js";
import { chaveDia } from "./format.js";

/**
 * Um registo tem esta forma:
 * { id, nome, placa, tipo: "entrada" | "saida", observacao, usuario, ts: Date, autorizado: boolean }
 */

export function registosDoDia(registos, dia = new Date()) {
  const alvo = chaveDia(dia);
  return registos.filter((r) => chaveDia(r.ts) === alvo);
}

/**
 * Quem está dentro, considerando só os registos recebidos (normalmente os de um dia).
 * Percorre do mais antigo para o mais recente: uma entrada marca a pessoa como
 * presente, uma saída tira-a da lista.
 */
export function presentes(registos) {
  const ordenados = [...registos].sort((a, b) => a.ts - b.ts);
  const dentro = new Map();
  for (const r of ordenados) {
    const chave = normalizar(r.nome);
    if (r.tipo === "entrada") dentro.set(chave, r);
    else dentro.delete(chave);
  }
  return [...dentro.values()].sort((a, b) => b.ts - a.ts);
}

/** Último registo de uma pessoa (ou null). Serve para avisar de entradas e saídas repetidas. */
export function ultimoRegisto(registos, nome) {
  const chave = normalizar(nome);
  let ultimo = null;
  for (const r of registos) {
    if (normalizar(r.nome) !== chave) continue;
    if (!ultimo || r.ts > ultimo.ts) ultimo = r;
  }
  return ultimo;
}

export function resumo(registosHoje) {
  return {
    entradas: registosHoje.filter((r) => r.tipo === "entrada").length,
    saidas: registosHoje.filter((r) => r.tipo === "saida").length,
    presentes: presentes(registosHoje).length,
    semAutorizacao: registosHoje.filter((r) => !r.autorizado).length,
  };
}
