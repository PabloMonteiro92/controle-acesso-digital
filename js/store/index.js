import { CONFIG } from "../config.js";
import { localStore } from "./local.js";
import { firebaseStore } from "./firebase.js";

/** Escolhe o adaptador conforme CONFIG.mode. O resto da aplicação só conhece este objeto. */
export const store = CONFIG.mode === "firebase" ? firebaseStore : localStore;
