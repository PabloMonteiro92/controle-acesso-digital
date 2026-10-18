import test from "node:test";
import assert from "node:assert/strict";
import { presentes, registosDoDia, resumo, ultimoRegisto } from "../js/lib/stats.js";

const hora = (h, m = 0, dia = 15) => new Date(2026, 9, dia, h, m);
const r = (nome, tipo, ts, autorizado = true) => ({ nome, tipo, ts, autorizado });

const registos = [
  r("Ana Ribeiro", "entrada", hora(7)),
  r("Bruno Carvalho", "entrada", hora(8)),
  r("Bruno Carvalho", "saida", hora(12)),
  r("Bruno Carvalho", "entrada", hora(13)),
  r("Ana Ribeiro", "saida", hora(15)),
  r("Intruso", "entrada", hora(9), false),
  r("Pessoa de ontem", "entrada", hora(22, 0, 14)),
];

test("registosDoDia filtra pelo dia local", () => {
  assert.equal(registosDoDia(registos, hora(10)).length, 6);
});

test("presentes considera a última ação de cada pessoa", () => {
  const dentro = presentes(registosDoDia(registos, hora(10))).map((p) => p.nome);
  assert.deepEqual(dentro.sort(), ["Bruno Carvalho", "Intruso"]);
});

test("presentes ignora acentos e maiúsculas no nome", () => {
  const lista = [r("JOÃO Silva", "entrada", hora(8)), r("joao silva", "saida", hora(9))];
  assert.equal(presentes(lista).length, 0);
});

test("resumo conta movimentos e pessoas sem autorização", () => {
  const s = resumo(registosDoDia(registos, hora(10)));
  assert.deepEqual(s, { entradas: 4, saidas: 2, presentes: 2, semAutorizacao: 1 });
});

test("ultimoRegisto devolve o mais recente da pessoa", () => {
  assert.equal(ultimoRegisto(registos, "bruno carvalho").tipo, "entrada");
  assert.equal(ultimoRegisto(registos, "Ninguém"), null);
});
