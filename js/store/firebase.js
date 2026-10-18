import { CONFIG } from "../config.js";
import { normalizar } from "../lib/text.js";

/**
 * Adaptador Firebase (Authentication + Cloud Firestore).
 * O SDK é carregado só quando este modo está ativo, por isso a demonstração
 * não faz nenhum pedido a servidores externos.
 *
 * Coleções:
 *   registros    { nome, placa, tipo, observacao, usuario, autorizado, ts, criadoEm }
 *   autorizados  { nome, nomeNorm, empresa }
 * As regras de segurança estão em firestore.rules.
 */

const VERSAO_SDK = "10.12.0";
const BASE = `https://www.gstatic.com/firebasejs/${VERSAO_SDK}`;
const LIMITE_REGISTOS = 2000;

let fb; // módulos do SDK
let auth;
let db;

export const firebaseStore = {
  mode: "firebase",

  async init() {
    const { firebase: cfg } = CONFIG;
    if (!cfg.apiKey || !cfg.projectId) {
      throw new Error("Firebase não configurado. Preencha CONFIG.firebase em js/config.js.");
    }
    const [app, authMod, fsMod] = await Promise.all([
      import(`${BASE}/firebase-app.js`),
      import(`${BASE}/firebase-auth.js`),
      import(`${BASE}/firebase-firestore.js`),
    ]);
    fb = { ...authMod, ...fsMod };
    const inst = app.initializeApp(cfg);
    auth = fb.getAuth(inst);
    // Cache persistente: é isto que permite registar sem rede e sincronizar depois.
    db = fb.initializeFirestore(inst, {
      localCache: fb.persistentLocalCache({ tabManager: fb.persistentMultipleTabManager() }),
    });
  },

  onAuthChange(cb) {
    return fb.onAuthStateChanged(auth, (u) => cb(u ? { email: u.email } : null));
  },

  login: (email, password) => fb.signInWithEmailAndPassword(auth, email, password),
  logout: () => fb.signOut(auth),

  subscribeRegistos(cb) {
    const desde = new Date(Date.now() - CONFIG.diasCarregados * 86400000);
    const q = fb.query(
      fb.collection(db, "registros"),
      fb.where("ts", ">=", fb.Timestamp.fromDate(desde)),
      fb.orderBy("ts", "desc"),
      fb.limit(LIMITE_REGISTOS),
    );
    return fb.onSnapshot(q, (snap) => {
      cb(
        snap.docs.map((d) => {
          const v = d.data({ serverTimestamps: "estimate" });
          return { id: d.id, ...v, ts: v.ts.toDate() };
        }),
      );
    });
  },

  async addRegisto(dados) {
    await fb.addDoc(fb.collection(db, "registros"), {
      ...dados,
      // A hora vem do dispositivo para funcionar offline; criadoEm vem do servidor para auditoria.
      ts: fb.Timestamp.fromDate(new Date()),
      criadoEm: fb.serverTimestamp(),
    });
  },

  subscribeAutorizados(cb) {
    const q = fb.query(fb.collection(db, "autorizados"), fb.orderBy("nomeNorm"));
    return fb.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  },

  addAutorizado: ({ nome, empresa }) =>
    fb.addDoc(fb.collection(db, "autorizados"), { nome, nomeNorm: normalizar(nome), empresa }),

  removeAutorizado: (id) => fb.deleteDoc(fb.doc(db, "autorizados", id)),

  async importarAutorizados(lista) {
    // O Firestore aceita no máximo 500 operações por batch.
    for (let i = 0; i < lista.length; i += 400) {
      const lote = fb.writeBatch(db);
      for (const a of lista.slice(i, i + 400)) {
        lote.set(fb.doc(fb.collection(db, "autorizados")), {
          nome: a.nome,
          nomeNorm: normalizar(a.nome),
          empresa: a.empresa ?? "",
        });
      }
      await lote.commit();
    }
  },
};
