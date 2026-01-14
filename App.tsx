
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Layout, FileText, Settings, Archive, User, Search, Printer, Plus, Save, Move, RotateCw, Upload, Trash2, AlignLeft, AlignCenter, AlignRight, Grid, List, Layers, PlusCircle, ChevronDown, Files, UserPlus, X, ChevronLeft, CheckCircle2, Type, Maximize2, Bell, Pencil, ShieldCheck, Database, Download, FileJson, Key, Check, Lock, LogOut, UserCheck, Shield, Eye, EyeOff, Repeat, Phone, CreditCard, UserCircle, ZoomIn, ZoomOut, ChevronUp, Info, BookMarked, Copy, Wallet, ArrowUpCircle, ArrowDownCircle, Calculator, TrendingUp, TrendingDown, Clock, Users, Share2, MessageCircle, PieChart, BarChart3, Calendar } from 'lucide-react';
import { PaperSize, ContractField, ContractTemplate, TextAlignment, ContractPage, ClientProfile } from './types';
import { INITIAL_FIELDS } from './constants';
import ReactDOM from 'react-dom';
import { supabase } from './lib/supabase';

// --- Local Storage Engine (IndexedDB) ---
const DB_NAME = 'AsraCache';
const STORE_NAME = 'images';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined as any);
  });
};

const cacheImage = async (url: string): Promise<string> => {
  if (!url) return '';
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const cached = await new Promise<Blob | undefined>((resolve) => {
      const req = store.get(url);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });

    if (cached) return URL.createObjectURL(cached);

    const response = await fetch(url, { mode: 'cors', cache: 'no-cache' });
    const blob = await response.blob();
    const writeTx = db.transaction(STORE_NAME, 'readwrite');
    writeTx.objectStore(STORE_NAME).put(blob, url);
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn('Caching failed for:', url, e);
    return url;
  }
};

const AsraLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="55" rx="45" ry="15" stroke="#0072BC" strokeWidth="4" />
    <path d="M50 85C50 85 80 55 80 35C80 18.4315 66.5685 5 50 5C33.4315 5 20 18.4315 20 35C20 55 50 85 50 85Z" fill="#ED1C24" />
    <path d="M35 45C35 43 37 41 40 40.5L42 37C43 35.5 45 35 47 35H53C55 35 57 35.5 58 37L60 40.5C63 41 65 43 65 45V50C65 51 64 52 63 52H37C36 52 35 51 35 50V45Z" fill="white" />
    <rect x="38" y="47" width="4" height="2" rx="1" fill="#ED1C24" opacity="0.5" />
    <rect x="58" y="47" width="4" height="2" rx="1" fill="#ED1C24" opacity="0.5" />
    <path d="M42 41H58L56 38H44L42 41Z" fill="#ED1C24" opacity="0.3" />
  </svg>
);

const showToast = (message: string) => {
  window.dispatchEvent(new CustomEvent('show-app-toast', { detail: message }));
};

const Toast = () => {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    const handler = (e: any) => {
      setMsg(e.detail);
      setTimeout(() => setMsg(null), 3000);
    };
    window.addEventListener('show-app-toast', handler);
    return () => window.removeEventListener('show-app-toast', handler);
  }, []);
  if (!msg) return null;
  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 z-[1000] animate-in slide-in-from-bottom-10 border border-slate-700 backdrop-blur-xl no-print">
      <Bell size={18} className="text-blue-400" />
      <span className="font-bold text-sm">{msg}</span>
    </div>
  );
};

