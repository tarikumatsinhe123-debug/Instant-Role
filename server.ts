import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";

dotenv.config();

// Load Firebase config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf-8"));
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const app = express();
app.use(express.json());

if (process.env.VERCEL) {
  console.warn("WARNING: Running on Vercel. Database state is managed via Firestore.");
}

// API Routes
app.get("/api/user/:walletAddress", async (req, res) => {
  const { walletAddress } = req.params;
  const key = walletAddress.toLowerCase();
  
  try {
    const userDoc = await getDoc(doc(db, "users", key));
    if (userDoc.exists()) {
      res.json(userDoc.data());
    } else {
      res.json({
        walletAddress,
        freeUsesCount: 0,
        subscriptionExpiry: null,
      });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.post("/api/usage/increment", async (req, res) => {
  const { walletAddress } = req.body;
  if (!walletAddress) return res.status(400).json({ error: "Wallet address required" });

  const key = walletAddress.toLowerCase();
  const userRef = doc(db, "users", key);

  try {
    const userDoc = await getDoc(userRef);
    let userData = userDoc.exists() ? userDoc.data() : { 
      walletAddress, 
      freeUsesCount: 0, 
      subscriptionExpiry: null 
    };

    if (!userDoc.exists()) {
      await setDoc(userRef, userData);
    }

    // Double check subscription
    const isSubscribed = userData.subscriptionExpiry && new Date(userData.subscriptionExpiry) > new Date();

    if (!isSubscribed && userData.freeUsesCount >= 3) {
      return res.status(403).json({ error: "Free limit reached. Subscription required." });
    }

    if (!isSubscribed) {
      await updateDoc(userRef, {
        freeUsesCount: increment(1)
      });
      userData.freeUsesCount += 1;
    }
    
    res.json(userData);
  } catch (error) {
    console.error("Error incrementing usage:", error);
    res.status(500).json({ error: "Failed to update usage" });
  }
});

app.post("/api/subscription/confirm", async (req, res) => {
  const { walletAddress, txSignature } = req.body;
  if (!walletAddress) return res.status(400).json({ error: "Wallet address required" });

  const key = walletAddress.toLowerCase();
  const userRef = doc(db, "users", key);

  try {
    // Set expiry to 30 days from now
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    const subscriptionExpiry = expiry.toISOString();

    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      await updateDoc(userRef, { subscriptionExpiry });
    } else {
      await setDoc(userRef, {
        walletAddress,
        freeUsesCount: 0,
        subscriptionExpiry
      });
    }

    const updatedDoc = await getDoc(userRef);
    res.json(updatedDoc.data());
  } catch (error) {
    console.error("Error confirming subscription:", error);
    res.status(500).json({ error: "Failed to confirm subscription" });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// In standard environments, start the server
// In Vercel, this file will be imported and we export the app
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}

export default app;
