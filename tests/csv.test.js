import test from "node:test";
import assert from "node:assert/strict";
import { registosParaCSV } from "../js/lib/csv.js";

const base = { tipo: "entrada", placa: "", observacao: "", usuario: "x@y.pt", autorizado: true, ts: new Date(2026, 9, 15, 8, 5) };

test("CSV começa com BOM e usa ; como separador", () => {
  const csv = registosParaCSV([{ ...base, nome: "Ana" }]);
  assert.ok(csv.startsWith("﻿"));
  assert.match(csv.split("\r\n")[1], /^"[^"]+";"Entrada";"Ana";/);
});

test("CSV neutraliza fórmulas (CSV injection)", () => {
  const csv = registosParaCSV([{ ...base, nome: '=HYPERLINK("http://x")' }]);
  assert.ok(csv.includes(`"'=HYPERLINK(""http://x"")"`));
});

test("CSV escapa aspas", () => {
  const csv = registosParaCSV([{ ...base, nome: "Ana", observacao: 'disse "olá"' }]);
  assert.ok(csv.includes('"disse ""olá"""'));
});
