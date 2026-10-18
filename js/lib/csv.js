import { fmtDataHora } from "./format.js";

/**
 * Células que começam por = + - @ podem ser executadas como fórmula no Excel
 * (CSV injection). Prefixar com apóstrofo neutraliza isso.
 */
function celula(valor) {
  let s = String(valor ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const CABECALHO = ["Data e hora", "Tipo", "Nome", "Placa", "Autorizado", "Observação", "Registado por"];

/** Gera CSV com ";" como separador e BOM, que é o que o Excel em português espera. */
export function registosParaCSV(registos) {
  const linhas = registos.map((r) =>
    [
      fmtDataHora(r.ts),
      r.tipo === "entrada" ? "Entrada" : "Saída",
      r.nome,
      r.placa ?? "",
      r.autorizado ? "Sim" : "Não",
      r.observacao ?? "",
      r.usuario ?? "",
    ]
      .map(celula)
      .join(";"),
  );
  return "﻿" + [CABECALHO.map(celula).join(";"), ...linhas].join("\r\n");
}

export function descarregar(nomeFicheiro, conteudo, tipo = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeFicheiro;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
