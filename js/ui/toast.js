import { h } from "./dom.js";

/** Aviso curto no fundo do ecrã. Substitui os alert() da versão 1. */
export function toast(mensagem, tipo = "ok") {
  const zona = document.getElementById("toasts");
  const el = h("div", { class: `toast toast--${tipo}`, role: tipo === "erro" ? "alert" : "status" }, mensagem);
  zona.append(el);
  setTimeout(() => {
    el.classList.add("toast--sai");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, tipo === "erro" ? 6000 : 3200);
}
