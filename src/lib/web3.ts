import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import axios from "axios";

// Project wallet address (Public key where $10 USD will be sent)
const DEFAULT_WALLET = "GqHuzouf9phsh5rpV9HfiBZSHhzDSajCT9w7Qr1VQTtj";
const envWallet = import.meta.env.VITE_SOLANA_PROJECT_WALLET;

// Validate if the environment variable is a non-empty string
const isValidEnvWallet = typeof envWallet === 'string' && envWallet.trim().length > 0;
const PROJECT_WALLET_STR = isValidEnvWallet ? envWallet.trim() : DEFAULT_WALLET;

let PROJECT_WALLET: PublicKey;

try {
  PROJECT_WALLET = new PublicKey(PROJECT_WALLET_STR);
} catch (e) {
  // If the key provided by the user is invalid, we log a warning but fall back to the default to keep the app functional
  const appName = import.meta.env.VITE_APP_NAME || "InstantRole";
  if (isValidEnvWallet) {
    console.warn(`[${appName}] Provided wallet address "${PROJECT_WALLET_STR}" is invalid. Falling back to default project wallet.`);
  }
  PROJECT_WALLET = new PublicKey(DEFAULT_WALLET);
}

export async function getSolPriceInUsd() {
  try {
    const response = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    return response.data.solana.usd;
  } catch (error) {
    console.error("Error fetching SOL price:", error);
    return 150; // Fallback price
  }
}

export async function connectWallet() {
  if ("solana" in window) {
    const provider = (window as any).solana;
    if (provider.isPhantom) {
      try {
        const response = await provider.connect();
        return response.publicKey.toString();
      } catch (err) {
        console.error("Wallet connection failed", err);
        return null;
      }
    }
  }
  window.open("https://phantom.app/", "_blank");
  return null;
}

export async function sendPayment(walletAddress: string, amountUsd: number) {
  if (!("solana" in window)) {
    throw new DOMException("Solana wallet not found", "NotFoundError");
  }
  
  const provider = (window as any).solana;
  const solPrice = await getSolPriceInUsd();
  const solAmount = amountUsd / solPrice;
  const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

  const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpcUrl);
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(walletAddress),
      toPubkey: PROJECT_WALLET,
      lamports: lamports,
    })
  );

  transaction.feePayer = new PublicKey(walletAddress);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  try {
    const { signature } = await provider.signAndSendTransaction(transaction);
    await connection.confirmTransaction(signature);
    return signature;
  } catch (error) {
    console.error("Payment failed", error);
    throw error;
  }
}
