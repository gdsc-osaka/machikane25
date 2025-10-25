import { vi } from "vitest";

// Mock Firebase Auth user
export const mockFirebaseUser = {
  uid: "test-user-id",
  email: null,
  emailVerified: false,
  isAnonymous: true,
  metadata: {},
  providerData: [],
  refreshToken: "mock-refresh-token",
  tenantId: null,
  delete: vi.fn(),
  getIdToken: vi.fn(() => Promise.resolve("mock-id-token")),
  getIdTokenResult: vi.fn(),
  reload: vi.fn(),
  toJSON: vi.fn(),
};

// Mock Firebase Auth
export const mockFirebaseAuth = {
  currentUser: mockFirebaseUser,
  signInAnonymously: vi.fn(() =>
    Promise.resolve({ user: mockFirebaseUser }),
  ),
  signOut: vi.fn(() => Promise.resolve()),
  onAuthStateChanged: vi.fn((callback) => {
    // Immediately invoke callback with mock user
    callback(mockFirebaseUser);
    // Return unsubscribe function
    return vi.fn();
  }),
};

// Mock Firestore document reference
export const createMockDocRef = (id: string, data: any) => ({
  id,
  path: `visitorSessions/${id}`,
  exists: () => data !== null,
  data: () => data,
  get: vi.fn(() =>
    Promise.resolve({
      id,
      exists: () => data !== null,
      data: () => data,
    }),
  ),
});

// Mock Firestore collection reference
export const createMockCollectionRef = (collectionName: string, docs: any[]) => ({
  path: collectionName,
  doc: vi.fn((id) => createMockDocRef(id, docs.find((d) => d.id === id))),
  where: vi.fn(() => createMockCollectionRef(collectionName, docs)),
  orderBy: vi.fn(() => createMockCollectionRef(collectionName, docs)),
  limit: vi.fn(() => createMockCollectionRef(collectionName, docs)),
  get: vi.fn(() =>
    Promise.resolve({
      empty: docs.length === 0,
      size: docs.length,
      docs: docs.map((doc) => ({
        id: doc.id,
        exists: () => true,
        data: () => doc,
      })),
    }),
  ),
});

// Mock Firestore
export const mockFirestore = {
  collection: vi.fn((name: string) => createMockCollectionRef(name, [])),
  doc: vi.fn((path: string) => {
    const [collection, id] = path.split("/");
    return createMockDocRef(id, null);
  }),
  runTransaction: vi.fn((callback) => callback(mockFirestore)),
  batch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(() => Promise.resolve()),
  })),
};

// Mock Firebase Storage reference
export const createMockStorageRef = (path: string) => ({
  bucket: "mock-bucket",
  fullPath: path,
  name: path.split("/").pop(),
  parent: null,
  root: null,
  storage: null,
  toString: () => path,
  put: vi.fn((data: any, metadata?: any) =>
    Promise.resolve({
      ref: createMockStorageRef(path),
      metadata: {
        ...metadata,
        fullPath: path,
        size: data.size || data.length || 0,
        timeCreated: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      state: "success",
      bytesTransferred: data.size || data.length || 0,
      totalBytes: data.size || data.length || 0,
    }),
  ),
  putString: vi.fn((data: string, format?: string, metadata?: any) =>
    Promise.resolve({
      ref: createMockStorageRef(path),
      metadata: {
        ...metadata,
        fullPath: path,
        size: data.length,
        timeCreated: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
      state: "success",
      bytesTransferred: data.length,
      totalBytes: data.length,
    }),
  ),
  getDownloadURL: vi.fn(() =>
    Promise.resolve(`https://storage.example.com/${path}`),
  ),
  delete: vi.fn(() => Promise.resolve()),
  getMetadata: vi.fn(() =>
    Promise.resolve({
      fullPath: path,
      name: path.split("/").pop(),
      bucket: "mock-bucket",
      generation: "1",
      metageneration: "1",
      size: 1024,
      timeCreated: new Date().toISOString(),
      updated: new Date().toISOString(),
      contentType: "image/jpeg",
    }),
  ),
});

// Mock Firebase Storage
export const mockStorage = {
  ref: vi.fn((path?: string) => createMockStorageRef(path || "")),
  refFromURL: vi.fn((url: string) => {
    const path = url.replace("https://storage.example.com/", "");
    return createMockStorageRef(path);
  }),
};

// Mock Firebase Remote Config
export const mockRemoteConfig = {
  settings: {
    fetchTimeMillis: Date.now(),
    minimumFetchIntervalMillis: 3600000,
  },
  defaultConfig: {},
  fetchTimeMillis: Date.now(),
  getValue: vi.fn((key: string) => ({
    asString: () => "{}",
    asNumber: () => 0,
    asBoolean: () => false,
    getSource: () => "default",
  })),
  getString: vi.fn((key: string) => "{}"),
  getNumber: vi.fn((key: string) => 0),
  getBoolean: vi.fn((key: string) => false),
  fetchAndActivate: vi.fn(() => Promise.resolve(true)),
  fetch: vi.fn(() => Promise.resolve()),
  activate: vi.fn(() => Promise.resolve(true)),
  setDefaults: vi.fn(),
};

// Mock Firebase app
export const mockFirebaseApp = {
  name: "[DEFAULT]",
  options: {
    apiKey: "mock-api-key",
    authDomain: "mock-auth-domain",
    projectId: "mock-project-id",
    storageBucket: "mock-storage-bucket",
    messagingSenderId: "mock-messaging-sender-id",
    appId: "mock-app-id",
  },
  automaticDataCollectionEnabled: false,
};

// Export all mocks together
export const mockFirebaseClients = {
  app: mockFirebaseApp,
  auth: mockFirebaseAuth,
  firestore: mockFirestore,
  storage: mockStorage,
  remoteConfig: mockRemoteConfig,
};

// Helper to reset all mocks
export const resetFirebaseMocks = () => {
  vi.clearAllMocks();
  mockFirebaseAuth.currentUser = mockFirebaseUser;
};
