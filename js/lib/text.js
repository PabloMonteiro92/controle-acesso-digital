/**
 * Funções puras de texto. Sem acesso ao DOM, por isso são fáceis de testar.
 */

/** Remove acentos, passa a minúsculas e compacta espaços. Usado para comparar nomes. */
export function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Devolve a placa só com letras e números, em maiúsculas. */
export function limparPlaca(texto) {
  return String(texto ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** Aceita de 5 a 8 caracteres alfanuméricos (cobre formatos PT, BR e outros). */
export function placaValida(texto) {
  const p = limparPlaca(texto);
  return p.length >= 5 && p.length <= 8;
}

/** Formata placas de 6 caracteres como AA-00-00. Os outros formatos ficam como estão. */
export function formatarPlaca(texto) {
  const p = limparPlaca(texto);
  if (p.length === 6) return `${p.slice(0, 2)}-${p.slice(2, 4)}-${p.slice(4)}`;
  return p;
}

/** Procura um nome na lista de autorizados (ignora acentos e maiúsculas). */
export function encontrarAutorizado(nome, autorizados) {
  const alvo = normalizar(nome);
  if (!alvo) return null;
  return autorizados.find((a) => normalizar(a.nome) === alvo) ?? null;
}
