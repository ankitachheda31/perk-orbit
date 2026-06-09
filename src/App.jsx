import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ChevronRight,
  Plus,
  RefreshCw,
  Gift,
  CreditCard,
  Wallet,
  Coins,
  ShieldCheck,
  X,
  Smartphone,
  CheckCircle2,
  Loader2
} from 'lucide-react';

// Mock Data
const MERCHANT_HACKS = {
  'zomato': 'Use HDFC Swiggy Card for 10% off or ICICI Amazon Pay for 2% cashback.',
  'blinkit': 'SBI Cashback Card gives 5% on all online spends here.',
  'amazon': 'Use Amazon Pay ICICI Card for unlimited 5% cashback (Prime).',
  'flipkart': 'Flipkart Axis Bank Card offers 5% unlimited cashback.',
};

const INITIAL_VOUCHERS = [];
const PREMIUM_VOUCHERS = [
  { id: 1, name: 'Swiggy ₹100 Off', code: 'PRO100', expiry: 'Exp: 20 Oct' },
  { id: 2, name: 'Myntra Flat 15%', code: 'STYLE15', expiry: 'Exp: 25 Oct' },
  { id: 3, name: 'Uber 20% Discount', code: 'RIDEFREE', expiry: 'Exp: 15 Oct' },
];

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPro, setIsPro] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [vouchers, setVouchers] = useState(INITIAL_VOUCHERS);
  const [smsEnabled, setSmsEnabled] = useState(false);

  // Search Logic
  const activeHack = useMemo(() => {
    if (!searchQuery) return null;
    const key = searchQuery.toLowerCase();
    const match = Object.keys(MERCHANT_HACKS).find(k => k.includes(key));
    return match ? MERCHANT_HACKS[match] : null;
  }, [searchQuery]);

  const handleSync = () => {
    if (!isPro) {
      setShowCheckout(true);
    } else {
      setSmsEnabled(!smsEnabled);
    }
  };

  useEffect(() => {
    if (smsEnabled && isPro && vouchers.length === 0) {
      setIsScanning(true);
      setTimeout(() => {
        setIsScanning(false);
        setVouchers(PREMIUM_VOUCHERS);
      }, 3000);
    }
  }, [smsEnabled, isPro, vouchers.length]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-10">
      {/* Top Header / Tier 1: Checkout Companion */}
      <div className="px-6 pt-12 pb-6 bg-white border-b border-slate-100 sticky top-0 z-10">
        <h1 className="text-xl font-bold mb-4">Perk Orbit</h1>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="🔍 Where are you paying right now?"
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {activeHack && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-xs text-blue-800 leading-relaxed font-medium">
              💡 {activeHack}
            </p>
          </div>
        )}
      </div>

      <div className="px-5 space-y-6 mt-6">
        {/* Tier 2: The Hook & Tracker */}
        <section className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Savings Impact</p>
            <h2 className="text-sm font-medium text-orange-600 mb-4 flex items-center gap-1">
              Estimated Missed Savings this month: <span className="font-bold text-base">₹450</span>
            </h2>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-xs font-semibold text-slate-500">Save-o-Meter</span>
                <span className="text-xs font-bold text-slate-800">₹1,200 / ₹5,000</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-1000 ease-out rounded-full"
                  style={{ width: '24%' }}
                />
              </div>
            </div>
          </div>

          {/* Pro Action Button */}
          <button
            onClick={handleSync}
            className="w-full bg-slate-900 text-white rounded-2xl py-4 px-6 flex items-center justify-between group active:scale-[0.98] transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg">
                <RefreshCw className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold flex items-center gap-2">
                  Sync & Automate
                  {!isPro && (
                    <span className="bg-blue-500 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-tighter">Pro</span>
                  )}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isScanning ? 'Scanning incoming texts...' : (smsEnabled ? 'SMS Auto-Track Active' : 'Enable real-time tracking')}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform" />
          </button>
        </section>

        {/* Tier 3: The Vault Grid */}
        <section>
          <h3 className="text-sm font-bold text-slate-800 mb-4 px-1">Your Vault</h3>
          <div className="grid grid-cols-2 gap-4">
            <VaultButton icon={<Gift className="w-6 h-6 text-pink-500" />} label="My Vouchers" badge={vouchers.length} />
            <VaultButton icon={<Wallet className="w-6 h-6 text-purple-500" />} label="Gift Cards" />
            <VaultButton icon={<Coins className="w-6 h-6 text-amber-500" />} label="Brand Coins" />
            <VaultButton icon={<CreditCard className="w-6 h-6 text-blue-500" />} label="My Cards" />
          </div>
        </section>

        {/* Mock Vouchers Display (Conditional) */}
        {vouchers.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-sm font-bold text-slate-800 mb-4 px-1">Recently Discovered</h3>
            <div className="space-y-3">
              {vouchers.map(v => (
                <div key={v.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-50 p-2 rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{v.name}</p>
                      <p className="text-[10px] text-slate-500">{v.expiry}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-dashed border-slate-200">
                    <p className="text-xs font-mono font-bold text-slate-700">{v.code}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Pro Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white w-full max-w-md rounded-t-[32px] p-8 pb-12 animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Premium Access</span>
                </div>
                <h2 className="text-2xl font-black">Unlock Perk Orbit Pro</h2>
              </div>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-2 bg-slate-100 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-sm font-bold">Subscription Fee</p>
                  <p className="text-xs text-slate-500">Full access for 6 months</p>
                </div>
                <p className="text-lg font-black">₹99</p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase ml-1">Payment Method</p>
                <div className="grid grid-cols-3 gap-2">
                  {['UPI', 'Card', 'Net'].map(m => (
                    <button key={m} className="py-2.5 text-xs font-bold border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors">
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setIsPro(true);
                setShowCheckout(false);
              }}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform"
            >
              Start 6-Month Plan
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-4">Secure 256-bit SSL Encrypted Payment</p>
          </div>
        </div>
      )}
    </div>
  );
}

function VaultButton({ icon, label, badge }) {
  return (
    <button className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-all duration-200 relative">
      {badge > 0 && (
        <span className="absolute top-4 right-4 bg-orange-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ring-4 ring-white">
          {badge}
        </span>
      )}
      <div className="p-3 bg-slate-50 rounded-2xl mb-1">
        {icon}
      </div>
      <span className="text-[11px] font-bold text-slate-600">{label}</span>
    </button>
  );
}
