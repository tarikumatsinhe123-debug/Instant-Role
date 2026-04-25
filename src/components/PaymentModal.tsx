import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Zap, Wallet, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getSolPriceInUsd, sendPayment, connectWallet } from "../lib/web3";
import { cn } from "../lib/utils";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, walletAddress, onSuccess }) => {
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<"SOL" | "ETH" | "BTC">("SOL");

  useEffect(() => {
    if (isOpen) {
      getSolPriceInUsd().then(setSolPrice);
    }
  }, [isOpen]);

  const handlePayment = async () => {
    if (selectedAsset !== "SOL") {
      setError(`${selectedAsset} payments are coming soon. Please use SOL for now.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (!walletAddress) {
        const address = await connectWallet();
        if (!address) return;
        // The parent App will receive the wallet update via its own connect logic if we were using a context, 
        // but here we just need it for the transaction. 
        // Actually, it's better to tell the user to connect via the main button or we just handle it here.
        // Let's just prompt them or use the imported connectWallet.
        return; 
      }
      const signature = await sendPayment(walletAddress, 10);
      const res = await fetch("/api/subscription/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, txSignature: signature }),
      });
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        throw new DOMException("Failed to confirm subscription on server", "AbortError");
      }
    } catch (err: any) {
      setError(err.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const solNeeded = solPrice ? (10 / solPrice).toFixed(4) : "...";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)]"
        >
          <div className="p-10">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-slate-50 rounded-full transition-colors group"
            >
              <X size={20} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
            </button>

            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-900 text-white rounded-2xl mb-6 shadow-xl shadow-slate-900/20">
                <Zap size={28} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Unlock Infinite Roles</h2>
              <p className="text-slate-400 mt-2 text-sm font-medium">Professional grade templates for the modern workforce.</p>
            </div>

            <div className="space-y-6 mb-10">
              <div className="grid grid-cols-3 gap-3">
                {(["SOL", "ETH", "BTC"] as const).map((asset) => (
                  <button
                    key={asset}
                    onClick={() => setSelectedAsset(asset)}
                    className={cn(
                      "py-3 rounded-xl text-xs font-bold transition-all border",
                      selectedAsset === asset 
                        ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20" 
                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                    )}
                  >
                    {asset}
                  </button>
                ))}
              </div>

              <div className="p-6 bg-slate-50 rounded-3xl space-y-4 border border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subscription cost</span>
                  <span className="text-lg font-bold text-slate-900">$10.00 <span className="text-xs font-medium text-slate-400">/mo</span></span>
                </div>
                <div className="h-[1px] bg-slate-200/50 w-full" />
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-slate-500">Amount in {selectedAsset}</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {selectedAsset === "SOL" ? `≈ ${solNeeded} SOL` : "Calculating..."}
                  </span>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-xs text-slate-400 font-medium leading-relaxed bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50">
                <ShieldCheck className="text-blue-500 mt-0.5 shrink-0" size={16} />
                <p>Transactions are secured on-chain. Your subscription will be active instantly upon confirmation.</p>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-4 bg-red-50 text-red-600 text-[11px] font-bold rounded-2xl mb-6 text-center border border-red-100 uppercase tracking-wider"
              >
                {error}
              </motion.div>
            )}

            <button
              onClick={handlePayment}
              disabled={loading || (selectedAsset === "SOL" && !solPrice)}
              className={cn(
                "w-full py-5 rounded-[1.5rem] font-bold text-white transition-all flex items-center justify-center space-x-3 shadow-2xl shadow-slate-900/20",
                loading ? "bg-slate-300 pointer-events-none" : 
                !walletAddress ? "bg-slate-500 hover:bg-slate-600" : "bg-slate-900 hover:bg-black active:scale-[0.98]"
              )}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Wallet size={18} />
                  <span>{!walletAddress ? "Connect Wallet to Pay" : `Subscribe via ${selectedAsset}`}</span>
                </>
              )}
            </button>
            <p className="text-center text-[10px] font-bold text-slate-300 mt-6 uppercase tracking-[0.2em]">
              Powered by Live Price Feeds
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

