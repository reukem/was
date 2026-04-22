import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update } from "firebase/database";

const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || "PLACEHOLDER_KEY",
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || "PLACEHOLDER_DOMAIN",
  databaseURL: (import.meta as any).env.VITE_FIREBASE_DATABASE_URL || "PLACEHOLDER_URL",
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || "PLACEHOLDER_ID",
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || "PLACEHOLDER_BUCKET",
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || "PLACEHOLDER_SENDER_ID",
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || "PLACEHOLDER_APP_ID"
};

let app;
let db: any;

try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

export const updateItemState = (id: string, chemicalId: string, position: [number, number, number], volume: number, temperature: number, color?: string) => {
  if (!db) return;
  const itemRef = ref(db, 'labSession/items/' + id);
  update(itemRef, {
    chemicalId,
    position: {
      x: position[0],
      y: position[1],
      z: position[2]
    },
    volume,
    temperature,
    color
  });
};

export const removeItem = (id: string) => {
  if (!db) return;
  const itemRef = ref(db, 'labSession/items/' + id);
  set(itemRef, null);
};

export const onItemsUpdate = (callback: (items: any) => void) => {
  if (!db) return () => {};
  const itemsRef = ref(db, 'labSession/items');
  return onValue(itemsRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
};

export default db;
