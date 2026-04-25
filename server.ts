import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

const USERS_DB = "users.json";

// Initialize DB if not exists
if (!fs.existsSync(USERS_DB)) {
  fs.writeFileSync(USERS_DB, JSON.stringify({}));
}

function getUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_DB, "utf-8"));
  } catch (err) {
    return {};
  }
}

function saveUsers(users: any) {
  fs.writeFileSync(USERS_DB, JSON.stringify(users, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/user/:walletAddress", (req, res) => {
    const { walletAddress } = req.params;
    const users = getUsers();
    const user = users[walletAddress.toLowerCase()] || {
      walletAddress,
      freeUsesCount: 0,
      subscriptionExpiry: null,
    };
    res.json(user);
  });

  app.post("/api/usage/increment", (req, res) => {
    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ error: "Wallet address required" });

    const users = getUsers();
    const key = walletAddress.toLowerCase();
    
    if (!users[key]) {
      users[key] = { walletAddress, freeUsesCount: 0, subscriptionExpiry: null };
    }

    // Double check subscription
    const isSubscribed = users[key].subscriptionExpiry && new Date(users[key].subscriptionExpiry) > new Date();

    if (!isSubscribed && users[key].freeUsesCount >= 3) {
      return res.status(403).json({ error: "Free limit reached. Subscription required." });
    }

    if (!isSubscribed) {
      users[key].freeUsesCount += 1;
    }
    
    saveUsers(users);
    res.json(users[key]);
  });

  app.post("/api/subscription/confirm", (req, res) => {
    const { walletAddress, txSignature } = req.body; // txSignature for "verification" (simplified for demo)
    if (!walletAddress) return res.status(400).json({ error: "Wallet address required" });

    const users = getUsers();
    const key = walletAddress.toLowerCase();
    
    if (!users[key]) {
      users[key] = { walletAddress, freeUsesCount: 0, subscriptionExpiry: null };
    }

    // Set expiry to 30 days from now
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    users[key].subscriptionExpiry = expiry.toISOString();
    
    saveUsers(users);
    res.json(users[key]);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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

startServer();
