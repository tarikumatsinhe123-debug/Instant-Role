import React, { useState, useEffect, useCallback } from "react";
import { Search, Sparkles, Loader2, Wallet, ArrowRight, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { connectWallet } from "./lib/web3";
import { generateResumeAndCoverLetter } from "./lib/gemini";
import { ResumeViewer } from "./components/ResumeViewer";
import { PaymentModal } from "./components/PaymentModal";
import { cn } from "./lib/utils";

interface UserData {
  walletAddress: string;
  freeUsesCount: number;
  subscriptionExpiry: string | null;
}

export default function App() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [result, setResult] = useState<any>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const fetchUserStatus = useCallback(async (address: string) => {
    try {
      const res = await fetch(`/api/user/${address}`);
      const data = await res.json();
      setUserData(data);
    } catch (err) {
      console.error("Failed to fetch user status", err);
    }
  }, []);

  useEffect(() => {
    if (wallet) {
      fetchUserStatus(wallet);
    }
  }, [wallet, fetchUserStatus]);

  const handleConnect = async () => {
    const address = await connectWallet();
    if (address) {
      setWallet(address);
    }
  };

  const isSubscribed = userData?.subscriptionExpiry && new Date(userData.subscriptionExpiry) > new Date();
  const freeLeft = Math.max(0, 3 - (userData?.freeUsesCount || 0));
  const canGenerate = isSubscribed || freeLeft > 0;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) {
      handleConnect();
      return;
    }
    if (!jobTitle) return;

    if (!canGenerate && !isSubscribed) {
      setPaywallOpen(true);
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const usageRes = await fetch("/api/usage/increment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet }),
      });

      if (!usageRes.ok) {
        setPaywallOpen(true);
        throw new Error("Usage limit reached");
      }

      const newUserStatus = await usageRes.json();
      setUserData(newUserStatus);
      
      const data = await generateResumeAndCoverLetter(jobTitle);
      setResult(data);
    } catch (err) {
      console.error("Generation failed", err);
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
          {wallet && (
            <div className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center">
              <span className={cn(
                "inline-block w-2 h-2 rounded-full mr-2",
                canGenerate ? "bg-green-400" : "bg-red-400 animate-pulse"
              )}></span>
              {isSubscribed ? "PRO ACCESS" : `${freeLeft} Trial Credits Remaining`}
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
      <main className="flex-1 flex flex-col items-center pt-20 px-10 pb-20">
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secure on Solana</span>
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
              <div className="grid grid-cols-3 gap-12 w-full max-w-4xl opacity-80">
                <div className="space-y-2">
                  <div className="text-slate-900 font-bold uppercase text-[10px] tracking-widest">Tailored Content</div>
                  <p className="text-sm text-slate-500 leading-relaxed">Industry-standard keywords and performance-based experience bullet points.</p>
                </div>
                <div className="space-y-2">
                  <div className="text-slate-900 font-bold uppercase text-[10px] tracking-widest">Crypto Ready</div>
                  <p className="text-sm text-slate-500 leading-relaxed">One-click $10 USD monthly subscription paid in SOL, ETH, or BTC.</p>
                </div>
                <div className="space-y-2">
                  <div className="text-slate-900 font-bold uppercase text-[10px] tracking-widest">Unlimited Access</div>
                  <p className="text-sm text-slate-500 leading-relaxed">Go beyond the 3-free trial and generate infinite variations for any application.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Subtle Trial Toast */}
      {wallet && !isSubscribed && (
        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="fixed bottom-24 right-10 z-30 bg-white border border-slate-200 shadow-xl p-4 rounded-xl flex items-center gap-4 max-w-xs"
        >
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
            <Zap size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Trial Status</p>
            <p className="text-[10px] text-slate-500">{freeLeft} generations remaining until pro upgrade.</p>
          </div>
        </motion.div>
      )}

      {/* Footer Status Bar */}
      <footer className="px-10 py-6 border-t border-slate-100 flex justify-between items-center bg-white mt-auto">
        <div className="flex items-center gap-6 text-[10px] font-bold text-slate-400 tracking-wider">
          <span className="flex items-center gap-1.5 uppercase">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
            System Status: Optimal
          </span>
          <span className="flex items-center gap-1.5">
            NETWORK: MAINNET
          </span>
        </div>
        <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
          &copy; {new Date().getFullYear()} {import.meta.env.VITE_APP_NAME || "InstantRole"}. Built for the new economy.
        </div>
      </footer>

      <PaymentModal 
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        walletAddress={wallet || ""}
        onSuccess={() => wallet && fetchUserStatus(wallet)}
      />
    </div>
  );
}

