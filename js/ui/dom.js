/**
 * Cria elementos sem usar innerHTML. Tudo o que vem de utilizadores (nomes, observações)
 * entra como texto, por isso não há risco de injeção de HTML.
 */
export function h(tag, atributos = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [chave, valor] of Object.entries(atributos ?? {})) {
    if (valor === false || valor == null) continue;
    if (chave === "class") el.className = valor;
    else if (chave === "dataset") Object.assign(el.dataset, valor);
    else if (chave.startsWith("on") && typeof valor === "function") {
      el.addEventListener(chave.slice(2).toLowerCase(), valor);
    } else el.setAttribute(chave, valor === true ? "" : valor);
  }
  for (const filho of filhos.flat()) {
    if (filho == null || filho === false) continue;
    el.append(filho instanceof Node ? filho : document.createTextNode(String(filho)));
  }
  return el;
}

/** Ícone do sprite definido em index.html. */
export function icone(nome, classe = "") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", `icone ${classe}`.trim());
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#i-${nome}`);
  svg.append(use);
  return svg;
}

export const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
export const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];