// --- Reports Panel (Smart Insights) ---
const ReportsPanel = ({ perms }: { perms: string[] }) => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'main' | 'extended'>('all');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setLoading(true);
    let query = supabase.from('contracts').select('*');
    
    const now = new Date();
    let startDate = new Date();
    
    if (timeRange === 'today') startDate.setHours(0, 0, 0, 0);
    else if (timeRange === 'week') startDate.setDate(now.getDate() - 7);
    else if (timeRange === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (timeRange === 'year') startDate.setFullYear(now.getFullYear() - 1);

    query = query.gte('timestamp', startDate.toISOString());
    const { data } = await query.order('timestamp', { ascending: false });
    
    if (data) setContracts(data);
    setLoading(false);
  };

  const filteredData = useMemo(() => {
    return contracts.filter(c => {
      if (filterType === 'main') return !c.is_extended;
      if (filterType === 'extended') return c.is_extended;
      return true;
    });
  }, [contracts, filterType]);

  const stats = useMemo(() => {
    const total = contracts.length;
    const extended = contracts.filter(c => c.is_extended).length;
    const main = total - extended;
    const extendedRate = total > 0 ? Math.round((extended / total) * 100) : 0;
    
    return { total, extended, main, extendedRate };
  }, [contracts]);

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 animate-in fade-in duration-500 overflow-y-auto custom-scrollbar h-full">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 mb-1">گزارشات هوشمند اسراء</h2>
          <p className="text-slate-400 font-bold">تحلیل عملکرد ردیاب‌ها و قراردادهای ثبت شده</p>
        </div>
        
        <div className="flex items-center bg-white p-1.5 rounded-[24px] shadow-sm border border-slate-100">
          {(['today', 'week', 'month', 'year'] as const).map(range => (
            <button 
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all ${timeRange === range ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {range === 'today' ? 'امروز' : range === 'week' ? '۷ روز اخیر' : range === 'month' ? '۳۰ روز اخیر' : 'سال جاری'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[60px] -z-0 transition-all group-hover:scale-110" />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">کل قراردادها</p>
            <h3 className="text-4xl font-black text-slate-800">{stats.total}</h3>
            <div className="mt-4 flex items-center gap-2 text-blue-600 font-black text-[10px]">
              <BarChart3 size={14}/> <span>روند صعودی</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[60px] -z-0 transition-all group-hover:scale-110" />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">قراردادهای اصلی</p>
            <h3 className="text-4xl font-black text-slate-800">{stats.main}</h3>
            <div className="mt-4 flex items-center gap-2 text-emerald-600 font-black text-[10px]">
              <PlusCircle size={14}/> <span>مشتریان جدید</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-[60px] -z-0 transition-all group-hover:scale-110" />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">تمدیدی‌ها</p>
            <h3 className="text-4xl font-black text-slate-800">{stats.extended}</h3>
            <div className="mt-4 flex items-center gap-2 text-amber-600 font-black text-[10px]">
              <Repeat size={14}/> <span>وفاداری مشتریان</span>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-[60px] -z-0" />
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">نرخ تمدید</p>
            <h3 className="text-4xl font-black text-white">{stats.extendedRate}%</h3>
            <div className="mt-4 w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
               <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${stats.extendedRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden flex flex-col mb-20">
        <div className="px-10 py-8 border-b flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400"><PieChart size={20}/></div>
             <h4 className="font-black text-slate-800 text-lg">لیست تحلیلی اسناد</h4>
          </div>
          
          <div className="flex bg-slate-50 p-1 rounded-2xl">
             <button onClick={() => setFilterType('all')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${filterType === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>همه اسناد</button>
             <button onClick={() => setFilterType('main')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${filterType === 'main' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>اصلی</button>
             <button onClick={() => setFilterType('extended')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${filterType === 'extended' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-400'}`}>تمدیدی</button>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {filteredData.length > 0 ? filteredData.map((c, i) => (
            <div key={c.id} className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-all group">
               <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${c.is_extended ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                     {c.is_extended ? <Repeat size={24}/> : <Plus size={24}/>}
                  </div>
                  <div>
                     <h5 className="font-black text-slate-800 text-lg mb-1">{c.client_name}</h5>
                     <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                        <span className="flex items-center gap-1"><CreditCard size={12}/> {c.form_data?.tazkira || 'بدون پلاک'}</span>
                        <span className="opacity-20">|</span>
                        <span className="flex items-center gap-1"><Clock size={12}/> {new Date(c.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="opacity-20">|</span>
                        <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(c.timestamp).toLocaleDateString('fa-IR')}</span>
                     </div>
                  </div>
               </div>
               
               <div className={`px-4 py-2 rounded-full text-[10px] font-black ${c.is_extended ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {c.is_extended ? 'تمدید خدمات' : 'قرارداد جدید'}
               </div>
            </div>
          )) : (
            <div className="p-32 text-center text-slate-300 font-bold italic">داده‌ای برای این بازه یافت نشد</div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Security Gate for Design Section ---
const DesignGate = ({ onUnlock, onCancel }: { onUnlock: () => void, onCancel: () => void }) => {
  const [pass, setPass] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pass === 'wali') {
      onUnlock();
    } else {
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
      setPass('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="w-24 h-24 bg-blue-600 text-white rounded-[32px] flex items-center justify-center mb-8 shadow-2xl shadow-blue-100 ring-8 ring-blue-50">
        <Lock size={40} />
      </div>
      <h2 className="text-2xl font-black text-slate-800 mb-2">دسترسی محدود شده</h2>
      <p className="text-slate-400 font-medium mb-10 max-w-xs">برای ورود به بخش مدیریت بوم طراحی، لطفاً رمز عبور را وارد نمایید.</p>
      
      <form onSubmit={handleSubmit} className={`w-full max-w-sm space-y-4 ${isError ? 'animate-bounce' : ''}`}>
        <div className="relative">
          <Key className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input 
            type="password" 
            placeholder="رمز عبور طراحی..." 
            autoFocus
            className={`w-full pr-14 pl-6 py-5 bg-white border-2 rounded-[24px] outline-none transition-all font-bold text-center text-xl tracking-[0.5em] ${isError ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-blue-500 shadow-sm'}`}
            value={pass}
            onChange={e => setPass(e.target.value)}
          />
        </div>
        <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-lg shadow-xl hover:bg-black transition-all">تایید هویت</button>
        <button type="button" onClick={onCancel} className="text-slate-400 font-bold text-sm hover:text-slate-600">انصراف</button>
      </form>
    </div>
  );
};

// --- Accounting Logic ---
const AccountingPanel = ({ perms }: { perms: string[] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<'charge' | 'payment'>('charge');
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('name');
    if (data) setClients(data);
  };

  const fetchTransactions = async (clientId: string) => {
    const { data } = await supabase.from('transactions').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    if (data) setTransactions(data);
  };

  useEffect(() => {
    if (selectedClient) fetchTransactions(selectedClient.id);
  }, [selectedClient]);

  const filteredClients = useMemo(() => {
    const lower = searchTerm.toLowerCase().trim();
    if (!lower) return [];
    return clients.filter(c => c.name.toLowerCase().includes(lower) || (c.tazkira && c.tazkira.toLowerCase().includes(lower)));
  }, [clients, searchTerm]);

  const handleSaveEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClient) return;
    const data = new FormData(e.currentTarget);
    const amount = parseInt(data.get('amount') as string);
    const description = data.get('description') as string;

    const entry = {
      client_id: selectedClient.id,
      amount,
      description,
      type: editingTransaction ? editingTransaction.type : entryType
    };

    if (editingTransaction) {
      const { error } = await supabase.from('transactions').update(entry).eq('id', editingTransaction.id);
      if (!error) showToast('رکورد مالی بروزرسانی شد');
    } else {
      const { error } = await supabase.from('transactions').insert([entry]);
      if (!error) showToast('تراکنش مالی ثبت گردید');
    }

    setIsEntryModalOpen(false);
    setEditingTransaction(null);
    fetchTransactions(selectedClient.id);
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      showToast('رکورد حذف شد');
      if (selectedClient) fetchTransactions(selectedClient.id);
    }
  };

  const totals = useMemo(() => {
    const charges = transactions
      .filter(t => t.type === 'charge')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const payments = transactions
      .filter(t => t.type === 'payment')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);
    
    return { charges, payments, balance: charges - payments };
  }, [transactions]);

  if (!selectedClient) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="text-center mb-12 pt-10">
          <div className="w-32 h-32 bg-blue-50 rounded-[40px] flex items-center justify-center mx-auto mb-6 shadow-xl border border-blue-100 text-blue-600">
             <Wallet size={60} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">حسابداری و امور مالی</h2>
          <p className="text-slate-500 font-medium text-lg opacity-80">مدیریت دستی بدهی‌ها و پرداختی‌های مشتریان</p>
        </div>
        <div className="relative group">
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={24} />
            <input type="text" placeholder="نام یا شماره پلاک مشتری را وارد کنید..." className="w-full pr-16 pl-8 py-6 bg-white border-2 border-slate-100 rounded-[32px] shadow-sm outline-none transition-all text-xl font-bold focus:border-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {searchTerm && (
          <div className="mt-8 bg-white rounded-[40px] border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95">
             {filteredClients.length > 0 ? (
               <div className="divide-y divide-slate-50">
                 {filteredClients.map(c => (
                   <div key={c.id} onClick={() => setSelectedClient(c)} className="p-8 flex items-center justify-between hover:bg-blue-50 cursor-pointer transition-all group">
                     <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">{c.name[0]}</div>
                        <div><h4 className="font-black text-lg text-slate-800">{c.name}</h4><p className="text-xs text-slate-400 font-bold">پلاک: {c.tazkira}</p></div>
                     </div>
                     <ChevronLeft className="text-slate-300" />
                   </div>
                 ))}
               </div>
             ) : ( <div className="p-14 text-center text-slate-400 font-bold">مشتری با این مشخصات یافت نشد</div> )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 animate-in fade-in duration-500 overflow-y-auto custom-scrollbar h-full">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-white p-8 rounded-[48px] shadow-sm border border-slate-100 gap-6">
         <div className="flex items-center gap-6">
            <button onClick={() => setSelectedClient(null)} className="p-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all"><X size={24}/></button>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">پرونده مالی</p>
               <h3 className="text-2xl font-black text-slate-800">{selectedClient.name}</h3>
            </div>
         </div>
         <div className="flex gap-4">
            <button onClick={() => { setEntryType('charge'); setIsEntryModalOpen(true); }} className="bg-red-500 text-white px-8 py-5 rounded-[28px] font-black text-sm flex items-center gap-3 shadow-lg shadow-red-100 hover:scale-105 transition-all"><TrendingDown size={20}/> ثبت بدهی (طلب)</button>
            <button onClick={() => { setEntryType('payment'); setIsEntryModalOpen(true); }} className="bg-emerald-500 text-white px-8 py-5 rounded-[28px] font-black text-sm flex items-center gap-3 shadow-lg shadow-emerald-100 hover:scale-105 transition-all"><TrendingUp size={20}/> ثبت پرداختی (قسط)</button>
         </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
         <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4"><div className="p-3 bg-red-50 text-red-500 rounded-2xl"><TrendingDown size={24}/></div><span className="text-xs font-black text-slate-400 uppercase">کل بدهی‌ها</span></div>
            <p className="text-3xl font-black text-slate-800">{totals.charges.toLocaleString()} <span className="text-sm opacity-30">AFN</span></p>
         </div>
         <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4"><div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl"><TrendingUp size={24}/></div><span className="text-xs font-black text-slate-400 uppercase">کل پرداختی‌ها</span></div>
            <p className="text-3xl font-black text-slate-800">{totals.payments.toLocaleString()} <span className="text-sm opacity-30">AFN</span></p>
         </div>
         <div className={`p-8 rounded-[40px] border shadow-lg transition-colors duration-500 ${totals.balance > 0 ? 'bg-red-600 border-red-500 text-white shadow-red-100' : totals.balance < 0 ? 'bg-blue-600 border-blue-500 text-white shadow-blue-100' : 'bg-slate-800 border-slate-700 text-white'}`}>
            <div className="flex items-center gap-4 mb-4"><div className="p-3 bg-white/20 rounded-2xl"><Calculator size={24}/></div><span className="text-xs font-black uppercase opacity-60">تراز نهایی (مانده)</span></div>
            <p className="text-3xl font-black">
              {totals.balance < 0 ? '-' : totals.balance > 0 ? '+' : ''}
              {Math.abs(totals.balance).toLocaleString()} 
              <span className="text-sm opacity-60 mr-2">AFN</span>
            </p>
            <p className="text-[10px] font-black mt-2 opacity-80 uppercase tracking-widest">
              {totals.balance > 0 ? 'بدهکار به ما' : totals.balance < 0 ? 'طلبکار (اضافه پرداخت)' : 'حساب تسویه شده'}
            </p>
         </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden flex flex-col mb-10 mt-8 h-auto">
         <div className="grid grid-cols-2 border-b">
            <div className="p-6 bg-red-50/30 border-l flex items-center justify-between"><h4 className="font-black text-red-700 flex items-center gap-2"><ArrowDownCircle size={18}/> لیست بدهی‌ها (مخارج)</h4></div>
            <div className="p-6 bg-emerald-50/30 flex items-center justify-between"><h4 className="font-black text-emerald-700 flex items-center gap-2"><ArrowUpCircle size={18}/> لیست پرداختی‌ها (درآمد)</h4></div>
         </div>
         <div className="grid grid-cols-2 divide-x divide-x-reverse h-auto">
            <div className="flex flex-col flex-1 h-full">
               {transactions.filter(t => t.type === 'charge').map(t => (
                 <div key={t.id} className="p-6 border-b hover:bg-slate-50 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                       <div className="text-right">
                          <p className="font-black text-slate-800 text-lg">{Number(t.amount).toLocaleString()} <span className="text-[10px] opacity-30">AFN</span></p>
                          <p className="text-[11px] font-bold text-slate-400">{t.description || 'بدون توضیح'}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <p className="text-[10px] font-black text-slate-300">{new Date(t.created_at).toLocaleDateString('fa-IR')}</p>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { setEditingTransaction(t); setIsEntryModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={14}/></button>
                          <button onClick={() => deleteTransaction(t.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                       </div>
                    </div>
                 </div>
               ))}
               {transactions.filter(t => t.type === 'charge').length === 0 && <div className="p-20 text-center text-slate-300 font-bold text-sm">هیچ بدهی ثبت نشده است</div>}
               <div className="flex-1 bg-slate-50/20" />
            </div>
            <div className="flex flex-col flex-1 h-full">
               {transactions.filter(t => t.type === 'payment').map(t => (
                 <div key={t.id} className="p-6 border-b hover:bg-slate-50 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                       <div className="text-right">
                          <p className="font-black text-slate-800 text-lg">{Number(t.amount).toLocaleString()} <span className="text-[10px] opacity-30">AFN</span></p>
                          <p className="text-[11px] font-bold text-slate-400">{t.description || 'بدون توضیح'}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <p className="text-[10px] font-black text-slate-300">{new Date(t.created_at).toLocaleDateString('fa-IR')}</p>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { setEditingTransaction(t); setIsEntryModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Pencil size={14}/></button>
                          <button onClick={() => deleteTransaction(t.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                       </div>
                    </div>
                 </div>
               ))}
               {transactions.filter(t => t.type === 'payment').length === 0 && <div className="p-20 text-center text-slate-300 font-bold text-sm">هیچ پرداختی ثبت نشده است</div>}
               <div className="flex-1 bg-slate-50/20" />
            </div>
         </div>
      </div>

      {/* Entry Modal */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => { setIsEntryModalOpen(false); setEditingTransaction(null); }} />
          <form onSubmit={handleSaveEntry} className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 border border-white">
            <div className={`p-10 text-white flex justify-between items-center ${editingTransaction ? 'bg-blue-600' : entryType === 'charge' ? 'bg-red-600' : 'bg-emerald-600'}`}>
               <h3 className="text-2xl font-black flex items-center gap-3">
                  {editingTransaction ? <Pencil size={24}/> : entryType === 'charge' ? <TrendingDown size={24}/> : <TrendingUp size={24}/>}
                  {editingTransaction ? 'ویرایش رکورد مالی' : entryType === 'charge' ? 'ثبت بدهی جدید' : 'ثبت دریافتی جدید'}
               </h3>
               <button type="button" onClick={() => { setIsEntryModalOpen(false); setEditingTransaction(null); }} className="p-2 hover:bg-white/20 rounded-full transition-all"><X size={20}/></button>
            </div>
            <div className="p-12 space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">مبلغ تراکنش (AFN)</label>
                  <input name="amount" type="number" defaultValue={editingTransaction?.amount} className="w-full p-5 bg-slate-50 rounded-[24px] outline-none font-black text-2xl focus:bg-white focus:ring-4 ring-blue-50 transition-all border-2 border-transparent focus:border-blue-500" required autoFocus />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">بابت / توضیحات</label>
                  <textarea name="description" defaultValue={editingTransaction?.description} className="w-full p-5 bg-slate-50 rounded-[24px] outline-none font-bold text-lg focus:bg-white transition-all border-2 border-transparent focus:border-blue-500 h-32 resize-none" placeholder="مثلاً: قسط ماه دوم، هزینه نصب و..."></textarea>
               </div>
               <button type="submit" className={`w-full text-white py-6 rounded-[32px] font-black text-xl shadow-xl transition-all ${editingTransaction ? 'bg-blue-600 shadow-blue-100' : entryType === 'charge' ? 'bg-red-600 shadow-red-100' : 'bg-emerald-600 shadow-emerald-100'}`}>
                  {editingTransaction ? 'ثبت تغییرات' : 'تایید و ثبت نهایی'}
               </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// --- Independent PDF Rendering Engine ---
const handleExportPDF = async (template: ContractTemplate, formData: Record<string, string>, clientName: string, plate: string, isWhatsApp: boolean = false) => {
  const container = document.getElementById('pdf-export-container');
  if (!container) return;
  
  showToast('در حال آماده‌سازی فایل هوشمند...');
  container.innerHTML = '';
  
  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pagesToProcess = template.pages || [];
  
  for (let i = 0; i < pagesToProcess.length; i++) {
    const page = pagesToProcess[i];
    const activeFields = page.fields.filter(f => f.isActive);
    if (activeFields.length === 0 && i > 0) continue;

    const pageEl = document.createElement('div');
    pageEl.style.width = '210mm';
    pageEl.style.height = '297mm';
    pageEl.style.position = 'relative';
    pageEl.style.overflow = 'hidden';
    pageEl.style.backgroundColor = 'white';

    if (page.bgImage) {
      const bgImg = document.createElement('img');
      bgImg.src = page.bgImage;
      bgImg.style.position = 'absolute';
      bgImg.style.top = '0';
      bgImg.style.left = '0';
      bgImg.style.width = '100%';
      bgImg.style.height = '100%';
      bgImg.style.objectFit = 'fill';
      bgImg.crossOrigin = 'anonymous';
      pageEl.appendChild(bgImg);
    }

    activeFields.forEach(field => {
      const fieldEl = document.createElement('div');
      fieldEl.style.position = 'absolute';
      fieldEl.style.left = `${field.x}%`;
      fieldEl.style.top = `${field.y}%`;
      fieldEl.style.width = `${field.width}px`;
      fieldEl.style.fontSize = `${field.fontSize * 1.3}px`;
      fieldEl.style.fontFamily = 'Vazirmatn';
      fieldEl.style.fontWeight = '900';
      fieldEl.style.color = 'black';
      fieldEl.style.textAlign = field.alignment === 'L' ? 'left' : field.alignment === 'R' ? 'right' : 'center';
      fieldEl.style.transform = `rotate(${field.rotation}deg)`;
      fieldEl.style.whiteSpace = 'nowrap';
      fieldEl.innerText = formData[field.key] || '';
      pageEl.appendChild(fieldEl);
    });

    container.appendChild(pageEl);
    const canvas = await (window as any).html2canvas(pageEl, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (i > 0) doc.addPage();
    doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    container.removeChild(pageEl);
  }

  const fileName = `Asra_GPS_${clientName.replace(/\s+/g, '_')}_${plate.replace(/\s+/g, '_')}.pdf`;
  if (isWhatsApp && navigator.share) {
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    try {
      await navigator.share({ files: [file], title: 'قرارداد اسراء GPS', text: `قرارداد مشتری: ${clientName} - پلاک: ${plate}` });
      showToast('اشتراک‌گذاری با موفقیت انجام شد');
    } catch (err) {
      doc.save(fileName);
      showToast('خطا در ارسال مستقیم؛ فایل دانلود شد.');
    }
  } else {
    doc.save(fileName);
    showToast(isWhatsApp ? 'واتساپ در دسکتاپ باز نشد؛ فایل دانلود شد.' : 'فایل PDF در حافظه ذخیره شد.');
  }
};

// --- Print Renderer Component ---
const PrintLayout = ({ template, formData }: { template: ContractTemplate, formData: Record<string, string> }) => {
  const [localBgs, setLocalBgs] = useState<Record<number, string>>({});
  useEffect(() => {
    const loadImages = async () => {
      const bgs: Record<number, string> = {};
      if (template.pages) {
        for (const page of template.pages) {
          if (page.bgImage) bgs[page.pageNumber] = await cacheImage(page.bgImage);
        }
      }
      setLocalBgs(bgs);
    };
    loadImages();
  }, [template.pages]);

  const isMasterA4 = template.pages?.[0]?.paperSize === PaperSize.A4;
  if (!template.pages || template.pages.length === 0) return null;

  return ReactDOM.createPortal(
    <div className="print-root-layer">
      {template.pages.map((page, index) => {
        const activeFields = page.fields?.filter(f => f.isActive) || [];
        if (activeFields.length === 0 && index > 0) return null;
        return (
          <div key={`print-page-${index}`} className="print-page-unit" style={{ width: isMasterA4 ? '210mm' : '148mm', height: isMasterA4 ? '297mm' : '210mm', backgroundImage: page.showBackgroundInPrint && localBgs[page.pageNumber] ? `url(${localBgs[page.pageNumber]})` : 'none', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', imageRendering: 'crisp-edges' }}>
            {activeFields.map((field) => (
              <div key={`field-${field.id}`} className="print-field" style={{ left: `${field.x}%`, top: `${field.y}%`, width: `${field.width}px`, transform: `rotate(${field.rotation}deg)`, fontSize: `${field.fontSize}px`, textAlign: field.alignment === 'L' ? 'left' : field.alignment === 'R' ? 'right' : 'center', justifyContent: field.alignment === 'L' ? 'flex-start' : field.alignment === 'R' ? 'flex-end' : 'center' }}>
                <span className="print-text-content">{formData[field.key] || ''}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>,
    document.body
  );
};

const Sidebar = ({ activeTab, setActiveTab, userPermissions, onLogout }: { activeTab: string, setActiveTab: (t: string) => void, userPermissions: string[], onLogout: () => void }) => {
  const menuItems = [
    { id: 'workspace', icon: Layout, label: 'میز کار', perm: 'workspace' },
    { id: 'archive', icon: Archive, label: 'بایگانی', perm: 'archive' },
    { id: 'reports', icon: PieChart, label: 'گزارشات', perm: 'workspace_reports' },
    { id: 'accounting', icon: Wallet, label: 'امور مالی', perm: 'accounting' },
    { id: 'settings', icon: Settings, label: 'تنظیمات', perm: 'settings' }
  ].filter(item => userPermissions.includes(item.perm));

  return (
    <aside className="w-20 md:w-64 bg-slate-900 text-white min-h-screen flex flex-col p-4 no-print transition-all">
      <div className="flex items-center gap-3 mb-10 px-2 overflow-hidden">
        <div className="bg-white p-1 rounded-xl shadow-lg flex-shrink-0 flex items-center justify-center"><AsraLogo size={36} /></div>
        <h1 className="text-2xl font-black hidden md:block tracking-tight text-white whitespace-nowrap">اسراء GPS</h1>
      </div>
      <nav className="flex flex-col gap-2 flex-1">
        {menuItems.map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 ${activeTab === item.id ? 'bg-blue-600 shadow-lg shadow-blue-900/20 scale-[1.02]' : 'hover:bg-slate-800 text-slate-400'}`}>
            <item.icon size={20} />
            <span className="hidden md:block font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      <button onClick={onLogout} className="flex items-center gap-3 p-4 rounded-2xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all mt-auto">
        <LogOut size={20} />
        <span className="hidden md:block font-medium">خروج از سیستم</span>
      </button>
    </aside>
  );
};

const LoginForm = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data } = await supabase.from('users').select('*').eq('username', username).eq('password', password).single();
    if (data) onLogin(data);
    else { setError(true); setTimeout(() => setError(false), 2000); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-100 flex items-center justify-center p-6 z-[2000]">
      <div className="bg-white w-full max-w-md p-10 rounded-[48px] shadow-2xl border border-white animate-in zoom-in-95 duration-500 text-center">
        <div className="w-28 h-28 bg-white text-blue-600 rounded-[36px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-100 p-4 border border-blue-50"><AsraLogo size={80} /></div>
        <h2 className="text-3xl font-black text-slate-900 mb-2">ورود به اسراء GPS</h2>
        <p className="text-slate-400 font-medium mb-10">سامانه مدیریت هوشمند ردیاب‌ها</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative"><User className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} /><input type="text" placeholder="نام کاربری" className="w-full pr-14 pl-6 py-5 bg-slate-50 rounded-[24px] outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-bold text-lg" value={username} onChange={e => setUsername(e.target.value)} /></div>
          <div className="relative"><Key className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} /><input type="password" placeholder="رمز عبور" className="w-full pr-14 pl-6 py-5 bg-slate-50 rounded-[24px] outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-bold text-lg" value={password} onChange={e => setPassword(e.target.value)} /></div>
          {error && <p className="text-red-500 font-black text-xs animate-bounce">اطلاعات کاربری اشتباه است</p>}
          <button disabled={loading} className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-black text-xl shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all mt-4 disabled:opacity-50">{loading ? 'در حال تایید...' : 'ورود به پنل عملیاتی'}</button>
        </form>
      </div>
    </div>
  );
};

const CustomSelect = ({ field, value, onSelect, zoom, onClose }: { field: ContractField, value: string, onSelect: (val: string) => void, zoom: number, onClose: () => void }) => (
  <div className="absolute z-[100] bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-right" style={{ width: `${field.width * zoom}px`, top: '100%', marginTop: '4px', maxHeight: '200px', overflowY: 'auto' }}>
    {field.options?.map((opt, i) => <button key={i} onClick={(e) => { e.stopPropagation(); onSelect(opt); onClose(); }} className={`w-full p-3 text-sm font-bold transition-all text-right border-b border-slate-50 last:border-0 hover:bg-blue-50 ${value === opt ? 'bg-blue-100 text-blue-700' : 'text-slate-700'}`} style={{ fontSize: `${field.fontSize * zoom}px` }}>{opt}</button>)}
  </div>
);

const VisualCanvasPage = ({ page, formData, setFormData, zoom, activeFieldKey, setActiveFieldKey }: { page: ContractPage, formData: Record<string, string>, setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>, zoom: number, activeFieldKey: string | null, setActiveFieldKey: (key: string | null) => void }) => {
  const [localBg, setLocalBg] = useState<string>('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  useEffect(() => { if (page.bgImage) cacheImage(page.bgImage).then(url => setLocalBg(url)); }, [page.bgImage]);
  useEffect(() => {
    const activeFields = (page.fields || []).filter(f => f.isActive && f.isDropdown && f.options && f.options.length > 0);
    const newFormData = { ...formData };
    let updated = false;
    activeFields.forEach(f => { if (!newFormData[f.key]) { newFormData[f.key] = f.options![0]; updated = true; } });
    if (updated) setFormData(newFormData);
  }, [page.fields]);

  const handleKeyDown = (e: React.KeyboardEvent, currentField: ContractField) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const allActiveFields = page.fields.filter(f => f.isActive);
      const currentIndex = allActiveFields.findIndex(f => f.key === currentField.key);
      if (currentIndex < allActiveFields.length - 1) {
        const nextField = allActiveFields[currentIndex + 1];
        setActiveFieldKey(nextField.key);
        if (nextField.isDropdown) setOpenDropdown(nextField.key);
        else { setOpenDropdown(null); setTimeout(() => (document.querySelector(`input[data-field-key="${nextField.key}"]`) as HTMLInputElement)?.focus(), 10); }
      }
    }
  };

  const isA4 = page.paperSize === PaperSize.A4;
  return (
    <div className="relative mx-auto bg-white shadow-2xl border border-slate-200 transition-all duration-500 origin-top overflow-hidden" style={{ width: `${(isA4 ? 595 : 420) * zoom}px`, height: `${(isA4 ? 842 : 595) * zoom}px`, backgroundImage: localBg ? `url(${localBg})` : 'none', backgroundSize: '100% 100%', imageRendering: 'high-quality' }} onClick={() => { setActiveFieldKey(null); setOpenDropdown(null); }}>
      {page.fields.filter(f => f.isActive).map((field) => (
        <div key={field.id} className={`absolute flex items-center transition-all duration-300 ${activeFieldKey === field.key ? 'z-50' : 'z-10'} cursor-pointer`} style={{ left: `${field.x}%`, top: `${field.y}%`, width: `${field.width * zoom}px`, height: `${(field.height || 30) * zoom}px`, transform: `rotate(${field.rotation}deg)`, justifyContent: field.alignment === 'L' ? 'flex-start' : field.alignment === 'R' ? 'flex-end' : 'center' }} onClick={(e) => { e.stopPropagation(); setActiveFieldKey(field.key); if (field.isDropdown) setOpenDropdown(field.key); else setOpenDropdown(null); }}>
          <div className={`absolute -inset-[2px] border-2 transition-all duration-300 pointer-events-none ${activeFieldKey === field.key ? 'border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)] opacity-100' : 'border-transparent opacity-0'}`} />
          {field.isDropdown ? <div className="w-full h-full flex items-center gap-1 overflow-hidden" style={{ justifyContent: field.alignment === 'L' ? 'flex-start' : field.alignment === 'R' ? 'flex-end' : 'center' }}><span className="font-bold text-slate-800 whitespace-nowrap truncate" style={{ fontSize: `${field.fontSize * zoom}px` }}>{formData[field.key] || field.options?.[0]}</span><ChevronDown size={12 * zoom} className="text-slate-400 flex-shrink-0" /></div> : <input data-field-key={field.key} type="text" value={formData[field.key] || ''} onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))} onFocus={() => { setActiveFieldKey(field.key); setOpenDropdown(null); }} onKeyDown={(e) => handleKeyDown(e, field)} className="w-full h-full bg-transparent border-none outline-none font-bold text-slate-800 p-0 m-0" style={{ fontSize: `${field.fontSize * zoom}px`, textAlign: field.alignment === 'L' ? 'left' : field.alignment === 'R' ? 'right' : 'center' }} />}
          {openDropdown === field.key && field.isDropdown && <CustomSelect field={field} value={formData[field.key] || ''} onSelect={(val) => setFormData(p => ({ ...p, [field.key]: val }))} zoom={zoom} onClose={() => setOpenDropdown(null)} />}
        </div>
      ))}
    </div>
  );
};

const Workspace = ({ template, editData, onEditCancel, perms, formData, setFormData }: { template: ContractTemplate, editData?: any, onEditCancel?: () => void, perms: string[], formData: Record<string, string>, setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>> }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClientDetailsOpen, setIsClientDetailsOpen] = useState(false);
  const [isClientManagerOpen, setIsClientManagerOpen] = useState(false);
  const [visiblePages, setVisiblePages] = useState<number[]>([1]);
  const [zoom, setZoom] = useState(1.4);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [duplicatePlateError, setDuplicatePlateError] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => {
    if (selectedClient && workspaceRef.current) {
        const calculateAutoZoom = () => {
            const containerWidth = workspaceRef.current?.offsetWidth || 1000;
            const targetWidth = containerWidth * 0.85;
            const isA4 = template.pages?.[0]?.paperSize === PaperSize.A4;
            setZoom(Math.min(2.0, Math.max(0.6, targetWidth / (isA4 ? 595 : 420))));
        };
        calculateAutoZoom();
        window.addEventListener('resize', calculateAutoZoom);
        return () => window.removeEventListener('resize', calculateAutoZoom);
    }
  }, [selectedClient, template.pages]);

  const fetchClients = async () => { const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false }); if (data) setClients(data); };
  useEffect(() => {
    if (selectedClient && !editData) {
      const applyAutoFields = async () => {
        const newFormData = { ...formData };
        let hasChanges = false;
        const { count, error } = await supabase.from('contracts').select('*', { count: 'exact', head: true });
        const serialNum = error ? '1' : ((count || 0) + 1).toString();
        template.pages.forEach(p => p.fields.forEach(f => {
          if (f.isActive) {
            if (f.key.toLowerCase().includes('date') || f.label.includes('تاریخ')) { if (!newFormData[f.key]) { newFormData[f.key] = new Date().toLocaleDateString('fa-IR'); hasChanges = true; } }
            if (f.key.toLowerCase().includes('serial') || f.label.includes('مسلسل')) { if (!newFormData[f.key]) { newFormData[f.key] = serialNum; hasChanges = true; } }
          }
        }));
        if (hasChanges) setFormData(newFormData);
      };
      applyAutoFields();
    }
  }, [selectedClient, editData]);

  useEffect(() => {
    if (editData && clients.length > 0) {
      const client = clients.find(c => c.id === editData.client_id || c.id === editData.clientId);
      if (client) { setSelectedClient(client); setFormData(editData.form_data || {}); setVisiblePages([1]); }
    }
  }, [editData, clients]);

  const handleCreateClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const clientData = { name: data.get('name') as string, father_name: data.get('fatherName') as string, tazkira: data.get('tazkira') as string, phone: data.get('phone') as string };
    if (editingClient) await supabase.from('clients').update(clientData).eq('id', editingClient.id);
    else await supabase.from('clients').insert([{ id: Date.now().toString(), ...clientData }]);
    fetchClients(); setIsModalOpen(false);
  };

  const checkAndDeleteClient = async (client: ClientProfile) => {
    const { count: cCount } = await supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('client_id', client.id);
    const { count: tCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('client_id', client.id);
    if ((cCount && cCount > 0) || (tCount && tCount > 0)) { showToast('حذف مقدور نیست: پرونده دارای سوابق فعال است'); return; }
    if (window.confirm('حذف پرونده تایید شود؟')) { await supabase.from('clients').delete().eq('id', client.id); fetchClients(); }
  };

  const handleSaveContract = async (isExtension: boolean = false) => {
    if (!selectedClient) return;
    if (editData && !isExtension) await supabase.from('contracts').update({ form_data: formData, timestamp: new Date().toISOString() }).eq('id', editData.id);
    else await supabase.from('contracts').insert([{ id: Date.now().toString(), client_id: selectedClient.id, client_name: selectedClient.name, form_data: formData, timestamp: new Date().toISOString(), template_id: template.id, is_extended: isExtension }]);
    showToast(isExtension ? 'تمدید ثبت شد' : 'ثبت شد'); resetWorkspace();
  };

  const resetWorkspace = () => { setSelectedClient(null); setFormData({}); if (onEditCancel) onEditCancel(); };

  return (
    <div className="relative w-full h-full flex flex-col no-print bg-[#f8fafc]" ref={workspaceRef}>
      {!selectedClient ? (
        <div className="max-w-4xl mx-auto py-12 px-4 h-full overflow-y-auto custom-scrollbar">
           <div className="fixed top-24 left-8"><button onClick={() => setIsClientManagerOpen(true)} className="w-14 h-14 bg-white border border-slate-100 rounded-full shadow-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-110 transition-all"><Users size={24} /></button></div>
           <div className="text-center mb-12 pt-10"><div className="w-40 h-40 bg-white rounded-[48px] flex items-center justify-center mx-auto mb-6 shadow-2xl p-4 border border-slate-50"><AsraLogo size={120} /></div><h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">میز کار اسراء GPS</h2><p className="text-slate-500 font-medium text-lg italic opacity-80">سامانه هوشمند ثبت و تمدید خدمات ردیابی</p></div>
           <div className="flex gap-5 items-center"><div className="relative flex-1 group"><Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} /><input type="text" placeholder="جستجو نام یا پلاک..." className="w-full pr-16 pl-8 py-6 bg-white border-2 border-slate-100 rounded-[32px] shadow-sm outline-none text-xl font-medium focus:border-blue-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>{perms.includes('workspace_create') && <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-6 rounded-[32px] shadow-xl hover:bg-blue-700 transition-all flex items-center gap-3"><UserPlus size={28} /><span className="hidden md:block font-black text-lg">تشکیل پرونده</span></button>}</div>
           {searchTerm && (
             <div className="mt-8 bg-white/80 backdrop-blur-xl rounded-[40px] border border-white shadow-2xl overflow-hidden divide-y divide-slate-50">
               {clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.tazkira.includes(searchTerm)).map(client => (
                 <div key={client.id} onClick={() => setSelectedClient(client)} className="p-8 flex items-center justify-between hover:bg-blue-50/40 cursor-pointer transition-all group">
                   <div className="flex items-center gap-6"><div className="w-16 h-16 rounded-[24px] bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">{client.name[0]}</div><div><h4 className="font-black text-xl text-slate-800 mb-1">{client.name}</h4><div className="flex gap-4 text-sm font-medium text-slate-400"><span>پدر: {client.father_name || client.fatherName}</span><span className="opacity-30">|</span><span>پلاک: {client.tazkira}</span></div></div></div><ChevronLeft className="text-slate-300" />
                 </div>
               ))}
             </div>
           )}
           {isClientManagerOpen && (
              <div className="fixed inset-0 z-[1000] flex flex-col bg-[#f8fafc] animate-in slide-in-from-bottom duration-500">
                <div className="bg-white border-b px-8 py-6 flex items-center justify-between shadow-sm"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Users size={24}/></div><div><h3 className="text-2xl font-black text-slate-800">بانک اطلاعاتی مشتریان</h3><p className="text-xs font-bold text-slate-400">لیست تمامی پرونده‌ها</p></div></div><button onClick={() => setIsClientManagerOpen(false)} className="p-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={24}/></button></div>
                <div className="flex-1 overflow-y-auto p-10"><div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{clients.map(client => (<div key={client.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all flex flex-col"><div className="flex justify-between items-start mb-6"><div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-black">{client.name[0]}</div><div className="flex gap-2"><button onClick={() => { setEditingClient(client); setIsModalOpen(true); }} className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"><Pencil size={18}/></button><button onClick={() => checkAndDeleteClient(client)} className="p-3 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"><Trash2 size={18}/></button></div></div><h4 className="text-xl font-black text-slate-800 mb-4">{client.name}</h4><div className="space-y-3"><div className="flex items-center gap-3 text-sm font-bold text-slate-500 bg-slate-50 p-3 rounded-2xl"><span>پلاک: {client.tazkira}</span></div></div></div>))}</div></div>
              </div>
           )}
           {isModalOpen && (
              <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6"><div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} /><form onSubmit={handleCreateClient} className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl relative z-10 overflow-hidden border border-white/20 animate-in zoom-in-95"><div className="p-10 text-white flex justify-between items-center bg-blue-600"><h3 className="text-2xl font-black flex items-center gap-3"><UserPlus size={32} /> تشکیل پرونده مشتری</h3><button type="button" onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/20 rounded-full transition-all"><X size={24}/></button></div><div className="p-12 space-y-8"><div className="grid grid-cols-2 gap-8"><div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">نام و تخلص</label><input name="name" type="text" className="w-full p-5 bg-slate-50 rounded-[24px] outline-none font-bold" required /></div><div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">نام پدر</label><input name="fatherName" type="text" className="w-full p-5 bg-slate-50 rounded-[24px] outline-none font-bold" /></div></div><div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">شماره پلاک</label><input name="tazkira" type="text" className="w-full p-5 bg-slate-50 rounded-[24px] outline-none font-bold" required /></div><div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">شماره تماس</label><input name="phone" type="text" className="w-full p-5 bg-slate-50 rounded-[24px] outline-none font-bold" /></div><button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-black text-xl shadow-xl hover:bg-blue-700 transition-all">ایجاد پرونده</button></div></form></div>
           )}
        </div>
      ) : (
        <>
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-fit max-w-[95%] no-print"><div className="bg-white/80 backdrop-blur-2xl border border-white px-2 py-2 rounded-[32px] shadow-2xl flex items-center gap-1"><button onClick={() => setIsClientDetailsOpen(true)} className="flex items-center gap-3 pr-2 pl-4 py-1.5 rounded-full hover:bg-blue-50 transition-all"><div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg"><User size={18} /></div><div className="hidden md:flex flex-col text-right"><span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">مشتری فعال</span><span className="text-xs font-black text-slate-700 leading-none">{selectedClient.name}</span></div></button><div className="w-[1px] h-6 bg-slate-200 mx-2" /><div className="flex items-center bg-slate-100/50 p-1 rounded-full"><button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="p-2 hover:bg-white text-slate-500 rounded-full transition-all"><ZoomOut size={18}/></button><div className="px-3 text-[10px] font-black text-blue-600 w-12 text-center">{Math.round(zoom * 100)}%</div><button onClick={() => setZoom(z => Math.min(2.5, z + 0.1))} className="p-2 hover:bg-white text-slate-500 rounded-full transition-all"><ZoomIn size={18}/></button></div><div className="w-[1px] h-6 bg-slate-200 mx-2" /><div className="flex gap-1">{[1, 2, 3].map(p => <button key={p} onClick={() => setVisiblePages(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${visiblePages.includes(p) ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>{p}</button>)}</div><div className="w-[1px] h-6 bg-slate-200 mx-2" /><button onClick={resetWorkspace} className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full transition-all"><X size={20} /></button></div></div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pt-24 pb-40 px-6 no-print"><div className="max-w-screen-2xl mx-auto flex flex-col items-center gap-10">{template.pages.filter(p => visiblePages.includes(p.pageNumber)).map(page => (<div key={page.pageNumber} className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">{page.bgImage ? <VisualCanvasPage page={page} formData={formData} setFormData={setFormData} zoom={zoom} activeFieldKey={activeFieldKey} setActiveFieldKey={setActiveFieldKey} /> : <div className="bg-white p-12 rounded-[56px] shadow-2xl border border-slate-100 w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 relative overflow-hidden">{page.fields.filter(f => f.isActive).map(f => (<div key={f.id} className="flex flex-col gap-2 relative z-10"><label className="text-[10px] font-black text-slate-400 uppercase mr-1 tracking-widest">{f.label}</label><input type="text" value={formData[f.key] || ''} onChange={(e) => setFormData({...formData, [f.key]: e.target.value})} className="w-full px-6 py-5 bg-slate-50 rounded-[24px] outline-none font-bold text-lg focus:bg-white focus:ring-4 ring-blue-50 transition-all border-2 border-transparent focus:border-blue-200" /></div>))}</div>}</div>))}<div className="w-full max-w-4xl pt-10 pb-20 px-6"><div className="bg-white/60 backdrop-blur-xl p-8 rounded-[48px] border border-white shadow-2xl flex flex-col gap-4"><div className="flex flex-col md:flex-row gap-4"><button onClick={() => handleSaveContract(false)} className="flex-[2] bg-blue-600 text-white py-7 rounded-[32px] font-black text-xl shadow-2xl hover:bg-blue-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 active:scale-95"><Save size={28} /> {editData ? 'بروزرسانی تغییرات' : 'ثبت و آرشیو نهایی'}</button><button onClick={() => localStorage.setItem('asra_gps_preset', JSON.stringify(formData))} className="flex-1 bg-white border-2 border-slate-100 text-slate-700 py-7 rounded-[32px] font-black text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-3"><Copy size={24} className="text-blue-500" /> قالب پیش‌نویس</button></div><div className="flex flex-col md:flex-row gap-4">{editData && <button onClick={() => handleSaveContract(true)} className="flex-1 bg-emerald-500 text-white py-6 rounded-[28px] font-black text-lg shadow-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-4"><Repeat size={24} /> تمدید قرارداد</button>}<button onClick={() => window.print()} className="flex-1 bg-slate-900 text-white py-6 rounded-[28px] font-black text-lg flex items-center justify-center gap-4 hover:bg-black transition-all shadow-xl"><Printer size={24}/> چاپ سند</button></div></div></div></div></div>
        </>
      )}
    </div>
  );
};

const UsersManager = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<'users' | 'roles'>('users');
  const [editingUser, setEditingUser] = useState<any>(null);
  const permissionsList = [
    { id: 'workspace', label: 'دسترسی به میز کار', parent: null }, { id: 'workspace_create', label: 'ایجاد پرونده جدید', parent: 'workspace' }, { id: 'workspace_search', label: 'جستجوی مشتریان', parent: 'workspace' }, { id: 'workspace_reports', label: 'مشاهده گزارشات هوشمند', parent: 'workspace' }, { id: 'archive', label: 'مشاهده بایگانی', parent: null }, { id: 'archive_print', label: 'چاپ در بایگانی', parent: 'archive' }, { id: 'archive_edit', label: 'ویرایش در بایگانی', parent: 'archive' }, { id: 'archive_delete', label: 'حذف سوابق بایگانی', parent: 'archive' }, { id: 'accounting', label: 'دسترسی به امور مالی', parent: null }, { id: 'settings', label: 'دسترسی به تنظیمات', parent: null }, { id: 'settings_boom', label: 'مدیریت بوم طراحی', parent: 'settings' }, { id: 'settings_users', label: 'مدیریت کاربران و نقش‌ها', parent: 'settings' }, { id: 'settings_backup', label: 'پشتیبان‌گیری داده‌ها', parent: 'settings' }
  ];

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => { const { data: u } = await supabase.from('users').select('*'); const { data: r } = await supabase.from('roles').select('*'); if (u) setUsers(u); if (r) setRoles(r); };
  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const data = new FormData(e.currentTarget); const user = { username: data.get('username') as string, password: data.get('password') as string, role_id: data.get('roleId') as string }; if (editingUser) await supabase.from('users').update(user).eq('id', editingUser.id); else await supabase.from('users').insert([user]); setEditingUser(null); fetchData(); };
  const handleSaveRole = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const data = new FormData(e.currentTarget); const role = { id: Date.now().toString(), name: data.get('roleName') as string, perms: Array.from(data.getAll('perms') as string[]) }; await supabase.from('roles').insert([role]); fetchData(); };

  return (
    <div className="flex flex-col gap-8 p-8 h-full overflow-y-auto custom-scrollbar no-print">
      <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-2xl w-fit"><button onClick={() => setSubTab('users')} className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${subTab === 'users' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>مدیریت کاربران</button><button onClick={() => setSubTab('roles')} className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${subTab === 'roles' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>نقش‌ها و دسترسی</button></div>
      {subTab === 'users' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
           <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm h-fit"><h3 className="font-black text-xl mb-8 flex items-center gap-2 text-slate-800"><UserPlus className="text-blue-600"/> {editingUser ? 'ویرایش کاربر' : 'ایجاد کاربر جدید'}</h3><form onSubmit={handleSaveUser} className="space-y-6"><input name="username" type="text" defaultValue={editingUser?.username} placeholder="نام کاربری" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" required /><input name="password" type="password" defaultValue={editingUser?.password} placeholder="رمز عبور" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" required /><select name="roleId" defaultValue={editingUser?.role_id} className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold">{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select><button className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-lg shadow-xl">{editingUser ? 'بروزرسانی' : 'ثبت کاربر'}</button></form></div>
           <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm"><h3 className="font-black text-xl mb-8 text-slate-800">کاربران فعال</h3><div className="divide-y divide-slate-100">{users.map(u => (<div key={u.id} className="py-5 flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400">{u.username[0]}</div><div><p className="font-bold text-slate-700">{u.username}</p><p className="text-xs text-slate-400">{roles.find(r=>r.id===u.role_id)?.name}</p></div></div><div className="flex gap-2"><button onClick={() => setEditingUser(u)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl"><Pencil size={18}/></button>{u.username !== 'admin' && <button onClick={() => { supabase.from('users').delete().eq('id', u.id).then(fetchData); }} className="p-2 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={18}/></button>}</div></div>))}</div></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
           <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm h-fit"><h3 className="font-black text-xl mb-8 flex items-center gap-2 text-slate-800"><ShieldCheck className="text-blue-600"/> تعریف نقش</h3><form onSubmit={handleSaveRole} className="space-y-6"><input name="roleName" type="text" placeholder="نام نقش..." className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" required /><div className="space-y-2">{permissionsList.map(p => (<label key={p.id} className={`flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer ${p.parent ? 'mr-6 opacity-70' : 'mt-2 border-t'}`}><input type="checkbox" name="perms" value={p.id} className="w-5 h-5 accent-blue-600 rounded" /><span className="text-xs font-bold text-slate-700">{p.label}</span></label>))}</div><button className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-lg shadow-xl">ثبت نقش</button></form></div>
           <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm"><h3 className="font-black text-xl mb-8 text-slate-800">نقش‌های سیستم</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{roles.map(r => (<div key={r.id} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100"><div className="flex justify-between items-center mb-4"><h4 className="font-black text-lg text-blue-600">{r.name}</h4>{r.id !== 'admin_role' && <Trash2 size={16} className="text-slate-300 cursor-pointer" onClick={() => { supabase.from('roles').delete().eq('id', r.id).then(fetchData); }} />}</div><div className="flex flex-wrap gap-2">{r.perms?.map(p => <span key={p} className="px-3 py-1 bg-white rounded-lg text-[9px] font-black text-slate-500 border border-slate-100">{permissionsList.find(pl => pl.id === p)?.label}</span>)}</div></div>))}</div></div>
        </div>
      )}
    </div>
  );
};

const BackupManager = () => {
  const handleExport = async () => {
    const { data: t } = await supabase.from('settings').select('*');
    const { data: c } = await supabase.from('clients').select('*');
    const { data: a } = await supabase.from('contracts').select('*');
    const data = { settings: t, clients: c, contracts: a, exportDate: new Date().toISOString() };
    const aLink = document.createElement('a'); aLink.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' })); aLink.download = `asra_backup_${new Date().toISOString()}.json`; aLink.click();
  };
  return (
    <div className="p-12 h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto"><div className="w-48 h-48 bg-white text-blue-600 rounded-[56px] flex items-center justify-center mb-10 shadow-2xl p-10"><AsraLogo size={140} /></div><h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">امنیت داده‌های ابری</h2><p className="text-slate-500 font-medium text-lg mb-12">فایل پشتیبان شامل تمام سوابق مشتریان و قراردادها می‌باشد.</p><div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full"><button onClick={handleExport} className="bg-slate-900 text-white p-8 rounded-[40px] flex flex-col items-center gap-4 hover:scale-105 transition-all shadow-2xl"><Download size={32} /><span className="font-black text-xl">خروجی کامل</span></button><label className="bg-blue-600 text-white p-8 rounded-[40px] flex flex-col items-center gap-4 hover:scale-105 transition-all shadow-2xl shadow-blue-200 cursor-pointer"><FileJson size={32} /><span className="font-black text-xl">بازیابی داده</span><input type="file" className="hidden" accept=".json" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { const data = JSON.parse(await file.text()); await supabase.from('clients').upsert(data.clients); await supabase.from('contracts').upsert(data.contracts); showToast('بازیابی شد'); } }} /></label></div></div>
  );
};

const DesktopSettings = ({ template, setTemplate, activePageNum, activeSubTab, setActiveSubTab, onPageChange }: { template: ContractTemplate, setTemplate: (t: any) => void, activePageNum: number, activeSubTab: 'design' | 'fields', setActiveSubTab: (s: 'design' | 'fields') => void, onPageChange: (p: number) => void }) => {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [newField, setNewField] = useState({ label: '', fontSize: 14, width: 150, alignment: 'R' as TextAlignment, isDropdown: false, optionsStr: '' });
  const [canvasBg, setCanvasBg] = useState<string>('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activePage = template.pages.find(p => p.pageNumber === activePageNum) || template.pages[0];
  const fields = activePage.fields || [];
  const selectedField = fields.find(f => f.id === selectedFieldId);

  useEffect(() => { if (activePage.bgImage) cacheImage(activePage.bgImage).then(setCanvasBg); else setCanvasBg(''); }, [activePage.bgImage, activePageNum]);
  const updatePage = (updates: Partial<ContractPage>) => setTemplate({ ...template, pages: template.pages.map(p => p.pageNumber === activePageNum ? { ...p, ...updates } : p) });
  const updateField = (id: string, updates: Partial<ContractField>) => setTemplate({ ...template, pages: template.pages.map(p => p.pageNumber === activePageNum ? { ...p, fields: fields.map(f => f.id === id ? { ...f, ...updates } : f) } : p) });
  const handleDrag = (e: React.MouseEvent, id: string) => { if (!canvasRef.current) return; const rect = canvasRef.current.getBoundingClientRect(); setSelectedFieldId(id); const move = (m: MouseEvent) => updateField(id, { x: Math.max(0, Math.min(98, ((m.clientX - rect.left) / rect.width) * 100)), y: Math.max(0, Math.min(98, ((m.clientY - rect.top) / rect.height) * 100)) }); const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); };

  return (
    <div className="flex flex-col h-full bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-2xl animate-in fade-in duration-700">
      <div className="bg-white/90 border-b px-6 py-4 flex items-center justify-between z-10 sticky top-0"><div className="flex items-center gap-3"><div className="flex bg-slate-100 p-1 rounded-2xl"><button onClick={() => setActiveSubTab('design')} className={`px-5 py-2 rounded-xl font-black text-xs transition-all ${activeSubTab === 'design' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400'}`}>بوم</button><button onClick={() => setActiveSubTab('fields')} className={`px-5 py-2 rounded-xl font-black text-xs transition-all ${activeSubTab === 'fields' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400'}`}>لایه‌ها</button></div><div className="flex bg-slate-100 p-1 rounded-2xl">{[1, 2, 3].map(p => <button key={p} onClick={() => onPageChange(p)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activePageNum === p ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>برگ {p}</button>)}</div></div><div className="flex items-center gap-2"><button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-md"><Upload size={16} /> آپلود سربرگ</button><button onClick={() => supabase.from('settings').upsert([{ key: 'contract_template', value: template }]).then(() => showToast('ذخیره شد'))} className="bg-emerald-500 text-white px-6 py-2.5 rounded-2xl text-xs font-black shadow-lg shadow-emerald-100 ml-2"><Save size={16} /> ذخیره نهایی</button><input type="file" ref={fileInputRef} onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const path = `headers/${Date.now()}_${f.name}`; await supabase.storage.from('letterheads').upload(path, f); const { data } = supabase.storage.from('letterheads').getPublicUrl(path); updatePage({ bgImage: data.publicUrl }); } }} className="hidden" accept="image/*" /></div></div>
      <div className="flex flex-1 overflow-hidden relative"><div className="w-[320px] border-l p-6 overflow-y-auto flex flex-col gap-6 custom-scrollbar">{activeSubTab === 'design' ? (<><div><h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">لیست المان‌ها</h3><div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">{fields.map(f => (<div key={f.id} onClick={() => setSelectedFieldId(f.id)} className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer border-2 ${selectedFieldId === f.id ? 'bg-white border-blue-500 shadow-md text-blue-700' : 'bg-white/50 border-transparent hover:bg-white text-slate-500'}`}><span className="text-xs font-black">{f.label}</span><div onClick={(e) => { e.stopPropagation(); updateField(f.id, { isActive: !f.isActive }); }} className={`w-5 h-5 rounded flex items-center justify-center border-2 ${f.isActive ? 'bg-blue-600 border-blue-600' : 'border-slate-200'}`}>{f.isActive && <Check size={10} className="text-white" />}</div></div>))}</div></div>{selectedField && (<div className="bg-blue-50/50 rounded-[28px] p-6 border border-blue-100 shadow-inner"><h4 className="text-xs font-black text-blue-900 mb-5">ویرایش: {selectedField.label}</h4>{selectedField.isDropdown && <textarea className="w-full bg-white rounded-xl p-3 font-bold text-xs text-blue-700 outline-none h-20 mb-4" value={selectedField.options?.join(', ') || ''} onChange={(e) => updateField(selectedField.id, { options: e.target.value.split(/[,،\n]/).map(o => o.trim()).filter(Boolean) })} />}<div className="grid grid-cols-2 gap-3 mb-6"><div className="space-y-1"><label className="text-[9px] font-black text-blue-400 block text-center">سایز</label><input type="number" value={selectedField.fontSize} onChange={e => updateField(selectedField.id, { fontSize: Number(e.target.value) })} className="w-full bg-white rounded-xl p-3 text-center font-black text-sm text-blue-700 outline-none" /></div><div className="space-y-1"><label className="text-[9px] font-black text-blue-400 block text-center">عرض</label><input type="number" value={selectedField.width} onChange={e => updateField(selectedField.id, { width: Number(e.target.value) })} className="w-full bg-white rounded-xl p-3 text-center font-black text-sm text-blue-700 outline-none" /></div></div><div className="grid grid-cols-3 bg-white p-1 rounded-xl shadow-sm border border-blue-100/30">{(['L', 'C', 'R'] as TextAlignment[]).map(a => <button key={a} onClick={() => updateField(selectedField.id, { alignment: a })} className={`py-2 rounded-lg text-xs font-black transition-all ${selectedField.alignment === a ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>{a === 'L' ? <AlignLeft size={14} className="mx-auto" /> : a === 'C' ? <AlignCenter size={14} className="mx-auto" /> : <AlignRight size={14} className="mx-auto" />}</button>)}</div></div>)}</>) : (<div className="h-full flex flex-col gap-6"><div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100"><h3 className="text-xs font-black text-blue-900 mb-4">تعریف المان</h3><div className="space-y-4"><input type="text" value={newField.label} placeholder="عنوان فیلد..." onChange={e => setNewField({...newField, label: e.target.value})} className="w-full p-3.5 bg-white rounded-2xl outline-none font-bold text-xs" /><button onClick={() => setNewField({...newField, isDropdown: !newField.isDropdown})} className={`flex items-center gap-3 p-3.5 rounded-2xl w-full border-2 transition-all ${newField.isDropdown ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}><Check size={14} /> فیلد انتخابی</button><button onClick={() => { const id = Date.now().toString(); updatePage({ fields: [...fields, { ...newField, id, key: `f_${id}`, isActive: true, x: 40, y: 40, height: 30, rotation: 0, options: newField.isDropdown ? newField.optionsStr.split(/[,،\n]/).map(o => o.trim()).filter(Boolean) : undefined }] }); setNewField({ label: '', fontSize: 14, width: 150, alignment: 'R', isDropdown: false, optionsStr: '' }); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs shadow-lg">افزودن</button></div></div></div>)}</div><div className="flex-1 bg-slate-200/30 p-8 overflow-auto flex items-start justify-center custom-scrollbar"><div ref={canvasRef} className="bg-white shadow-2xl relative border border-slate-200" style={{ width: activePage.paperSize === PaperSize.A4 ? '595px' : '420px', height: activePage.paperSize === PaperSize.A4 ? '842px' : '595px', backgroundImage: canvasBg ? `url(${canvasBg})` : 'none', backgroundSize: '100% 100%', imageRendering: 'high-quality' }}>{fields.filter(f => f.isActive).map(f => (<div key={f.id} onMouseDown={e => handleDrag(e, f.id)} className={`absolute cursor-move select-none ${selectedFieldId === f.id ? 'z-50' : 'z-10'}`} style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.width}px`, transform: `rotate(${f.rotation}deg)`, fontSize: `${f.fontSize}px`, textAlign: f.alignment === 'L' ? 'left' : f.alignment === 'R' ? 'right' : 'center', display: 'flex', alignItems: 'center', justifyContent: f.alignment === 'L' ? 'flex-start' : f.alignment === 'R' ? 'flex-end' : 'center' }}><div className={`absolute -inset-2 border-2 rounded-lg ${selectedFieldId === f.id ? 'border-blue-500 bg-blue-500/5 shadow-md' : 'border-transparent'}`} /><span className={`relative font-black tracking-tight w-full ${selectedFieldId === f.id ? 'text-blue-700' : 'text-slate-800 opacity-60'}`}>{f.label}</span></div>))}</div></div></div>
    </div>
  );
};

const SettingsPanel = ({ template, setTemplate, userPermissions }: { template: ContractTemplate, setTemplate: (t: any) => void, userPermissions: string[] }) => {
  const [mainTab, setMainTab] = useState<'users' | 'boom' | 'backup'>(() => { if (userPermissions.includes('settings_boom')) return 'boom'; if (userPermissions.includes('settings_users')) return 'users'; return 'backup'; });
  const [activePage, setActivePage] = useState(1);
  const [isDesignUnlocked, setIsDesignUnlocked] = useState(false);
  return (
    <div className="flex flex-col h-[calc(100vh-40px)] animate-in fade-in duration-500"><div className="flex items-center justify-center gap-4 py-6 bg-white border-b border-slate-100">{userPermissions.includes('settings_users') && <button onClick={() => setMainTab('users')} className={`flex items-center gap-3 px-8 py-3.5 rounded-[20px] font-black text-sm transition-all ${mainTab === 'users' ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400'}`}><User size={18}/> کاربران</button>}{userPermissions.includes('settings_boom') && <button onClick={() => setMainTab('boom')} className={`flex items-center gap-3 px-8 py-3.5 rounded-[20px] font-black text-sm transition-all ${mainTab === 'boom' ? 'bg-blue-600 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400'}`}><Layers size={18}/> بوم طراحی</button>}{userPermissions.includes('settings_backup') && <button onClick={() => setMainTab('backup')} className={`flex items-center gap-3 px-8 py-3.5 rounded-[20px] font-black text-sm transition-all ${mainTab === 'backup' ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400'}`}><Database size={18}/> پشتیبان‌گیری</button>}</div><div className="flex-1 overflow-hidden">{mainTab === 'boom' && (isDesignUnlocked ? <DesktopSettings template={template} setTemplate={setTemplate} activePageNum={activePage} activeSubTab="design" setActiveSubTab={()=>{}} onPageChange={setActivePage} /> : <DesignGate onUnlock={() => setIsDesignUnlocked(true)} onCancel={() => setMainTab('users')} />)}{mainTab === 'users' && <UsersManager />}{mainTab === 'backup' && <BackupManager />}</div></div>
  );
};

const ArchivePanel = ({ onEdit, perms, template }: { onEdit: (contract: any) => void, perms: string[], template: ContractTemplate }) => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  useEffect(() => { supabase.from('contracts').select('*').order('timestamp', { ascending: false }).then(({data}) => data && setContracts(data)); }, []);
  return (
    <div className="max-w-5xl mx-auto py-12 px-4 animate-in fade-in zoom-in-95 duration-700 h-full overflow-y-auto custom-scrollbar"><div className="flex justify-between items-center mb-10"><div><h2 className="text-3xl font-black text-slate-800 tracking-tight">بایگانی اسناد صادر شده</h2></div></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">{contracts.map(c => (<div key={c.id} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 hover:shadow-xl transition-all group relative">{c.is_extended && <div className="absolute top-4 left-4 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black z-10">تمدید شده</div>}<div className="flex justify-between items-start mb-6"><div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-black">{c.client_name[0]}</div><div className="flex gap-2"><div className="relative"><button onClick={() => setActiveShareId(activeShareId === c.id ? null : c.id)} className="text-slate-300 hover:text-emerald-500 transition-all p-2 bg-slate-50 rounded-xl"><Share2 size={20}/></button>{activeShareId === c.id && <div className="absolute top-full right-0 mt-2 w-48 bg-white border shadow-2xl rounded-2xl z-[100] animate-in zoom-in-95 p-2"><button onClick={() => handleExportPDF(template, c.form_data, c.client_name, c.form_data?.tazkira || '', true)} className="w-full flex items-center gap-3 p-3 hover:bg-emerald-50 text-emerald-600 rounded-xl text-right text-[11px] font-black"><MessageCircle size={18}/> ارسال واتساپ</button><button onClick={() => handleExportPDF(template, c.form_data, c.client_name, c.form_data?.tazkira || '', false)} className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 text-blue-600 rounded-xl text-right text-[11px] font-black border-t"><Download size={18}/> دانلود PDF</button></div>}</div>{perms.includes('archive_edit') && <button onClick={() => onEdit(c)} className="text-slate-300 hover:text-amber-500 transition-all p-2 bg-slate-50 rounded-xl"><Pencil size={20}/></button>}{perms.includes('archive_print') && <button onClick={() => { onEdit(c); setTimeout(() => window.print(), 100); }} className="text-slate-300 hover:text-blue-600 transition-all p-2 bg-slate-50 rounded-xl"><Printer size={20}/></button>}{perms.includes('archive_delete') && <button onClick={() => { supabase.from('contracts').delete().eq('id', c.id).then(() => window.location.reload()); }} className="text-slate-300 hover:text-red-500 transition-all p-2 bg-slate-50 rounded-xl"><Trash2 size={20}/></button>}</div></div><h4 className="font-black text-xl text-slate-800 mb-2">{c.client_name}</h4><div className="flex flex-col gap-1"><p className="text-[10px] text-slate-400 font-bold">پلاک: {c.form_data?.tazkira || '---'}</p><p className="text-[9px] text-slate-300 font-medium">ثبت: {new Date(c.timestamp).toLocaleDateString('fa-IR')}</p></div></div>))}</div></div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('workspace');
  const [editingContract, setEditingContract] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const DEFAULT_TEMPLATE: ContractTemplate = { id: 'default', pages: [ { pageNumber: 1, paperSize: PaperSize.A4, fields: INITIAL_FIELDS, showBackgroundInPrint: true }, { pageNumber: 2, paperSize: PaperSize.A4, fields: [], showBackgroundInPrint: true }, { pageNumber: 3, paperSize: PaperSize.A4, fields: [], showBackgroundInPrint: true } ] };
  const [template, setTemplate] = useState<ContractTemplate>(DEFAULT_TEMPLATE);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('asra_gps_session_v2');
    if (saved) setCurrentUser(JSON.parse(saved));
    Promise.all([supabase.from('roles').select('*'), supabase.from('settings').select('*').eq('key', 'contract_template')]).then(([r, s]) => {
      if (r.data) setRoles(r.data);
      if (s.data?.[0]) setTemplate({ ...DEFAULT_TEMPLATE, ...s.data[0].value });
      setInitializing(false);
    });
  }, []);

  const userPermissions = useMemo(() => { const role = roles.find(r => r.id === currentUser?.role_id); return role ? role.perms : []; }, [currentUser, roles]);
  const handleLogin = (user: any) => { setCurrentUser(user); localStorage.setItem('asra_gps_session_v2', JSON.stringify(user)); };
  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('asra_gps_session_v2'); };

  if (initializing) return <div className="fixed inset-0 bg-slate-50 flex items-center justify-center font-black text-slate-400">در حال بارگذاری سیستم...</div>;
  if (!currentUser) return <LoginForm onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-[#FDFDFD] font-sans overflow-hidden select-none" dir="rtl">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userPermissions={userPermissions} onLogout={handleLogout} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative no-print">
        <div className="flex-1 overflow-hidden h-full">
          {activeTab === 'workspace' && <Workspace template={template} editData={editingContract} onEditCancel={() => setEditingContract(null)} perms={userPermissions} formData={formData} setFormData={setFormData} />}
          {activeTab === 'settings' && <SettingsPanel template={template} setTemplate={setTemplate} userPermissions={userPermissions} />}
          {activeTab === 'archive' && <ArchivePanel onEdit={(c) => { setEditingContract(c); setActiveTab('workspace'); }} perms={userPermissions} template={template} />}
          {activeTab === 'reports' && <ReportsPanel perms={userPermissions} />}
          {activeTab === 'accounting' && <AccountingPanel perms={userPermissions} />}
        </div>
      </main>
      <PrintLayout template={template} formData={formData} />
      <Toast />
      <style>{`@font-face { font-family: 'Vazirmatn'; font-display: swap; } .custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }`}</style>
    </div>
  );
}
