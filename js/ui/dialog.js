/**
 * Confirmação em <dialog> nativo (acessível, fecha com Esc).
 * Devolve uma Promise<boolean>.
 */
export function confirmar({ titulo, mensagem, confirmar = "Confirmar", cancelar = "Cancelar", perigo = false }) {
  const dlg = document.getElementById("dialogo");
  dlg.querySelector("[data-titulo]").textContent = titulo;
  dlg.querySelector("[data-mensagem]").textContent = mensagem;
  const ok = dlg.querySelector("[data-ok]");
  const nao = dlg.querySelector("[data-nao]");
  ok.textContent = confirmar;
  nao.textContent = cancelar;
  ok.className = perigo ? "btn btn--perigo" : "btn btn--primario";

  return new Promise((resolve) => {
    const fechar = () => resolve(dlg.returnValue === "ok");
    dlg.addEventListener("close", fechar, { once: true });
    dlg.returnValue = "";
    dlg.showModal();
    nao.focus();
  });
}
