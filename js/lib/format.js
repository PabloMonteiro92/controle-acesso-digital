const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dataLonga = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export const fmtHora = (d) => hora.format(d);
export const fmtDataHora = (d) => dataHora.format(d);
export const fmtDataLonga = (d) => dataLonga.format(d);

/** Data local no formato yyyy-mm-dd (o valor que um <input type="date"> usa). */
export function chaveDia(d) {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function haQuanto(desde, agora = new Date()) {
  const min = Math.max(0, Math.round((agora - desde) / 60000));
  if (min < 1) return "agora mesmo";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
