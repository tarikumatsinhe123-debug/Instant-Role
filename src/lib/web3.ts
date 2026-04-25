import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import axios from "axios";

// Project wallet address (Public key where $10 USD will be sent)
const PROJECT_WALLET = new PublicKey("9xQeWvG816bSR9EPfZA6z4PZ1Z2A5Vv9C7v7z8x9y7zB"); // Example placeholder

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
  if (!("solana" in window)) throw new Error("Solana wallet not found");
  
  const provider = (window as any).solana;
  const solPrice = await getSolPriceInUsd();
  const solAmount = amountUsd / solPrice;
  const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

  const connection = new Connection("https://api.mainnet-beta.solana.com");
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
