/**
 * Configuração da aplicação.
 *
 * mode: "demo"     Tudo fica guardado no navegador (localStorage). Não precisa de servidor
 *                  nem de conta. É o modo usado na demonstração pública.
 * mode: "firebase" Usa Firebase Authentication e Cloud Firestore. Preencha o objeto
 *                  `firebase` com os dados do SEU projeto (Consola Firebase, Definições do
 *                  projeto, As suas apps). Veja o README, secção "Usar com Firebase".
 */
export const CONFIG = {
  mode: "demo",

  /** Credenciais aceites no modo demonstração. Não são segredo: aparecem no ecrã de login. */
  demo: {
    email: "demo@controle-acesso.app",
    password: "demo1234",
  },

  /** Quantos dias de registos a aplicação carrega (modo firebase). */
  diasCarregados: 30,

  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  },
};
