import { FirebaseOptions, initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import {
  Auth,
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
} from "firebase/auth";
import {
  Firestore,
  connectFirestoreEmulator,
  getFirestore,
} from "firebase/firestore";
import {
  Functions,
  connectFunctionsEmulator,
  getFunctions,
} from "firebase/functions";
import {
  FirebaseStorage,
  connectStorageEmulator,
  getStorage,
} from "firebase/storage";
import { RemoteConfig, getRemoteConfig } from "firebase/remote-config";
import { getLogger } from "@/packages/logger";

type FirebaseClients = Readonly<{
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
  functions: Functions;
  remoteConfig: RemoteConfig;
}>;

type EmulatorPorts = {
  auth: number;
  firestore: number;
  storage: number;
  functions: number;
};

const dummyConfig: FirebaseOptions = {
  apiKey: "dummy",
  authDomain: "dummy.firebaseapp.com",
  projectId: "dummy",
  storageBucket: "dummy.appspot.com",
  messagingSenderId: "dummy",
  appId: "dummy",
};

const memoizedClients = new Map<string, Promise<FirebaseClients>>();
const anonymousSignInPromises = new Map<string, Promise<void>>();
const connectedEmulators = new Set<string>();

const readString = (source: object, key: string) => {
  const value = Reflect.get(source, key);
  return typeof value === "string" ? value : null;
};

const readNumber = (source: object, key: string) => {
  const value = Reflect.get(source, key);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const resolveAuthKey = (auth: Auth) => {
  const appCandidate = Reflect.get(auth, "app");
  if (typeof appCandidate === "object" && appCandidate !== null) {
    const nameCandidate = Reflect.get(appCandidate, "name");
    if (typeof nameCandidate === "string" && nameCandidate.length > 0) {
      return nameCandidate;
    }
  }
  return "default";
};

const parseFirebaseConfig = (): FirebaseOptions => {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  if (!raw) {
    getLogger().warn("NEXT_PUBLIC_FIREBASE_CONFIG is not defined, using dummy");
    return dummyConfig;
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      const apiKey = readString(parsed, "apiKey");
      const authDomain = readString(parsed, "authDomain");
      const projectId = readString(parsed, "projectId");
      const storageBucket = readString(parsed, "storageBucket");
      const messagingSenderId = readString(parsed, "messagingSenderId");
      const appId = readString(parsed, "appId");
      if (
        apiKey &&
        authDomain &&
        projectId &&
        storageBucket &&
        messagingSenderId &&
        appId
      ) {
        const measurementId = readString(parsed, "measurementId") ?? undefined;
        return {
          apiKey,
          authDomain,
          projectId,
          storageBucket,
          messagingSenderId,
          appId,
          measurementId,
        };
      }
    }
  } catch (error) {
    getLogger().error(error, "Failed to parse NEXT_PUBLIC_FIREBASE_CONFIG");
  }
  return dummyConfig;
};

const shouldUseEmulators = () =>
  process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true";

const parseEmulatorHost = () =>
  process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ?? "127.0.0.1";

const parseEmulatorPorts = (): EmulatorPorts => {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_PORTS;
  if (!raw) {
    return {
      auth: 9099,
      firestore: 8080,
      storage: 9199,
      functions: 5001,
    };
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return {
        auth: 9099,
        firestore: 8080,
        storage: 9199,
        functions: 5001,
      };
    }
    const authPort = readNumber(parsed, "auth");
    const firestorePort = readNumber(parsed, "firestore");
    const storagePort = readNumber(parsed, "storage");
    const functionsPort = readNumber(parsed, "functions");
    return {
      auth: authPort ?? 9099,
      firestore: firestorePort ?? 8080,
      storage: storagePort ?? 9199,
      functions: functionsPort ?? 5001,
    };
  } catch (error) {
    getLogger().error(error, "Failed to parse emulator ports, using defaults");
    return {
      auth: 9099,
      firestore: 8080,
      storage: 9199,
      functions: 5001,
    };
  }
};

const ensureAnonymousUser = (auth: Auth) => {
  if (auth.currentUser) {
    return Promise.resolve();
  }
  const key = resolveAuthKey(auth);
  const existing = anonymousSignInPromises.get(key);
  if (existing) {
    return existing;
  }
  const attempt = signInAnonymously(auth)
    .then(() => undefined)
    .catch((error) => {
      getLogger().error(error, "Failed to sign in anonymously");
      throw error;
    })
    .finally(() => {
      anonymousSignInPromises.delete(key);
    });
  anonymousSignInPromises.set(key, attempt);
  return attempt;
};

const connectEmulatorsIfNeeded = (
  auth: Auth,
  firestore: Firestore,
  storage: FirebaseStorage,
  functions: Functions,
) => {
  if (!shouldUseEmulators()) {
    return;
  }
  const host = parseEmulatorHost();
  const ports = parseEmulatorPorts();
  if (!connectedEmulators.has("auth")) {
    connectedEmulators.add("auth");
    connectAuthEmulator(auth, `http://${host}:${ports.auth}`, {
      disableWarnings: true,
    });
  }
  if (!connectedEmulators.has("firestore")) {
    connectedEmulators.add("firestore");
    connectFirestoreEmulator(firestore, host, ports.firestore);
  }
  if (!connectedEmulators.has("storage")) {
    connectedEmulators.add("storage");
    connectStorageEmulator(storage, host, ports.storage);
  }
  if (!connectedEmulators.has("functions")) {
    connectedEmulators.add("functions");
    connectFunctionsEmulator(functions, host, ports.functions);
  }
};

const createClients = async (): Promise<FirebaseClients> => {
  const app = initializeApp(parseFirebaseConfig());
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = getStorage(app);
  const functions = getFunctions(app);
  const remoteConfig = getRemoteConfig(app);
  connectEmulatorsIfNeeded(auth, firestore, storage, functions);
  await ensureAnonymousUser(auth);
  const clients: FirebaseClients = {
    app,
    auth,
    firestore,
    storage,
    functions,
    remoteConfig,
  };
  return clients;
};

export const getFirebaseClients = async (): Promise<FirebaseClients> => {
  const key = "photo";
  const existing = memoizedClients.get(key);
  if (existing) {
    return existing;
  }
  const creation = createClients();
  memoizedClients.set(key, creation);
  return creation;
};
