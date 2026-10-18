/**
 * Service worker.
 *
 * - Pré-carrega o "shell" da aplicação (HTML, CSS, JS, fontes, ícones) para abrir offline.
 * - HTML e dados: rede primeiro, cache como reserva (assim as atualizações chegam logo).
 * - Restantes ficheiros: cache primeiro, atualizando em segundo plano.
 * - Só intercepta pedidos GET. Pedidos ao Firebase não passam por aqui.
 *
 * Ao mudar qualquer ficheiro da lista, aumente VERSAO.
 */
const VERSAO = "v2.0.0";
const CACHE = `controle-acesso-${VERSAO}`;

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./js/app.js",
  "./js/config.js",
  "./js/lib/csv.js",
  "./js/lib/format.js",
  "./js/lib/stats.js",
  "./js/lib/text.js",
  "./js/store/index.js",
  "./js/store/local.js",
  "./js/store/firebase.js",
  "./js/store/seed.js",
  "./js/ui/dialog.js",
  "./js/ui/dom.js",
  "./js/ui/toast.js",
  "./data/autorizados.json",
  "./assets/fonts/barlow-latin-400-normal.woff2",
  "./assets/fonts/barlow-latin-600-normal.woff2",
  "./assets/fonts/barlow-latin-700-normal.woff2",
  "./assets/fonts/barlow-condensed-latin-600-normal.woff2",
  "./assets/fonts/barlow-condensed-latin-700-normal.woff2",
  "./assets/icons/favicon.svg",
  "./assets/icons/favicon-32.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
];

self.addEventListener("install", (evento) => {
  // Se um ficheiro falhar, a instalação falha e o worker antigo continua ativo.
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;
  const url = new URL(pedido.url);

  // O SDK do Firebase (versão fixa no URL) pode ficar em cache para o modo offline.
  const sdkFirebase = url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/");
  if (url.origin !== self.location.origin && !sdkFirebase) return;

  const redePrimeiro = pedido.mode === "navigate" || url.pathname.endsWith(".json") || url.pathname.endsWith(".html");
  evento.respondWith(redePrimeiro ? redeDepoisCache(pedido) : cacheDepoisRede(pedido));
});

async function redeDepoisCache(pedido) {
  const cache = await caches.open(CACHE);
  try {
    const resposta = await fetch(pedido);
    if (resposta.ok) cache.put(pedido, resposta.clone());
    return resposta;
  } catch {
    return (await cache.match(pedido, { ignoreSearch: true })) ?? (await cache.match("./index.html"));
  }
}

async function cacheDepoisRede(pedido) {
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(pedido);
  const rede = fetch(pedido)
    .then((resposta) => {
      if (resposta.ok) cache.put(pedido, resposta.clone());
      return resposta;
    })
    .catch(() => null);
  return guardado ?? (await rede) ?? Response.error();
}
