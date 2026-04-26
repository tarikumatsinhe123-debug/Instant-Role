import React, { useState, useEffect, useCallback } from "react";
import { Search, Sparkles, Loader2, Wallet, ArrowRight, Zap, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { connectWallet } from "./lib/web3";
import { generateResumeAndCoverLetter } from "./lib/gemini";
import { ResumeViewer } from "./components/ResumeViewer";
import { PaymentModal } from "./components/PaymentModal";
import { cn } from "./lib/utils";

interface UserData {
  walletAddress: string;
  freeUsesCount: number;
  paidUsesAvailable: number;
}

export default function App() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [result, setResult] = useState<any>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    let gid = localStorage.getItem("guest_id");
    if (!gid) {
      gid = "guest_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("guest_id", gid);
    }
    setGuestId(gid);

    // Try auto-connecting wallet if previously used
    const lastWallet = localStorage.getItem("last_wallet");
    if (lastWallet && "solana" in window) {
      const provider = (window as any).solana;
      if (provider?.isPhantom) {
        provider.connect({ onlyIfTrusted: true })
          .then((resp: any) => setWallet(resp.publicKey.toString()))
          .catch(() => {});
      }
    }
  }, []);

  const fetchUserStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/user/${id}`);
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      }
    } catch (err) {
      console.error("Failed to fetch user status", err);
    }
  }, []);

  useEffect(() => {
    const id = wallet || guestId;
    if (id) {
      fetchUserStatus(id);
    }
    if (wallet) {
      localStorage.setItem("last_wallet", wallet);
    }
  }, [wallet, guestId, fetchUserStatus]);

  const handleConnect = async () => {
    const address = await connectWallet();
    if (address) {
      setWallet(address);
      localStorage.setItem("last_wallet", address);
    }
  };

  const freeLeft = Math.max(0, 5 - (userData?.freeUsesCount || 0));
  const paidLeft = userData?.paidUsesAvailable || 0;
  const canGenerate = freeLeft > 0 || paidLeft > 0;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = wallet || guestId;
    if (!id || loading) return;
    if (!jobTitle) return;

    // Ensure we have user data before proceeding if we think we might be blocked
    if (userData === null) {
      await fetchUserStatus(id);
    }

    if (!canGenerate) {
      setPaywallOpen(true);
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const usageRes = await fetch("/api/usage/increment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!usageRes.ok) {
        if (usageRes.status === 403) {
          setPaywallOpen(true);
        }
        throw new Error("Usage limit reached");
      }

      const newUserStatus = await usageRes.json();
      setUserData(newUserStatus);
      
      const data = await generateResumeAndCoverLetter(jobTitle);
      setResult(data);
    } catch (err: any) {
      console.error("Generation failed", err);
      if (err.message !== "Usage limit reached") {
        alert("Something went wrong during generation. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col selection:bg-slate-200">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-10 py-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <Sparkles size={16} className="text-white" fill="currentColor" />
          </div>
          <span className="text-xl font-bold tracking-tight">{import.meta.env.VITE_APP_NAME || "InstantRole"}</span>
        </div>
        
        <div className="flex items-center gap-6">
          {(wallet || guestId) && (
            <div className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center">
              <span className={cn(
                "inline-block w-2 h-2 rounded-full mr-2",
                canGenerate ? "bg-green-400" : "bg-red-400 animate-pulse"
              )}></span>
              {paidLeft > 0 
                ? `PRO CREDIT: ${paidLeft} LEFT` 
                : freeLeft > 0 
                  ? `${freeLeft} FREE TRIALS LEFT` 
                  : "OUT OF CREDITS"}
            </div>
          )}
          
          <button 
            onClick={handleConnect}
            className="px-5 py-2 bg-black text-white text-sm font-medium rounded-full hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            <Wallet size={14} />
            {wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : "Connect Wallet"}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-20 px-10 pb-20 overflow-hidden">
        <div className="w-full max-w-2xl text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-extrabold tracking-tight text-slate-900 mb-4"
          >
            Your next career move,<br/>
            <span className="text-slate-400 font-medium">instantly drafted.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 text-lg"
          >
            Enter a job title. AI generates a tailored resume and cover letter in seconds.
          </motion.p>
        </div>

        {/* Search Area */}
        <div className="w-full max-w-3xl mb-20">
          <form onSubmit={handleGenerate} className="relative flex items-center">
            <input 
              type="text" 
              placeholder="e.g. Senior Full-Stack Developer at Stripe" 
              className="w-full h-20 pl-8 pr-44 rounded-2xl bg-white border-0 shadow-2xl shadow-slate-200 text-xl focus:ring-2 focus:ring-black outline-none placeholder:text-slate-300 transition-all font-medium"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
            <button 
              type="submit"
              disabled={loading}
              className="absolute right-3 h-14 px-8 bg-black text-white font-semibold rounded-xl hover:bg-slate-800 transition-all disabled:bg-slate-200 flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span>Generate</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <div className="mt-6 flex justify-center gap-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Powered by Gemini Pro</span>
            <span className="text-slate-300">|</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {paidLeft > 0 
                ? `${paidLeft} Paid Credit Available` 
                : freeLeft > 0 
                  ? `${freeLeft} Free Drafts Available` 
                  : "Credit Expired"}
            </span>
          </div>
        </div>

        {/* Dynamic Result Area */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center py-10"
              >
                <div className="w-12 h-12 border-2 border-slate-100 border-t-slate-900 rounded-full animate-spin mb-4" />
                <p className="text-sm text-slate-400 font-medium tracking-wide">DRAFTING YOUR FUTURE...</p>
              </motion.div>
            ) : result ? (
              <ResumeViewer key="result" data={result} />
            ) : (
              /* Benefits Grid */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-4xl opacity-80">
                <div className="space-y-2">
                  <div className="text-slate-900 font-bold uppercase text-[10px] tracking-widest">Tailored Content</div>
                  <p className="text-sm text-slate-500 leading-relaxed">Industry-standard keywords and performance-based experience bullet points.</p>
                </div>
                <div className="space-y-2">
                  <div className="text-slate-900 font-bold uppercase text-[10px] tracking-widest">No Upfront Cost</div>
                  <p className="text-sm text-slate-500 leading-relaxed">Get your first five drafts absolutely free. No wallet connection needed initially.</p>
                </div>
                <div className="space-y-2">
                  <div className="text-slate-900 font-bold uppercase text-[10px] tracking-widest">Pay-As-You-Go</div>
                  <p className="text-sm text-slate-500 leading-relaxed">Go beyond the 5-free trial for just $1.99 per professional draft. Higher accuracy than free tools.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Subtle Trial Toast */}
      {(wallet || guestId) && paidLeft === 0 && (
        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="fixed bottom-32 right-10 z-30 bg-white border border-slate-200 shadow-2xl p-5 rounded-2xl flex items-center gap-4 max-w-xs"
        >
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
            freeLeft > 0 ? "bg-slate-50 text-slate-400" : "bg-red-50 text-red-500"
          )}>
            {freeLeft > 0 ? <Zap size={20} /> : <ShieldCheck size={20} />}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">{freeLeft > 0 ? "Free Trial Active" : "Trial Limit Reached"}</p>
            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
              {freeLeft > 0 
                ? `You have ${freeLeft} ${freeLeft === 1 ? "generation" : "generations"} left. No wallet needed yet.`
                : "Connect wallet and pay per use for continued access."
              }
            </p>
          </div>
        </motion.div>
      )}

      {/* Footer Status Bar */}
      <footer className="w-full px-10 py-10 border-t border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-sm mt-20">
        <div className="flex items-center gap-8 text-[10px] font-bold text-slate-400 tracking-[0.1em]">
          <span className="flex items-center gap-2 uppercase">
            <div className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
            System Status: Healthy
          </span>
          <span className="flex items-center gap-2 uppercase">
            Network: Mainnet-Beta
          </span>
          <span className="text-slate-200 text-lg font-light">|</span>
          <button 
            onClick={() => {
              if (confirm("Resetting the session will clear your trial data. Proceed?")) {
                localStorage.removeItem("guest_id");
                localStorage.removeItem("last_wallet");
                window.location.reload();
              }
            }}
            className="hover:text-slate-900 transition-colors cursor-pointer uppercase underline underline-offset-4 decoration-slate-200 hover:decoration-slate-900"
          >
            Reset Session
          </button>
        </div>
        <div className="text-[10px] font-bold text-slate-300 tracking-[0.2em] uppercase">
          &copy; {new Date().getFullYear()} {import.meta.env.VITE_APP_NAME || "InstantRole"}. Professional AI Drafting.
        </div>
      </footer>

      <PaymentModal 
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        walletAddress={wallet || ""}
        onSuccess={(address) => {
          setWallet(address);
          fetchUserStatus(address);
        }}
      />
    </div>
  );
}

