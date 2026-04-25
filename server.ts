import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Load Firebase config
function getFirebaseConfig() {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch (err) {
      console.error("Error parsing firebase-applet-config.json", err);
    }
  }
  
  return {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || "(default)",
  };
}

const firebaseConfig = getFirebaseConfig();
let db: any = null;

if (firebaseConfig.apiKey) {
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  } catch (err) {
    console.error("Firebase initialization failed:", err);
  }
} else {
  console.warn("Firebase config missing. Some features will not work.");
}

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string }) : null;

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null // Server is unauthenticated in this setup
    },
    operationType,
    path
  };
  const jsonError = JSON.stringify(errInfo);
  console.error('Firestore Error: ', jsonError);
  throw new Error(jsonError);
}

const app = express();
app.use(express.json());

if (process.env.VERCEL) {
  console.warn("Running on Vercel.");
}

// API Routes
app.get("/api/user/:id", async (req, res) => {
  const { id } = req.params;
  const key = id.toLowerCase();

  if (!db) return res.json({ 
    walletAddress: id.startsWith("guest_") ? null : id, 
    id: key, 
    freeUsesCount: 0, 
    subscriptionExpiry: null 
  });
  
  try {
    const userDoc = await getDoc(doc(db, "users", key));
    if (userDoc.exists()) {
      res.json(userDoc.data());
    } else {
      res.json({
        walletAddress: id.startsWith("guest_") ? null : id,
        id: key,
        freeUsesCount: 0,
        subscriptionExpiry: null,
      });
    }
  } catch (error) {
    console.error("Firestore Get Error:", error);
    res.status(500).json({ error: "Failed to fetch user status", details: String(error) });
  }
});

app.post("/api/usage/increment", async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "User ID required" });

  if (!db) return res.status(500).json({ error: "Database not connected" });

  const key = id.toLowerCase();
  const userRef = doc(db, "users", key);

  try {
    const userDoc = await getDoc(userRef);
    let userData = userDoc.exists() ? userDoc.data() : { 
      walletAddress: id.startsWith("guest_") ? null : id,
      id: key,
      freeUsesCount: 0, 
      subscriptionExpiry: null 
    };

    // Double check subscription
    const isSubscribed = userData.subscriptionExpiry && new Date(userData.subscriptionExpiry) > new Date();

    if (!isSubscribed && userData.freeUsesCount >= 3) {
      return res.status(403).json({ error: "Free limit reached. Subscription required." });
    }

    if (!userDoc.exists()) {
      userData.freeUsesCount = 1;
      await setDoc(userRef, userData);
    } else if (!isSubscribed) {
      await updateDoc(userRef, {
        freeUsesCount: increment(1)
      });
      userData.freeUsesCount += 1;
    }
    
    res.json(userData);
  } catch (error) {
    console.error("Firestore Increment Error:", error);
    res.status(500).json({ error: "Failed to update usage", details: String(error) });
  }
});

app.post("/api/subscription/confirm", async (req, res) => {
  const { walletAddress } = req.body;
  if (!walletAddress) return res.status(400).json({ error: "Wallet address required" });

  if (!db) return res.status(500).json({ error: "Database not connected" });

  const key = walletAddress.toLowerCase();
  const userRef = doc(db, "users", key);

  try {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    const subscriptionExpiry = expiry.toISOString();

    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      await updateDoc(userRef, { subscriptionExpiry });
    } else {
      await setDoc(userRef, {
        walletAddress,
        id: key,
        freeUsesCount: 0,
        subscriptionExpiry
      });
    }

    const updatedDoc = await getDoc(userRef);
    res.json(updatedDoc.data());
  } catch (error) {
    console.error("Firestore Confirm Error:", error);
    res.status(500).json({ error: "Failed to confirm subscription", details: String(error) });
  }
});

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Relative to the server script
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.warn("Dist folder not found. This is expected in development mode.");
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}

export default app;

