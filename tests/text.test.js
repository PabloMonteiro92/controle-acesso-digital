import test from "node:test";
import assert from "node:assert/strict";
import { encontrarAutorizado, formatarPlaca, limparPlaca, normalizar, placaValida } from "../js/lib/text.js";

test("normalizar ignora acentos, maiúsculas e espaços a mais", () => {
  assert.equal(normalizar("  JOÃO   Pacheco "), "joao pacheco");
  assert.equal(normalizar(null), "");
});

test("limparPlaca mantém só letras e números em maiúsculas", () => {
  assert.equal(limparPlaca("ab-12 cd"), "AB12CD");
});

test("placaValida aceita 5 a 8 caracteres", () => {
  assert.equal(placaValida("41-AB-27"), true);
  assert.equal(placaValida("ABC1D23"), true);
  assert.equal(placaValida("AB1"), false);
  assert.equal(placaValida("AAAAAAAAA"), false);
});

test("formatarPlaca aplica AA-00-00 só a placas de 6 caracteres", () => {
  assert.equal(formatarPlaca("41ab27"), "41-AB-27");
  assert.equal(formatarPlaca("abc1d23"), "ABC1D23");
});

test("encontrarAutorizado compara sem acentos", () => {
  const lista = [{ nome: "Olívia Sampaio", empresa: "Gama" }];
  assert.equal(encontrarAutorizado("olivia sampaio", lista)?.empresa, "Gama");
  assert.equal(encontrarAutorizado("Outra Pessoa", lista), null);
  assert.equal(encontrarAutorizado("", lista), null);
});
