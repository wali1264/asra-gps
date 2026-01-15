
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Layout, FileText, Settings, Archive, User, Search, Printer, Plus, Save, Move, RotateCw, Upload, Trash2, AlignLeft, AlignCenter, AlignRight, Grid, List, Layers, PlusCircle, ChevronDown, Files, UserPlus, X, ChevronLeft, CheckCircle2, Type, Maximize2, Bell, Pencil, ShieldCheck, Database, Download, FileJson, Key, Check, Lock, LogOut, UserCheck, Shield, Eye, EyeOff, Repeat, Phone, CreditCard, UserCircle, ZoomIn, ZoomOut, ChevronUp, Info, BookMarked, Copy, Wallet, ArrowUpCircle, ArrowDownCircle, Calculator, TrendingUp, TrendingDown, Clock, Users, Share2, MessageCircle, BarChart3, Calendar, Filter, UserPlus2, Forward, CalendarClock, Image as ImageIcon, ImageOff } from 'lucide-react';
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

// --- Smart Reports Logic ---
const ReportsPanel = () => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'main' | 'extended'>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [quickFilter, setQuickFilter] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');

  useEffect(() => {
    fetchReportData();
  }, [quickFilter, dateRange, filterType]);

  const fetchReportData = async () => {
    setLoading(true);
    let query = supabase.from('contracts').select('*');

    const now = new Date();
    let startDate = new Date();

    if (quickFilter === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (quickFilter === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (quickFilter === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (quickFilter === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else if (quickFilter === 'custom' && dateRange.start) {
      startDate = new Date(dateRange.start);
    }

    if (quickFilter !== 'custom' || dateRange.start) {
      query = query.gte('timestamp', startDate.toISOString());
    }
    
    if (quickFilter === 'custom' && dateRange.end) {
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      query = query.lte('timestamp', end.toISOString());
    }

    if (filterType === 'main') query = query.eq('is_extended', false);
    if (filterType === 'extended') query = query.eq('is_extended', true);

    const { data } = await query.order('timestamp', { ascending: false });
    if (data) setContracts(data);
    setLoading(false);
  };

  const stats = useMemo(() => {
    const mainCount = contracts.filter(c => !c.is_extended).length;
    const extCount = contracts.filter(c => c.is_extended).length;
    return { total: contracts.length, mainCount, extCount };
  }, [contracts]);

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">گزارشات هوشمند</h2>
          <p className="text-slate-400 font-bold">تحلیل عملکرد و آمارهای ثبت خدمات</p>
        </div>
        
        <div className="bg-white p-2 rounded-[28px] shadow-sm border border-slate-100 flex items-center gap-1">
          {[
            { id: 'today', label: 'امروز' },
            { id: 'week', label: 'هفته' },
            { id: 'month', label: 'ماه' },
            { id: 'year', label: 'سال' },
            { id: 'custom', label: 'سفارشی' },
          ].map(f => (
            <button 
              key={f.id} 
              onClick={() => setQuickFilter(f.id as any)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${quickFilter === f.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4 text-blue-600"><BarChart3 size={20}/> <span className="text-[10px] font-black uppercase tracking-widest">کل خدمات</span></div>
            <p className="text-4xl font-black text-slate-800">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4 text-indigo-600"><FileText size={20}/> <span className="text-[10px] font-black uppercase tracking-widest">قرارداد اصلی</span></div>
            <p className="text-4xl font-black text-slate-800">{stats.mainCount}</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4 text-emerald-600"><Repeat size={20}/> <span className="text-[10px] font-black uppercase tracking-widest">تمدیدی‌ها</span></div>
            <p className="text-4xl font-black text-slate-800">{stats.extCount}</p>
          </div>
        </div>
      </div>

      {quickFilter === 'custom' && (
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 mb-8 flex flex-wrap gap-6 animate-in slide-in-from-top-4">
           <div className="flex-1 min-w-[200px] space-y-2">
              <label className="text-[10px] font-black text-slate-400 mr-2 uppercase">از تاریخ</label>
              <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
           </div>
           <div className="flex-1 min-w-[200px] space-y-2">
              <label className="text-[10px] font-black text-slate-400 mr-2 uppercase">تا تاریخ</label>
              <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none font-bold text-sm" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
           </div>
        </div>
      )}

      <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="p-6 border-b flex items-center justify-between bg-slate-50/50">
           <h4 className="font-black text-slate-800 flex items-center gap-2"><List size={18}/> ریز گزارش قراردادها</h4>
           <div className="flex bg-white p-1 rounded-xl border border-slate-100">
              <button onClick={() => setFilterType('all')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${filterType === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>همه</button>
              <button onClick={() => setFilterType('main')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${filterType === 'main' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>اصلی</button>
              <button onClick={() => setFilterType('extended')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${filterType === 'extended' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>تمدیدی</button>
           </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
           {loading ? (
             <div className="h-full flex items-center justify-center text-slate-300 font-black animate-pulse">در حال تحلیل داده‌ها...</div>
           ) : contracts.length > 0 ? (
             <div className="space-y-4">
                {contracts.map(c => (
                  <div key={c.id} className="p-6 bg-white border border-slate-100 rounded-[32px] flex items-center justify-between hover:bg-slate-50 transition-all">
                     <div className="flex items-center gap-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${c.is_extended ? 'bg-emerald-500' : 'bg-blue-600'}`}>
                           {c.is_extended ? <Repeat size={18}/> : <FileText size={18}/>}
                        </div>
                        <div>
                           <h5 className="font-black text-slate-800">{c.client_name}</h5>
                           <p className="text-[10px] font-bold text-slate-400">پلاک: {c.form_data?.tazkira || '---'}</p>
                        </div>
                     </div>
                     <div className="text-left">
                        <p className="text-xs font-black text-slate-700">{new Date(c.timestamp).toLocaleDateString('fa-IR')}</p>
                        <p className={`text-[9px] font-black mt-1 ${c.is_extended ? 'text-emerald-500' : 'text-blue-500'}`}>{c.is_extended ? 'تمدید خدمات' : 'قرارداد اولیه'}</p>
                     </div>
                  </div>
                ))}
             </div>
           ) : (
             <div className="h-full flex items-center justify-center text-slate-300 font-black italic">در این بازه زمانی تراکنشی یافت نشد</div>
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
const AccountingPanel = ({ perms, currentUser }: { perms: string[], currentUser: any }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<'charge' | 'payment'>('charge');
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const isAdmin = currentUser?.username === 'admin';

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
    return clients.filter(c => c.name.toLowerCase().includes(lower) || c.tazkira.toLowerCase().includes(lower));
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

      {/* Ledger Table - Unlocked Height for Vertical Growth */}
      <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden flex flex-col mb-10 mt-8 h-auto">
         <div className="grid grid-cols-2 border-b">
            <div className="p-6 bg-red-50/30 border-l flex items-center justify-between"><h4 className="font-black text-red-700 flex items-center gap-2"><ArrowDownCircle size={18}/> لیست بدهی‌ها (مخارج)</h4></div>
            <div className="p-6 bg-emerald-50/30 flex items-center justify-between"><h4 className="font-black text-emerald-700 flex items-center gap-2"><ArrowUpCircle size={18}/> لیست پرداختی‌ها (درآمد)</h4></div>
         </div>
         <div className="grid grid-cols-2 divide-x divide-x-reverse h-auto">
            {/* Charges Column */}
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
            {/* Payments Column */}
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
const handleExportPDF = async (template: ContractTemplate, formData: Record<string, string>, clientName: string, plate: string, activeFont: string, isWhatsApp: boolean = false) => {
  const container = document.getElementById('pdf-export-container');
  if (!container) return;
  
  showToast('در حال آماده‌سازی فایل هوشمند...');
  
  container.innerHTML = '';
  
  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

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

    if (page.bgImage && page.showBackgroundInPrint) {
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
      fieldEl.style.fontFamily = activeFont || 'Vazirmatn';
      fieldEl.style.fontWeight = '900';
      fieldEl.style.color = 'black';
      fieldEl.style.textAlign = field.alignment === 'L' ? 'left' : field.alignment === 'R' ? 'right' : 'center';
      fieldEl.style.transform = `rotate(${field.rotation}deg)`;
      fieldEl.style.whiteSpace = 'nowrap';
      fieldEl.innerText = formData[field.key] || '';
      pageEl.appendChild(fieldEl);
    });

    container.appendChild(pageEl);

    const canvas = await (window as any).html2canvas(pageEl, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

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
      await navigator.share({
        files: [file],
        title: 'قرارداد اسراء GPS',
        text: `قرارداد مشتری: ${clientName} - پلاک: ${plate}`
      });
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
const PrintLayout = ({ template, formData, activeFont }: { template: ContractTemplate, formData: Record<string, string>, activeFont: string }) => {
  const [localBgs, setLocalBgs] = useState<Record<number, string>>({});

  useEffect(() => {
    const loadImages = async () => {
      const bgs: Record<number, string> = {};
      if (template.pages) {
        for (const page of template.pages) {
          if (page.bgImage) {
            bgs[page.pageNumber] = await cacheImage(page.bgImage);
          }
        }
      }
      setLocalBgs(bgs);
    };
    loadImages();
  }, [template.pages]);

  const masterPaperSize = template.pages?.[0]?.paperSize || PaperSize.A4;
  const isMasterA4 = masterPaperSize === PaperSize.A4;
  
  if (!template.pages || template.pages.length === 0) return null;

  return ReactDOM.createPortal(
    <div className="print-root-layer">
      {template.pages.map((page, index) => {
        const activeFields = page.fields?.filter(f => f.isActive) || [];
        if (activeFields.length === 0 && index > 0) return null;

        return (
          <div 
            key={`print-page-${index}`} 
            className="print-page-unit"
            style={{ 
              width: isMasterA4 ? '210mm' : '148mm', 
              height: isMasterA4 ? '297mm' : '210mm',
              backgroundImage: page.showBackgroundInPrint && localBgs[page.pageNumber] ? `url(${localBgs[page.pageNumber]})` : 'none',
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              imageRendering: 'crisp-edges'
            }}
          >
            {activeFields.map((field) => (
              <div
                key={`field-${field.id}`}
                className="print-field"
                style={{
                  left: `${field.x}%`,
                  top: `${field.y}%`,
                  width: `${field.width}px`,
                  transform: `rotate(${field.rotation}deg)`,
                  fontSize: `${field.fontSize}px`,
                  textAlign: field.alignment === 'L' ? 'left' : field.alignment === 'R' ? 'right' : 'center',
                  justifyContent: field.alignment === 'L' ? 'flex-start' : field.alignment === 'R' ? 'flex-end' : 'center',
                }}
              >
                <span className="print-text-content" style={{ fontFamily: activeFont || 'Vazirmatn' }}>
                  {formData[field.key] || ''}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>,
    document.body
  );
};

const Sidebar = ({ activeTab, setActiveTab, userPermissions, onLogout, currentUser }: { activeTab: string, setActiveTab: (t: string) => void, userPermissions: string[], onLogout: () => void, currentUser: any }) => {
  const isAdmin = currentUser?.username === 'admin';
  const isStrictEmployee = currentUser?.role_id === 'employee_role';
  
  const menuItems = [
    { id: 'workspace', icon: Layout, label: 'میز کار', perm: 'workspace' },
    { id: 'archive', icon: Archive, label: 'بایگانی', perm: 'archive' },
    { id: 'accounting', icon: Wallet, label: 'امور مالی', perm: 'accounting' },
    { id: 'reports', icon: BarChart3, label: 'گزارشات', perm: 'reports' },
    { id: 'settings', icon: Settings, label: 'تنظیمات', perm: 'settings' }
  ].filter(item => {
    // Priority 1: Admin sees everything
    if (isAdmin) return true;
    // Priority 2: System Employee role is forced to specific menus
    if (isStrictEmployee) return item.id === 'archive' || item.id === 'workspace';
    // Priority 3: Custom roles see what is checked in their permissions
    return userPermissions.includes(item.perm);
  });

  return (
    <aside className="w-20 md:w-64 bg-slate-900 text-white min-h-screen flex flex-col p-4 no-print transition-all">
      <div className="flex items-center gap-3 mb-10 px-2 overflow-hidden">
        <div className="bg-white p-1 rounded-xl shadow-lg flex-shrink-0 flex items-center justify-center">
          <AsraLogo size={36} />
        </div>
        <h1 className="text-2xl font-black hidden md:block tracking-tight text-white whitespace-nowrap">اسراء GPS</h1>
      </div>
      <nav className="flex flex-col gap-2 flex-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 ${
              activeTab === item.id ? 'bg-blue-600 shadow-lg shadow-blue-900/20 scale-[1.02]' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <item.icon size={20} />
            <span className="hidden md:block font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-2">
        <div className="bg-slate-800/50 p-4 rounded-2xl mb-2 hidden md:block">
           <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-xs">{currentUser?.username?.[0]?.toUpperCase()}</div>
              <div className="flex flex-col overflow-hidden">
                 <span className="text-[10px] font-black text-blue-400 uppercase leading-none mb-1">کاربر فعلی</span>
                 <span className="text-xs font-black text-white truncate">{currentUser?.username}</span>
              </div>
           </div>
           {isAdmin && <span className="text-[8px] font-black bg-white/10 text-white px-2 py-0.5 rounded uppercase tracking-widest">Super Admin</span>}
           {isStrictEmployee && <span className="text-[8px] font-black bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded uppercase tracking-widest">Employee Mode</span>}
           {!isAdmin && !isStrictEmployee && <span className="text-[8px] font-black bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded uppercase tracking-widest">Custom Role</span>}
        </div>
        <button onClick={onLogout} className="flex items-center gap-3 p-4 rounded-2xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all">
          <LogOut size={20} />
          <span className="hidden md:block font-medium">خروج از سیستم</span>
        </button>
      </div>
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
    const { data, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (data) onLogin(data);
    else { setError(true); setTimeout(() => setError(false), 2000); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-100 flex items-center justify-center p-6 z-[2000]">
      <div className="bg-white w-full max-w-md p-10 rounded-[48px] shadow-2xl border border-white animate-in zoom-in-95 duration-500 text-center">
        <div className="w-28 h-28 bg-white text-blue-600 rounded-[36px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-100 p-4 border border-blue-50">
           <AsraLogo size={80} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-2">ورود به اسراء GPS</h2>
        <p className="text-slate-400 font-medium mb-10">سامانه مدیریت هوشمند ردیاب‌ها</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <User className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input type="text" placeholder="نام کاربری" className="w-full pr-14 pl-6 py-5 bg-slate-50 rounded-[24px] outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-bold text-lg" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="relative">
            <Key className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input type="password" placeholder="رمز عبور" className="w-full pr-14 pl-6 py-5 bg-slate-50 rounded-[24px] outline-none border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-bold text-lg" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-red-500 font-black text-xs animate-bounce">اطلاعات کاربری اشتباه است</p>}
          <button disabled={loading} className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-black text-xl shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all mt-4 disabled:opacity-50">
            {loading ? 'در حال تایید...' : 'ورود به پنل عملیاتی'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Custom Popover Select for Dropdowns ---
const CustomSelect = ({ field, value, onSelect, zoom, onClose, activeFont }: { field: ContractField, value: string, onSelect: (val: string) => void, zoom: number, onClose: () => void, activeFont: string }) => {
  const options = field.options || [];
  return (
    <div 
      className="absolute z-[100] bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-right"
      style={{ 
        width: `${field.width * zoom}px`,
        top: '100%',
        marginTop: '4px',
        maxHeight: '200px',
        overflowY: 'auto'
      }}
    >
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(opt);
            onClose();
          }}
          className={`w-full p-3 text-sm font-bold transition-all text-right border-b border-slate-50 last:border-0 hover:bg-blue-50 ${value === opt ? 'bg-blue-100 text-blue-700' : 'text-slate-700'}`}
          style={{ fontSize: `${field.fontSize * zoom}px`, fontFamily: activeFont || 'Vazirmatn' }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
};

// --- Visual Workspace Component ---
const VisualCanvasPage = ({ 
  page, 
  formData, 
  setFormData, 
  zoom, 
  activeFieldKey, 
  setActiveFieldKey,
  activeFont
}: { 
  page: ContractPage, 
  formData: Record<string, string>, 
  setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  zoom: number,
  activeFieldKey: string | null,
  setActiveFieldKey: (key: string | null) => void,
  activeFont: string
}) => {
  const [localBg, setLocalBg] = useState<string>('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (page.bgImage) {
      cacheImage(page.bgImage).then(url => {
        setLocalBg(url);
      });
    }
  }, [page.bgImage]);

  useEffect(() => {
    const activeFields = (page.fields || []).filter(f => f.isActive && f.isDropdown && f.options && f.options.length > 0);
    let updated = false;
    const newFormData = { ...formData };
    activeFields.forEach(f => {
      if (!newFormData[f.key]) {
        newFormData[f.key] = f.options![0];
        updated = true;
      }
    });
    if (updated) setFormData(newFormData);
  }, [page.fields]);

  const activeFields = (page.fields || []).filter(f => f.isActive);

  const handleKeyDown = (e: React.KeyboardEvent, currentField: ContractField) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const allActiveFields = page.fields.filter(f => f.isActive);
      const currentIndex = allActiveFields.findIndex(f => f.key === currentField.key);
      if (currentIndex < allActiveFields.length - 1) {
        const nextField = allActiveFields[currentIndex + 1];
        setActiveFieldKey(nextField.key);
        if (nextField.isDropdown) {
          setOpenDropdown(nextField.key);
        } else {
          setOpenDropdown(null);
          setTimeout(() => {
             const nextInput = document.querySelector(`input[data-field-key="${nextField.key}"]`) as HTMLInputElement;
             nextInput?.focus();
          }, 10);
        }
      }
    }
  };

  const isA4 = page.paperSize === PaperSize.A4;
  const baseWidth = isA4 ? 595 : 420; 
  const baseHeight = isA4 ? 842 : 595;

  return (
    <div 
      className="relative mx-auto bg-white shadow-2xl border border-slate-200 transition-all duration-500 origin-top overflow-hidden"
      style={{ 
        width: `${baseWidth * zoom}px`, 
        height: `${baseHeight * zoom}px`,
        backgroundImage: localBg ? `url(${localBg})` : 'none',
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        imageRendering: 'high-quality',
        WebkitFontSmoothing: 'antialiased'
      }}
      onClick={() => {
        setActiveFieldKey(null);
        setOpenDropdown(null);
      }}
    >
      {activeFields.map((field) => (
        <div
          key={field.id}
          className={`absolute flex transition-all duration-300 ${activeFieldKey === field.key ? 'z-50' : 'z-10'} cursor-pointer`}
          style={{
            left: `${field.x}%`,
            top: `${field.y}%`,
            width: `${field.width * zoom}px`,
            height: `${(field.height || 30) * zoom}px`,
            transform: `rotate(${field.rotation}deg)`,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: field.alignment === 'L' ? 'flex-start' : field.alignment === 'R' ? 'flex-end' : 'center',
          }}
          onClick={(e) => {
            e.stopPropagation();
            setActiveFieldKey(field.key);
            if (field.isDropdown) setOpenDropdown(field.key);
            else setOpenDropdown(null);
          }}
        >
          <div className={`absolute -inset-[2px] border-2 transition-all duration-300 pointer-events-none ${
            activeFieldKey === field.key 
              ? 'border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)] opacity-100' 
              : 'border-transparent opacity-0'
          }`} />
          
          {field.isDropdown ? (
            <div 
              className="w-full h-full flex items-start gap-1 overflow-hidden"
              style={{
                justifyContent: field.alignment === 'L' ? 'flex-start' : field.alignment === 'R' ? 'flex-end' : 'center',
              }}
            >
               <span 
                className="font-bold text-slate-800 whitespace-nowrap truncate"
                style={{ 
                  fontSize: `${field.fontSize * zoom}px`,
                  fontFamily: activeFont || 'Vazirmatn',
                  textAlign: field.alignment === 'L' ? 'left' : field.alignment === 'R' ? 'right' : 'center',
                  lineHeight: 1,
                  padding: 0,
                  marginTop: 0
                }}
               >
                 {formData[field.key] || (field.options?.[0] || '')}
               </span>
               <ChevronDown size={12 * zoom} className="text-slate-400 flex-shrink-0 mt-0.5" />
            </div>
          ) : (
            <input
              data-field-key={field.key}
              type="text"
              value={formData[field.key] || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
              onFocus={() => {
                setActiveFieldKey(field.key);
                setOpenDropdown(null);
              }}
              onKeyDown={(e) => handleKeyDown(e, field)}
              className="w-full bg-transparent border-none outline-none font-bold text-slate-800 p-0 m-0"
              style={{
                fontSize: `${field.fontSize * zoom}px`,
                fontFamily: activeFont || 'Vazirmatn',
                textAlign: field.alignment === 'L' ? 'left' : field.alignment === 'R' ? 'right' : 'center',
                lineHeight: 1,
                height: '100%',
                padding: 0,
                boxSizing: 'border-box',
                appearance: 'none',
                WebkitAppearance: 'none'
              }}
            />
          )}

          {openDropdown === field.key && field.isDropdown && (
            <CustomSelect 
              field={field} 
              value={formData[field.key] || ''} 
              onSelect={(val) => setFormData(p => ({ ...p, [field.key]: val }))}
              zoom={zoom}
              onClose={() => setOpenDropdown(null)}
              activeFont={activeFont}
            />
          )}
        </div>
      ))}
    </div>
  );
};

const Workspace = ({ template, editData, onEditCancel, perms, formData, setFormData, currentUser, activeFont, setActiveFont }: { template: ContractTemplate, editData?: any, onEditCancel?: () => void, perms: string[], formData: Record<string, string>, setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>, currentUser: any, activeFont: string, setActiveFont: (f: string) => void }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClientDetailsOpen, setIsClientDetailsOpen] = useState(false);
  const [isClientManagerOpen, setIsClientManagerOpen] = useState(false);
  const [visiblePages, setVisiblePages] = useState<number[]>([1]);
  const [zoom, setZoom] = useState(1.4);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [expiryDuration, setExpiryDuration] = useState<6 | 12>(12);
  const [isExpiryMenuOpen, setIsExpiryMenuOpen] = useState(false);
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [duplicatePlateError, setDuplicatePlateError] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientProfile | null>(null);
  
  const isAdmin = currentUser?.username === 'admin';
  const isStrictEmployee = currentUser?.role_id === 'employee_role';
  
  // Rules for Employee: Only assigned contracts. No new creation. No search.
  const canSearch = !isStrictEmployee && (isAdmin || perms.includes('workspace_search'));
  const canCreate = !isStrictEmployee && (isAdmin || perms.includes('workspace_create'));
  const canEditInWorkspace = isAdmin || perms.includes('archive_edit') || isStrictEmployee; // Employee MUST be able to edit their assigned work

  const FONT_OPTIONS = [
    { name: 'Vazirmatn', label: 'وزیر متن (استاندارد)' },
    { name: 'Bahij Nazanin', label: 'بهیج نازنین (رسمی)' },
    { name: 'Lalezar', label: 'لاله‌زار (ضخیم)' }
  ];

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClient && workspaceRef.current) {
        const calculateAutoZoom = () => {
            const containerWidth = workspaceRef.current?.offsetWidth || 1000;
            const targetWidth = containerWidth * 0.85;
            const isA4 = template.pages?.[0]?.paperSize === PaperSize.A4;
            const baseWidth = isA4 ? 595 : 420;
            const idealZoom = targetWidth / baseWidth;
            setZoom(Math.min(2.0, Math.max(0.6, idealZoom)));
        };
        calculateAutoZoom();
        window.addEventListener('resize', calculateAutoZoom);
        return () => window.removeEventListener('resize', calculateAutoZoom);
    }
  }, [selectedClient, template.pages]);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (data) setClients(data);
  };

  useEffect(() => {
    if (selectedClient && !editData) {
      const applyAutoFields = async () => {
        const newFormData = { ...formData };
        let hasChanges = false;
        const today = new Date().toLocaleDateString('fa-IR');
        const { count, error: countError } = await supabase.from('contracts').select('*', { count: 'exact', head: true });
        const serialNum = countError ? '1' : ((count || 0) + 1).toString();

        (template.pages || []).forEach(page => {
          page.fields.forEach(field => {
            if (field.isActive) {
              const lowerKey = field.key.toLowerCase();
              const lowerLabel = field.label.toLowerCase();
              if (lowerKey.includes('date') || lowerLabel.includes('تاریخ')) {
                if (!newFormData[field.key]) { newFormData[field.key] = today; hasChanges = true; }
              }
              if (lowerKey.includes('serial') || lowerLabel.includes('مسلسل') || lowerLabel.includes('شماره قرارداد')) {
                if (!newFormData[field.key]) { newFormData[field.key] = serialNum; hasChanges = true; }
              }
            }
          });
        });
        if (hasChanges) setFormData(newFormData);
      };
      applyAutoFields();
    }
  }, [selectedClient, editData, template.pages]);

  useEffect(() => {
    if (editData && clients.length > 0) {
      const client = clients.find(c => c.id === editData.client_id || c.id === editData.clientId);
      if (client) {
        setSelectedClient(client);
        setFormData(editData.form_data || editData.formData || {});
        const pagesWithData = (template.pages || [])
          .filter(p => p.fields?.some(f => (editData.form_data || editData.formData)?.[f.key]))
          .map(p => p.pageNumber);
        setVisiblePages(pagesWithData.length > 0 ? pagesWithData : [1]);
      }
    }
  }, [editData, clients, template.pages]);

  const filteredClients = useMemo(() => {
    if (!canSearch) return [];
    const lowerSearch = searchTerm.toLowerCase().trim();
    if (!lowerSearch) return [];
    return clients.filter(c => c.name.toLowerCase().includes(lowerSearch) || (c.tazkira && c.tazkira.toLowerCase().includes(lowerSearch)));
  }, [clients, searchTerm, canSearch]);

  const handleCreateClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canCreate) { showToast('شما دسترسی ایجاد پرونده ندارید'); return; }
    if (duplicatePlateError && !editingClient) { showToast('شماره پلاک تکراری است'); return; }
    
    const data = new FormData(e.currentTarget);
    const clientData = { 
      name: data.get('name') as string, 
      father_name: data.get('fatherName') as string, 
      tazkira: data.get('tazkira') as string, 
      phone: data.get('phone') as string 
    };

    if (!clientData.name || !clientData.tazkira) { showToast('لطفاً فیلدهای ضروری را پر کنید'); return; }

    if (editingClient) {
      const { error } = await supabase.from('clients').update(clientData).eq('id', editingClient.id);
      if (!error) {
        showToast('اطلاعات مشتری بروزرسانی شد');
        setEditingClient(null);
      }
    } else {
      const { error } = await supabase.from('clients').insert([{ id: Date.now().toString(), ...clientData }]);
      if (!error) {
        showToast('پرونده دیجیتال مشتری ایجاد شد');
      }
    }

    await fetchClients();
    setIsModalOpen(false);
  };

  const checkAndDeleteClient = async (client: ClientProfile) => {
    const { count: contractCount } = await supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('client_id', client.id);
    if (contractCount && contractCount > 0) {
      showToast('خطا: این مشتری دارای قرارداد ثبت شده است و حذف نمی‌شود');
      return;
    }

    const { count: transCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('client_id', client.id);
    if (transCount && transCount > 0) {
      showToast('خطا: این مشتری دارای سوابق مالی است و حذف نمی‌شود');
      return;
    }

    if (window.confirm(`آیا از حذف پرونده ${client.name} اطمینان دارید؟`)) {
      const { error } = await supabase.from('clients').delete().eq('id', client.id);
      if (!error) {
        showToast('پرونده مشتری با موفقیت حذف گردید');
        fetchClients();
      }
    }
  };

  const handleSaveContract = async (isExtension: boolean = false) => {
    if (!selectedClient) return;
    if (!canCreate && !editData) return;
    if (editData && !isExtension && !canEditInWorkspace) { showToast('دسترسی ویرایش قرارداد را ندارید'); return; }
    
    const expDate = new Date();
    expDate.setMonth(expDate.getMonth() + expiryDuration);

    if (editData && !isExtension) {
      const { error } = await supabase.from('contracts').update({ 
        form_data: formData, 
        timestamp: new Date().toISOString(),
        expiry_date: expDate.toISOString()
      }).eq('id', editData.id);
      if (!error) showToast('تغییرات قرارداد بروزرسانی شد');
    } else {
      const assignedToId = currentUser.username === 'admin' ? null : currentUser.id;
      const newEntry = { 
        id: Date.now().toString(), 
        client_id: selectedClient.id, 
        client_name: selectedClient.name, 
        form_data: formData, 
        timestamp: new Date().toISOString(), 
        expiry_date: expDate.toISOString(),
        template_id: template.id, 
        is_extended: isExtension,
        assigned_to: assignedToId
      };
      const { error } = await supabase.from('contracts').insert([newEntry]);
      if (!error) showToast(isExtension ? 'قرارداد تمدید و به عنوان سند جدید ثبت شد' : 'قرارداد با موفقیت در بایگانی ثبت شد');
    }
    resetWorkspace();
  };

  const handleSaveAsPreset = () => {
    localStorage.setItem('asra_gps_preset', JSON.stringify(formData));
    showToast('اطلاعات فعلی به عنوان پیش‌نویس (قالب) ذخیره شد');
  };

  const handleLoadPreset = () => {
    const saved = localStorage.getItem('asra_gps_preset');
    if (saved) {
        setFormData(JSON.parse(saved));
        showToast('قالب پیش‌نویس فراخوانی شد');
    } else {
        showToast('هیچ پیش‌نویسی ذخیره نشده است');
    }
  };

  const resetWorkspace = () => { setSelectedClient(null); setFormData({}); setVisiblePages([1]); if (onEditCancel) onEditCancel(); };

  const checkPlateDuplicate = (val: string) => {
    if (editingClient) return;
    if (!val.trim()) { setDuplicatePlateError(false); return; }
    const normalized = val.trim().replace(/[\s-]/g, '').toLowerCase();
    const exists = clients.some(c => c.tazkira && c.tazkira.trim().replace(/[\s-]/g, '').toLowerCase() === normalized);
    setDuplicatePlateError(exists);
  };

  if (!selectedClient) {
    return (
      <div className="max-w-4xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-4 no-print h-full overflow-y-auto custom-scrollbar">
        {isAdmin && (
          <div className="fixed top-24 left-8 z-[50]">
            <button 
              onClick={() => setIsClientManagerOpen(true)}
              className="w-14 h-14 bg-white border border-slate-100 rounded-full shadow-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-110 transition-all group"
            >
              <Users size={24} />
              <div className="absolute -bottom-10 right-0 bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">مدیریت مشتریان</div>
            </button>
          </div>
        )}

        {(canSearch || canCreate) ? (
          <>
            <div className="text-center mb-12 pt-10">
              <div className="w-40 h-40 bg-white rounded-[48px] flex items-center justify-center mx-auto mb-6 shadow-2xl p-4 border border-slate-50">
                 <AsraLogo size={120} />
              </div>
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">میز کار اسراء GPS</h2>
              <p className="text-slate-500 font-medium text-lg italic opacity-80">سامانه هوشمند ثبت و تمدید خدمات ردیابی</p>
            </div>
            <div className="flex gap-5 items-center px-4">
              <div className="relative flex-1 group">
                <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={24} />
                <input disabled={!canSearch} type="text" placeholder={canSearch ? "جستجوی نام یا شماره پلاک مشتری..." : "شما دسترسی جستجو ندارید"} className={`w-full pr-16 pl-8 py-6 bg-white border-2 border-slate-100 rounded-[32px] shadow-sm outline-none transition-all text-xl font-medium ${!canSearch ? 'opacity-50 grayscale cursor-not-allowed' : 'focus:border-blue-500 focus:shadow-[0_20px_50px_rgba(59,130,246,0.1)]'}`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              {canCreate && (
                <button onClick={() => { setEditingClient(null); setIsModalOpen(true); setDuplicatePlateError(false); }} className="bg-blue-600 text-white p-6 rounded-[32px] shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-105 transition-all flex items-center gap-3 group">
                    <UserPlus size={28} />
                    <span className="hidden md:block font-black text-lg">تشکیل پرونده</span>
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-300 font-black flex-col gap-6 italic">
             <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100"><Layout size={60} className="opacity-20"/></div>
             <p className="text-xl">میز کار در انتظار عملیات از بایگانی است.</p>
             <p className="text-xs opacity-50 not-italic">لطفاً از بخش بایگانی، قرارداد مورد نظر را برای چاپ انتخاب کنید.</p>
          </div>
        )}
        
        {searchTerm && canSearch && (
          <div className="mt-8 bg-white/80 backdrop-blur-xl rounded-[40px] border border-white/50 shadow-2xl overflow-hidden animate-in zoom-in-95 mx-4 mb-20">
            <div className="p-5 bg-slate-50/50 border-b text-xs font-black text-slate-400 uppercase tracking-widest">نتایج یافت شده در بایگانی</div>
            {filteredClients.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {filteredClients.map(client => (
                  <div key={client.id} onClick={() => setSelectedClient(client)} className="p-8 flex items-center justify-between hover:bg-blue-50/40 cursor-pointer transition-all group">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-[24px] bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">{client.name[0]}</div>
                      <div>
                        <h4 className="font-black text-xl text-slate-800 mb-1">{client.name}</h4>
                        <div className="flex gap-4 text-sm font-medium text-slate-400">
                           <span>پدر: {client.father_name || client.fatherName}</span>
                           <span className="opacity-30">|</span>
                           <span>پلاک: {client.tazkira}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronLeft className="text-slate-300" />
                  </div>
                ))}
              </div>
            ) : ( <div className="p-14 text-center text-slate-400 font-bold">هیچ پرونده‌ای یافت نشد.</div> )}
          </div>
        )}

        {isClientManagerOpen && (
          <div className="fixed inset-0 z-[1000] flex flex-col bg-[#f8fafc] animate-in slide-in-from-bottom duration-500">
            <div className="bg-white border-b px-8 py-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Users size={24}/></div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">بانک اطلاعاتی مشتریان</h3>
                  <p className="text-xs font-bold text-slate-400">لیست تمامی پرونده‌های ثبت شده در سیستم</p>
                </div>
              </div>
              <button onClick={() => setIsClientManagerOpen(false)} className="p-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
              <div className="max-w-6xl mx-auto">
                <div className="relative mb-10 group">
                  <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={24} />
                  <input 
                    type="text" 
                    placeholder="جستجوی پلاک یا نام در کل سیستم..." 
                    className="w-full pr-16 pl-8 py-6 bg-white border border-slate-200 rounded-[32px] shadow-sm outline-none text-xl font-bold transition-all focus:border-blue-600 focus:shadow-xl focus:shadow-blue-50"
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {clients.filter(c => 
                    !searchTerm || 
                    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    c.tazkira.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map(client => (
                    <div key={client.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-black">{client.name[0]}</div>
                        <div className="flex gap-2">
                           {(canCreate) && (
                             <button 
                              onClick={() => { setEditingClient(client); setIsModalOpen(true); setIsClientManagerOpen(false); }}
                              className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                             >
                              <Pencil size={18}/>
                             </button>
                           )}
                           {isAdmin && (
                             <button 
                              onClick={() => checkAndDeleteClient(client)}
                              className="p-3 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                             >
                              <Trash2 size={18}/>
                             </button>
                           )}
                        </div>
                      </div>
                      
                      <h4 className="text-xl font-black text-slate-800 mb-4">{client.name}</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm font-bold text-slate-500 bg-slate-50 p-3 rounded-2xl">
                          <User size={14} className="text-slate-300"/> <span>پدر: {client.father_name || client.fatherName}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-black text-blue-600 bg-blue-50 p-3 rounded-2xl border border-blue-100">
                          <CreditCard size={14}/> <span>پلاک: {client.tazkira}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-bold text-slate-500 bg-slate-50 p-3 rounded-2xl">
                          <Phone size={14} className="text-slate-300"/> <span>تماس: {client.phone || '---'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
            <form onSubmit={handleCreateClient} className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 border border-white/20">
              <div className={`p-10 text-white flex justify-between items-center ${editingClient ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-gradient-to-r from-blue-600 to-blue-700'}`}>
                <h3 className="text-2xl font-black flex items-center gap-3">
                  {editingClient ? <Pencil size={32} /> : <UserPlus size={32} />}
                  {editingClient ? 'ویرایش مشخصات مشتری' : 'تشکیل پرونده مشتری'}
                </h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 rounded-full hover:bg-white/20 transition-all"><X size={24}/></button>
              </div>
              <div className="p-12 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2 uppercase">نام و تخلص</label>
                    <input name="name" type="text" defaultValue={editingClient?.name} className="w-full p-5 bg-slate-50 rounded-[24px] outline-none font-bold focus:bg-white focus:ring-2 ring-blue-100 transition-all border-2 border-transparent focus:border-blue-500" placeholder="..." required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2 uppercase">نام پدر</label>
                    <input name="fatherName" type="text" defaultValue={editingClient?.father_name || editingClient?.fatherName} className="w-full p-5 bg-slate-50 rounded-[24px] outline-none font-bold focus:bg-white focus:ring-2 ring-blue-100 transition-all border-2 border-transparent focus:border-blue-500" placeholder="..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 mr-2 uppercase">شماره پلاک {editingClient && <span className="text-[10px] text-amber-600">(غیر قابل تغییر)</span>}</label>
                  <input 
                    name="tazkira" 
                    type="text" 
                    defaultValue={editingClient?.tazkira}
                    readOnly={!!editingClient}
                    onChange={(e) => checkPlateDuplicate(e.target.value)}
                    className={`w-full p-5 rounded-[24px] outline-none font-bold transition-all border-2 ${
                      editingClient ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' :
                      duplicatePlateError ? 'bg-red-50 border-red-500 focus:bg-red-50 ring-red-100' : 
                      'bg-slate-50 border-transparent focus:bg-white focus:ring-2 ring-blue-100'
                    }`} 
                    placeholder="..." 
                    required 
                  />
                  {!editingClient && duplicatePlateError && <p className="text-[10px] font-black text-red-500 mr-2 animate-pulse">این شماره پلاک قبلاً در سیستم ثبت شده است!</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 mr-2 uppercase">شماره تماس</label>
                  <input name="phone" type="text" defaultValue={editingClient?.phone} className="w-full p-5 bg-slate-50 rounded-[24px] outline-none font-bold focus:bg-white focus:ring-2 ring-blue-100 transition-all border-2 border-transparent focus:border-blue-500" placeholder="..." />
                </div>
                <button 
                    type="submit" 
                    disabled={!editingClient && duplicatePlateError}
                    className={`w-full text-white py-6 rounded-[32px] font-black text-xl shadow-xl transition-all ${
                      !editingClient && duplicatePlateError ? 'bg-slate-300 cursor-not-allowed opacity-50' : 
                      editingClient ? 'bg-amber-600 shadow-amber-100 hover:bg-amber-700' : 'bg-blue-600 shadow-blue-100 hover:bg-blue-700'
                    }`}
                >
                    {editingClient ? 'تایید تغییرات پرونده' : 'تایید و ایجاد پرونده'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col no-print bg-[#f8fafc]" ref={workspaceRef}>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-fit max-w-[95%] no-print">
        <div className="bg-white/80 backdrop-blur-2xl border border-white/50 px-3 py-2 rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex items-center gap-1 min-w-[550px]">
          <button 
            onClick={() => setIsClientDetailsOpen(true)}
            className="flex items-center gap-3 pr-2 pl-4 py-1.5 rounded-full hover:bg-blue-50 transition-all group"
          >
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg group-active:scale-95 transition-transform">
                <User size={18} />
            </div>
            <div className="hidden md:flex flex-col text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">مشتری فعال</span>
                <span className="text-xs font-black text-slate-700 leading-none">{selectedClient.name}</span>
            </div>
          </button>

          <div className="w-[1px] h-6 bg-slate-200 mx-2" />

          <div className="flex items-center bg-slate-100/50 p-1 rounded-full">
             <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="p-2 hover:bg-white hover:shadow-sm text-slate-500 rounded-full transition-all active:scale-90"><ZoomOut size={18}/></button>
             <div className="px-3 text-[10px] font-black text-blue-600 w-12 text-center">{Math.round(zoom * 100)}%</div>
             <button onClick={() => setZoom(z => Math.min(2.5, z + 0.1))} className="p-2 hover:bg-white hover:shadow-sm text-slate-500 rounded-full transition-all active:scale-90"><ZoomIn size={18}/></button>
          </div>

          <div className="w-[1px] h-6 bg-slate-200 mx-2" />

          <div className="flex gap-1">
            {[1, 2, 3].map(p => (
                <button 
                    key={p} 
                    onClick={() => setVisiblePages(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${visiblePages.includes(p) ? 'bg-slate-900 text-white shadow-lg' : 'bg-transparent text-slate-400 hover:bg-slate-50'}`}
                >
                    {p}
                </button>
            ))}
          </div>

          <div className="w-[1px] h-6 bg-slate-200 mx-2" />

          <div className="flex gap-1 items-center">
             {!isStrictEmployee && (
               <div className="relative">
                  <button 
                      onClick={() => { setIsFontMenuOpen(!isFontMenuOpen); setIsExpiryMenuOpen(false); }}
                      className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isFontMenuOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'} hover:scale-105`}
                      title="انتخاب فونت"
                  >
                    <Type size={18} />
                  </button>
                  {isFontMenuOpen && (
                    <div className="absolute top-full mt-3 right-0 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 z-[200] animate-in zoom-in-95 w-48 overflow-hidden">
                      <div className="p-3 bg-slate-50 border-b mb-1 rounded-t-xl"><span className="text-[9px] font-black text-slate-400 uppercase">انتخاب فونت تایپ</span></div>
                      {FONT_OPTIONS.map(f => (
                        <button key={f.name} onClick={() => { setActiveFont(f.name); setIsFontMenuOpen(false); }} className={`w-full flex items-center justify-between p-3 rounded-xl text-[10px] font-black transition-all mt-1 ${activeFont === f.name ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'hover:bg-slate-50 text-slate-600'}`}>
                          <span style={{ fontFamily: f.name }}>{f.label}</span>
                          {activeFont === f.name && <Check size={14}/>}
                        </button>
                      ))}
                    </div>
                  )}
               </div>
             )}

             {!isStrictEmployee && (
               <div className="relative">
                  <button 
                      onClick={() => { setIsExpiryMenuOpen(!isExpiryMenuOpen); setIsFontMenuOpen(false); }}
                      className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${expiryDuration === 6 ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'} hover:scale-105`}
                      title="مدت اعتبار قرارداد"
                  >
                    <CalendarClock size={20} />
                  </button>
                  {isExpiryMenuOpen && (
                    <div className="absolute top-full mt-3 right-0 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 z-[200] animate-in zoom-in-95 w-40 overflow-hidden">
                      <button onClick={() => { setExpiryDuration(12); setIsExpiryMenuOpen(false); }} className={`w-full flex items-center justify-between p-3 rounded-xl text-[10px] font-black transition-all ${expiryDuration === 12 ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'hover:bg-slate-50 text-slate-600'}`}>
                        <span>۱۲ ماهه (پیش‌فرض)</span>
                        {expiryDuration === 12 && <Check size={14}/>}
                      </button>
                      <button onClick={() => { setExpiryDuration(6); setIsExpiryMenuOpen(false); }} className={`w-full flex items-center justify-between p-3 rounded-xl text-[10px] font-black transition-all mt-1 ${expiryDuration === 6 ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'hover:bg-slate-50 text-slate-600'}`}>
                        <span>۶ ماهه</span>
                        {expiryDuration === 6 && <Check size={14}/>}
                      </button>
                    </div>
                  )}
               </div>
             )}
          </div>

          {!isStrictEmployee && (
            <button 
              onClick={handleLoadPreset}
              title="فراخوانی قالب ذخیره شده"
              className="w-10 h-10 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-full transition-all"
            >
              <BookMarked size={20} />
            </button>
          )}

          <button 
            onClick={resetWorkspace}
            className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {isClientDetailsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsClientDetailsOpen(false)} />
          <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 border border-white">
            <div className="p-10 text-center">
              <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-sm"><UserCircle size={56} /></div>
              <h3 className="text-3xl font-black text-slate-900 mb-1">{selectedClient.name}</h3>
              <p className="text-slate-400 font-bold mb-10">شناسه پرونده: {selectedClient.id.slice(-6)}</p>
              
              <div className="grid grid-cols-1 gap-4 text-right">
                <div className="bg-slate-50 p-6 rounded-[32px] flex items-center justify-between">
                   <div className="flex items-center gap-4"><div className="p-3 bg-white rounded-2xl shadow-sm text-slate-400"><User size={20}/></div><div><p className="text-[10px] font-black text-slate-400 uppercase">نام پدر</p><p className="font-bold text-slate-800 text-lg">{selectedClient.father_name || selectedClient.fatherName}</p></div></div>
                </div>
                <div className="bg-slate-50 p-6 rounded-[32px] flex items-center justify-between">
                   <div className="flex items-center gap-4"><div className="p-3 bg-white rounded-2xl shadow-sm text-slate-400"><CreditCard size={20}/></div><div><p className="text-[10px] font-black text-slate-400 uppercase">شماره پلاک</p><p className="font-bold text-slate-800 text-lg">{selectedClient.tazkira}</p></div></div>
                </div>
                <div className="bg-slate-50 p-6 rounded-[32px] flex items-center justify-between">
                   <div className="flex items-center gap-4"><div className="p-3 bg-white rounded-2xl shadow-sm text-slate-400"><Phone size={20}/></div><div><p className="text-[10px] font-black text-slate-400 uppercase">شماره تماس</p><p className="font-bold text-slate-800 text-lg">{selectedClient.phone || '---'}</p></div></div>
                </div>
              </div>
              
              <button onClick={() => setIsClientDetailsOpen(false)} className="w-full mt-10 bg-slate-900 text-white py-6 rounded-[32px] font-black text-lg shadow-xl shadow-slate-200">بستن پنجره</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar pt-24 pb-40 px-6 no-print">
        <div className="max-w-screen-2xl mx-auto flex flex-col items-center gap-10">
          {(template.pages || []).map((page) => {
            const isPageOpen = visiblePages.includes(page.pageNumber);
            const hasImage = !!page.bgImage;
            const activeFields = (page.fields || []).filter(f => f.isActive);
            if (!hasImage && page.pageNumber > 1) return null;
            if (!isPageOpen) return null;

            return (
              <div key={page.pageNumber} className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex justify-center w-full">
                    {hasImage ? (
                      <VisualCanvasPage 
                          page={page} 
                          formData={formData} 
                          setFormData={setFormData} 
                          zoom={zoom} 
                          activeFieldKey={activeFieldKey}
                          setActiveFieldKey={setActiveFieldKey}
                          activeFont={activeFont}
                      />
                    ) : (
                      <div className="bg-white p-12 rounded-[56px] shadow-2xl border border-slate-100 w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[100px] opacity-40 -z-0" />
                          {activeFields.map(f => (
                            <div key={f.id} className="flex flex-col gap-2 relative z-10">
                              <label className="text-[10px] font-black text-slate-400 uppercase mr-1 tracking-widest">{f.label}</label>
                              <input 
                                type="text" 
                                value={formData[f.key] || ''} 
                                onChange={(e) => setFormData({...formData, [f.key]: e.target.value})} 
                                placeholder="..." 
                                style={{ fontFamily: activeFont || 'Vazirmatn' }}
                                className="w-full px-6 py-5 bg-slate-50 rounded-[24px] outline-none font-bold text-lg focus:bg-white focus:ring-4 ring-blue-50 transition-all border-2 border-transparent focus:border-blue-200"
                              />
                            </div>
                          ))}
                      </div>
                    )}
                </div>
              </div>
            );
          })}

          <div className="w-full max-w-4xl pt-10 pb-20 px-6 animate-in slide-in-from-bottom-10 delay-300">
            <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[48px] border border-white shadow-2xl flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                  {(isAdmin || canEditInWorkspace) && (
                    <button 
                      onClick={() => handleSaveContract(false)} 
                      className="flex-[2] bg-blue-600 text-white py-7 rounded-[32px] font-black text-xl shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 active:scale-95"
                    >
                      <Save size={28} /> 
                      {editData ? 'ثبت تغییرات ارجاعی' : 'ثبت و آرشیو نهایی'}
                    </button>
                  )}
                  {!isStrictEmployee && (
                    <button 
                      onClick={handleSaveAsPreset} 
                      className="flex-1 bg-white border-2 border-slate-100 text-slate-700 py-7 rounded-[32px] font-black text-lg hover:bg-slate-50 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                      <Copy size={24} className="text-blue-500" /> ذخیره به عنوان قالب
                    </button>
                  )}
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                  {editData && (isAdmin || canEditInWorkspace) && !isStrictEmployee && (
                    <button 
                      onClick={() => handleSaveContract(true)} 
                      className="flex-1 bg-emerald-500 text-white py-6 rounded-[28px] font-black text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-600 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 active:scale-95"
                    >
                      <Repeat size={24} /> تمدید قرارداد
                    </button>
                  )}
                  <button 
                    onClick={() => window.print()} 
                    className="flex-1 bg-slate-900 text-white py-6 rounded-[28px] font-black text-lg flex items-center justify-center gap-4 hover:bg-black hover:-translate-y-1 transition-all shadow-xl active:scale-95"
                  >
                    <Printer size={24}/> چاپ سند
                  </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const UsersManager = ({ currentUser }: { currentUser: any }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<'users' | 'roles'>('users');
  const [editingUser, setEditingUser] = useState<any>(null);
  const isAdmin = currentUser?.username === 'admin';
  
  const permissionsList = [
    { id: 'workspace', label: 'دسترسی به میز کار', parent: null }, { id: 'workspace_create', label: 'ایجاد پرونده جدید', parent: 'workspace' }, { id: 'workspace_search', label: 'جستجوی مشتریان', parent: 'workspace' }, { id: 'archive', label: 'مشاهده بایگانی', parent: null }, { id: 'archive_print', label: 'چاپ در بایگانی', parent: 'archive' }, { id: 'archive_edit', label: 'ویرایش در بایگانی', parent: 'archive' }, { id: 'archive_delete', label: 'حذف سوابق بایگانی', parent: 'archive' }, { id: 'accounting', label: 'دسترسی به امور مالی', parent: null }, { id: 'reports', label: 'مشاهده گزارشات', parent: null }, { id: 'settings', label: 'دسترسی به تنظیمات', parent: null }, { id: 'settings_boom', label: 'مدیریت بوم طراحی', parent: 'settings' }, { id: 'settings_users', label: 'مدیریت کاربران و نقش‌ها', parent: 'settings' }, { id: 'settings_backup', label: 'پشتیبان‌گیری داده‌ها', parent: 'settings' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: u } = await supabase.from('users').select('*');
    const { data: r } = await supabase.from('roles').select('*');
    if (u) setUsers(u);
    if (r) setRoles(r);
  };

  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const username = data.get('username') as string;
    const password = data.get('password') as string;
    const roleId = data.get('roleId') as string;
    
    if (editingUser) {
      if (editingUser.username === 'admin' && username !== 'admin') {
         showToast('نام کاربری ادمین غیر قابل تغییر است');
         return;
      }
      await supabase.from('users').update({ username, password, role_id: roleId }).eq('id', editingUser.id);
      if (editingUser.username === currentUser.username) {
        showToast('اطلاعات شما بروز شد. برای اعمال کامل مجدد وارد شوید.');
      }
    } else {
      await supabase.from('users').insert([{ username, password, role_id: roleId }]);
    }
    setEditingUser(null);
    fetchData();
    showToast('اطلاعات کاربر ذخیره شد');
  };

  const handleSaveRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const roleName = data.get('roleName') as string;
    const checkedPerms = Array.from(data.getAll('perms') as string[]);
    await supabase.from('roles').insert([{ id: Date.now().toString(), name: roleName, perms: checkedPerms }]);
    fetchData();
    showToast('نقش جدید تعریف شد');
  };

  const deleteUser = async (id: string, targetUsername: string) => {
    if (targetUsername === 'admin') {
      showToast('خطا: کاربر مدیر سیستم قابل حذف نیست');
      return;
    }
    if (window.confirm(`آیا از حذف کاربر ${targetUsername} اطمینان دارید؟`)) {
      await supabase.from('users').delete().eq('id', id);
      fetchData();
      showToast('کاربر حذف شد');
    }
  };

  const deleteRole = async (id: string) => {
    if (id === 'admin_role' || id === 'employee_role') {
      showToast('نقش‌های سیستمی قابل حذف نیستند');
      return;
    }
    await supabase.from('roles').delete().eq('id', id);
    fetchData();
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-500 p-8 h-full overflow-y-auto custom-scrollbar no-print">
      <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button onClick={() => setSubTab('users')} className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${subTab === 'users' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>مدیریت کاربران</button>
        <button onClick={() => setSubTab('roles')} className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${subTab === 'roles' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}>نقش‌ها و دسترسی</button>
      </div>
      {subTab === 'users' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
           <div className="lg:col-span-1 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm h-fit">
              <h3 className="font-black text-xl mb-8 flex items-center gap-2 text-slate-800"><UserPlus className="text-blue-600"/> {editingUser ? 'ویرایش اطلاعات' : 'ایجاد کاربر جدید'}</h3>
              <form onSubmit={handleSaveUser} className="space-y-6">
                <input name="username" type="text" defaultValue={editingUser?.username} readOnly={editingUser?.username === 'admin'} placeholder="نام کاربری" className={`w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold ${editingUser?.username === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`} required />
                <input name="password" type="password" defaultValue={editingUser?.password} placeholder="رمز عبور" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold" required />
                <select name="roleId" defaultValue={editingUser?.role_id || editingUser?.roleId} disabled={editingUser?.username === 'admin'} className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold disabled:opacity-50">
                    {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-blue-100">{editingUser ? 'بروزرسانی' : 'ثبت کاربر'}</button>
                {editingUser && <button type="button" onClick={() => setEditingUser(null)} className="w-full text-slate-400 font-bold">انصراف</button>}
              </form>
           </div>
           <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
             <h3 className="font-black text-xl mb-8 text-slate-800">کاربران فعال</h3>
             <div className="divide-y divide-slate-100">
               {users.map((u: any) => (
                 <div key={u.id} className="py-5 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400">{u.username?.[0]}</div>
                     <div><p className="font-bold text-slate-700">{u.username}</p><p className="text-xs text-slate-400">{roles.find((r:any)=>r.id===(u.role_id || u.roleId))?.name}</p></div>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => setEditingUser(u)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl"><Pencil size={18}/></button>
                     {u.username !== 'admin' && <button onClick={() => deleteUser(u.id, u.username)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={18}/></button>}
                   </div>
                 </div>
               ))}
             </div>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
           <div className="lg:col-span-1 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm h-fit">
              <h3 className="font-black text-xl mb-8 flex items-center gap-2 text-slate-800"><ShieldCheck className="text-blue-600"/> تعریف نقش</h3>
              <form onSubmit={handleSaveRole} className="space-y-6">
                <input name="roleName" type="text" placeholder="نام نقش..." className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold" required />
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ماتریس دسترسی</p>
                  <div className="space-y-2">
                    {permissionsList.map(p => (
                      <div key={p.id} className={`${p.parent ? 'mr-6 scale-95 opacity-80' : 'mt-4 border-t pt-4'}`}>
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-white transition-all">
                          <input type="checkbox" name="perms" value={p.id} className="w-5 h-5 accent-blue-600 rounded" />
                          <span className="text-xs font-bold text-slate-700">{p.label}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-blue-100">ثبت نقش و دسترسی</button>
              </form>
           </div>
           <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
             <h3 className="font-black text-xl mb-8 text-slate-800">نقش‌های سیستم</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roles.map((r:any) => (
                  <div key={r.id} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className={`font-black text-lg ${r.id === 'employee_role' ? 'text-amber-600' : 'text-blue-600'}`}>{r.name}</h4>
                      {r.id !== 'admin_role' && r.id !== 'employee_role' && <Trash2 size={16} className="text-slate-300 cursor-pointer hover:text-red-500" onClick={() => deleteRole(r.id)} />}
                    </div>
                    <div className="flex flex-wrap gap-2">{r.perms?.map((p:string) => <span key={p} className="px-3 py-1 bg-white rounded-lg text-[9px] font-black text-slate-500 border border-slate-100">{permissionsList.find(pl => pl.id === p)?.label}</span>)}</div>
                  </div>
                ))}
             </div>
           </div>
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
    const { data: u } = await supabase.from('users').select('*');
    const { data: r } = await supabase.from('roles').select('*');
    const data = { settings: t, clients: c, contracts: a, users: u, roles: r, version: '2.0.0', exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const aLink = document.createElement('a');
    aLink.href = url;
    aLink.download = `asra_gps_cloud_backup_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.json`;
    aLink.click();
    showToast('بک‌آپ ابری استخراج شد');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        showToast('در حال پاکسازی و جایگزینی داده‌ها...');
        await supabase.from('contracts').delete().neq('id', '0');
        await supabase.from('clients').delete().neq('id', '0');
        await supabase.from('users').delete().neq('username', 'admin');
        await supabase.from('roles').delete().neq('id', 'admin_role');
        await supabase.from('settings').delete().neq('key', '0');
        if (data.roles) await supabase.from('roles').upsert(data.roles);
        if (data.users) await supabase.from('users').upsert(data.users);
        if (data.clients) await supabase.from('clients').upsert(data.clients);
        if (data.contracts) await supabase.from('contracts').upsert(data.contracts);
        if (data.settings) await supabase.from('settings').upsert(data.settings);
        showToast('سیستم با موفقیت بازیابی شد. بارگذاری مجدد...');
        setTimeout(() => window.location.reload(), 2000);
      } catch (err) { showToast('خطا در خواندن فایل پشتیبان'); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-12 animate-in fade-in zoom-in-95 h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto no-print">
      <div className="w-48 h-48 bg-white text-blue-600 rounded-[56px] flex items-center justify-center mb-10 shadow-2xl shadow-blue-100 ring-8 ring-white p-10"><AsraLogo size={140} /></div>
      <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">امنیت داده‌های ابری</h2>
      <p className="text-slate-500 font-medium text-lg leading-relaxed mb-12">فایل پشتیبان شامل تمام داده‌های ذخیره شده در دیتابیس Supabase می‌باشد.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <button onClick={handleExport} className="bg-slate-900 text-white p-8 rounded-[40px] flex flex-col items-center gap-4 hover:scale-105 transition-all shadow-2xl"><Download size={32} /><span className="font-black text-xl">خروجی کامل از ابر</span></button>
        <label className="bg-blue-600 text-white p-8 rounded-[40px] flex flex-col items-center gap-4 hover:scale-105 transition-all shadow-2xl shadow-blue-200 cursor-pointer"><FileJson size={32} /><span className="font-black text-xl">بازیابی و جایگزینی</span><input type="file" className="hidden" accept=".json" onChange={handleImport} /></label>
      </div>
    </div>
  );
};

const DesktopSettings = ({ template, setTemplate, activePageNum, activeSubTab, setActiveSubTab, onPageChange }: { template: ContractTemplate, setTemplate: (t: any) => void, activePageNum: number, activeSubTab: 'design' | 'fields', setActiveSubTab: (s: 'design' | 'fields') => void, onPageChange: (p: number) => void }) => {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [newField, setNewField] = useState({ label: '', fontSize: 14, width: 150, alignment: 'R' as TextAlignment, isDropdown: false, optionsStr: '' });
  const [canvasBg, setCanvasBg] = useState<string>('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pages = template.pages || [];
  const activePage = pages.find(p => p.pageNumber === activePageNum) || pages[0] || { pageNumber: activePageNum, fields: [], paperSize: PaperSize.A4, showBackgroundInPrint: true };
  const fields = activePage.fields || [];
  const selectedField = fields.find(f => f.id === selectedFieldId);

  useEffect(() => {
    const loadBg = async () => {
      if (activePage.bgImage) {
        const localUrl = await cacheImage(activePage.bgImage);
        setCanvasBg(localUrl);
      } else {
        setCanvasBg('');
      }
    };
    loadBg();
  }, [activePage.bgImage, activePageNum]);

  const updatePage = (updates: Partial<ContractPage>) => setTemplate({ ...template, pages: pages.map(p => p.pageNumber === activePageNum ? { ...p, ...updates } : p) });
  const handleSaveTemplate = async () => { const { error } = await supabase.from('settings').upsert([{ key: 'contract_template', value: template }]); if (!error) showToast('قالب طراحی در پایگاه داده تثبیت شد'); };
  const updateField = (id: string, updates: Partial<ContractField>) => setTemplate({ ...template, pages: pages.map(p => p.pageNumber === activePageNum ? { ...p, fields: fields.map(f => f.id === id ? { ...f, ...updates } : f) } : p) });
  const handleAddField = () => { if (!newField.label) { showToast('نام المان نمی‌تواند خالی باشد'); return; } const id = Date.now().toString(); const options = newField.isDropdown ? newField.optionsStr.split(/[,،\n]/).map(o => o.trim()).filter(Boolean) : undefined; const field: ContractField = { id, label: newField.label, key: `f_${id}`, isActive: true, x: 40, y: 40, width: newField.width, height: 30, fontSize: 14, rotation: 0, alignment: newField.alignment, isDropdown: newField.isDropdown, options: options }; setTemplate({ ...template, pages: pages.map(p => p.pageNumber === activePageNum ? { ...p, fields: [...fields, field] } : p) }); setNewField({ label: '', fontSize: 14, width: 150, alignment: 'R', isDropdown: false, optionsStr: '' }); showToast('المان جدید به بوم اضافه شد'); };
  const removeField = (id: string) => { setTemplate({ ...template, pages: pages.map(p => p.pageNumber === activePageNum ? { ...p, fields: fields.filter(f => f.id !== id) } : p) }); showToast('المان حذف شد'); };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { if (activePage.bgImage) { try { const oldPath = activePage.bgImage.split('/').pop(); if (oldPath) await supabase.storage.from('letterheads').remove([`headers/${oldPath}`]); } catch (e) { console.error('Cleanup failed:', e); } } const fileExt = file.name.split('.').pop(); const fileName = `${Math.random()}.${fileExt}`; const filePath = `headers/${fileName}`; const { error: uploadError } = await supabase.storage.from('letterheads').upload(filePath, file); if (!uploadError) { const { data: { publicUrl } } = supabase.storage.from('letterheads').getPublicUrl(filePath); const localUrl = URL.createObjectURL(file); setCanvasBg(localUrl); updatePage({ bgImage: publicUrl }); const db = await initDB(); const tx = db.transaction(STORE_NAME, 'readwrite'); tx.objectStore(STORE_NAME).put(file, publicUrl); showToast('تصویر سربرگ جدید جایگزین و کش شد'); } } };
  const handleDrag = (e: React.MouseEvent, id: string) => { if (!canvasRef.current) return; const canvasRect = canvasRef.current.getBoundingClientRect(); setSelectedFieldId(id); const onMouseMove = (m: MouseEvent) => { const x = ((m.clientX - canvasRect.left) / canvasRect.width) * 100; const y = ((m.clientY - canvasRect.top) / canvasRect.height) * 100; updateField(id, { x: Math.max(0, Math.min(98, x)), y: Math.max(0, Math.min(98, y)) }); }; const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); };

  return (
    <div className="flex flex-col h-full bg-white rounded-[40px] overflow-hidden border border-slate-100 shadow-2xl animate-in fade-in duration-700 no-print">
      <div className="bg-white/90 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between no-print z-10 sticky top-0">
        <div className="flex items-center gap-3">
           <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button onClick={() => setActiveSubTab('design')} className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs transition-all ${activeSubTab === 'design' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400'}`}><Layers size={16} /> بوم</button>
              <button onClick={() => setActiveSubTab('fields')} className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs transition-all ${activeSubTab === 'fields' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400'}`}><List size={16} /> لایه‌ها</button>
           </div>
           <div className="h-6 w-[1px] bg-slate-200 mx-1" />
           <div className="flex bg-slate-100 p-1 rounded-2xl">{[1, 2, 3].map(p => <button key={p} onClick={() => onPageChange(p)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activePageNum === p ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>برگ {p}</button>)}</div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => updatePage({ showBackgroundInPrint: !activePage.showBackgroundInPrint })} 
            className={`px-4 py-2.5 rounded-2xl text-[10px] font-black flex items-center gap-2 transition-all border shadow-sm ${activePage.showBackgroundInPrint ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
            title={activePage.showBackgroundInPrint ? "تصویر در چاپ لحاظ می‌شود" : "فقط متن چاپ می‌شود"}
          >
            {activePage.showBackgroundInPrint ? <ImageIcon size={14}/> : <ImageOff size={14}/>}
            {activePage.showBackgroundInPrint ? 'سربرگ روشن' : 'سربرگ خاموش'}
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md"><Upload size={16} /> آپلود سربرگ</button>
          <button onClick={() => { updatePage({ bgImage: undefined }); setCanvasBg(''); showToast('تصویر حذف شد'); }} className="bg-white border border-red-100 text-red-500 px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-red-50 transition-all">حذف</button>
          <div className="h-6 w-[1px] bg-slate-200 mx-1" />
          <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button onClick={() => updatePage({ paperSize: PaperSize.A5 })} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activePage.paperSize === PaperSize.A5 ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>A5</button>
              <button onClick={() => updatePage({ paperSize: PaperSize.A4 })} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activePage.paperSize === PaperSize.A4 ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>A4</button>
          </div>
          <button onClick={handleSaveTemplate} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-black shadow-lg shadow-emerald-100 transition-all ml-2"><Save size={16} /> ذخیره قالب</button>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden relative">
        <div className="w-[320px] border-l p-6 overflow-y-auto flex flex-col gap-6 no-print bg-slate-50/20 backdrop-blur-sm z-10 custom-scrollbar">
          {activeSubTab === 'design' ? (
            <>
              <div><h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><Layers size={18} className="text-blue-600" /> لیست المان‌ها</h3>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                  {fields.map(f => (
                    <div key={f.id} onClick={() => setSelectedFieldId(f.id)} className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all border-2 ${selectedFieldId === f.id ? 'bg-white border-blue-500 shadow-md text-blue-700 font-bold scale-[1.01]' : 'bg-white/50 border-transparent hover:bg-white text-slate-500'}`}>
                      <span className="text-xs font-black">{f.label}</span>
                      <div onClick={(e) => { e.stopPropagation(); updateField(f.id, { isActive: !f.isActive }); }} className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${f.isActive ? 'bg-blue-600 border-blue-600' : 'border-slate-200 bg-white'}`}>{f.isActive && <Check size={10} className="text-white" />}</div>
                    </div>
                  ))}
                </div>
              </div>
              {selectedField && (
                <div className="bg-blue-50/50 rounded-[28px] p-6 border border-blue-100 animate-in slide-in-from-right-4 duration-500 shadow-inner">
                  <h4 className="text-xs font-black text-blue-900 mb-5 flex items-center gap-2"><Type size={14} /> ویرایش: {selectedField.label}</h4>
                  {selectedField.isDropdown && (
                    <div className="mb-4 space-y-2">
                      <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest block">گزینه‌های لیست (با ویرگول جدا کنید)</label>
                      <textarea className="w-full bg-white border-none shadow-sm rounded-xl p-3 font-bold text-xs text-blue-700 outline-none h-20 resize-none" value={selectedField.options?.join(', ') || ''} onChange={(e) => { const opts = e.target.value.split(/[,،\n]/).map(o => o.trim()).filter(Boolean); updateField(selectedField.id, { options: opts }); }} />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="space-y-1"><label className="text-[9px] font-black text-blue-400 block text-center uppercase tracking-widest">سایز</label><input type="number" value={selectedField.fontSize} onChange={e => updateField(selectedField.id, { fontSize: Number(e.target.value) })} className="w-full bg-white border-none shadow-sm rounded-xl p-3 text-center font-black text-sm text-blue-700 outline-none" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-blue-400 block text-center uppercase tracking-widest">عرض</label><input type="number" value={selectedField.width} onChange={e => updateField(selectedField.id, { width: Number(e.target.value) })} className="w-full bg-white border-none shadow-sm rounded-xl p-3 text-center font-black text-sm text-blue-700 outline-none" /></div>
                  </div>
                  <div className="mb-6 space-y-2">
                    <div className="flex justify-between items-center px-1"><label className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1"><RotateCw size={10} /> چرخش</label><span className="text-[10px] font-black text-blue-700">{selectedField.rotation}°</span></div>
                    <input type="range" min="0" max="360" value={selectedField.rotation} onChange={e => updateField(selectedField.id, { rotation: Number(e.target.value) })} className="w-full accent-blue-600 h-1.5 bg-blue-100 rounded-full cursor-pointer transition-all" />
                  </div>
                  <div className="grid grid-cols-3 bg-white p-1 rounded-xl shadow-sm border border-blue-100/30">
                    {(['L', 'C', 'R'] as TextAlignment[]).map(a => <button key={a} onClick={() => updateField(selectedFieldId, { alignment: a })} className={`py-2 rounded-lg text-xs font-black transition-all duration-300 ${selectedField.alignment === a ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-blue-600'}`}>{a === 'L' ? <AlignLeft size={14} className="mx-auto" /> : a === 'C' ? <AlignCenter size={14} className="mx-auto" /> : <AlignRight size={14} className="mx-auto" />}</button>)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col gap-6">
              <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100">
                <h3 className="text-xs font-black text-blue-900 mb-4 flex items-center gap-2"><PlusCircle size={14} /> تعریف المان</h3>
                <div className="space-y-4">
                  <input type="text" value={newField.label} placeholder="عنوان فیلد..." onChange={e => setNewField({...newField, label: e.target.value})} className="w-full p-3.5 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-xs" />
                  <div className="flex items-center gap-3 px-1"><button type="button" onClick={() => setNewField({...newField, isDropdown: !newField.isDropdown})} className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-all ${newField.isDropdown ? 'bg-blue-600 border-blue-600' : 'border-slate-200 bg-white'}`}>{newField.isDropdown && <Check size={12} className="text-white" />}</button><span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">فیلد انتخابی (آبشاری)</span></div>
                  {newField.isDropdown && ( <div className="animate-in slide-in-from-top-2 duration-300"><textarea value={newField.optionsStr} placeholder="گزینه‌ها را با ویرگول جدا کنید..." onChange={e => setNewField({...newField, optionsStr: e.target.value})} className="w-full p-3.5 bg-white border-none rounded-2xl outline-none font-bold text-[10px] h-20 shadow-inner" /></div> )}
                  <button onClick={handleAddField} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs shadow-lg shadow-blue-100">افزودن به برگه</button>
                </div>
              </div>
              <div className="space-y-3">{fields.map(f => <div key={f.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-3"><span className="text-xs font-bold text-slate-700 flex-1">{f.label}</span><div className="flex gap-1"><button onClick={() => updateField(f.id, { isActive: !f.isActive })} className={`p-1.5 rounded transition-all ${f.isActive ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 bg-slate-50'}`}><Check size={14}/></button><button onClick={() => removeField(f.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400"><Trash2 size={14}/></button></div></div>)}</div>
            </div>
          )}
        </div>
        <div className="flex-1 bg-slate-200/30 p-8 overflow-auto flex items-start justify-center custom-scrollbar no-print">
          <div ref={canvasRef} className="bg-white shadow-2xl relative border border-slate-200 transition-all origin-top no-print" style={{ width: activePage.paperSize === PaperSize.A4 ? '595px' : '420px', height: activePage.paperSize === PaperSize.A4 ? '842px' : '595px', backgroundImage: canvasBg ? `url(${canvasBg})` : 'none', backgroundSize: '100% 100%', imageRendering: 'high-quality' }}>
            {fields.filter(f => f.isActive).map(f => (
              <div key={f.id} onMouseDown={e => handleDrag(e, f.id)} className={`absolute cursor-move select-none group/field ${selectedFieldId === f.id ? 'z-50' : 'z-10'}`} style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.width}px`, transform: `rotate(${f.rotation}deg)`, fontSize: `${f.fontSize}px`, textAlign: f.alignment === 'L' ? 'left' : f.alignment === 'R' ? 'right' : 'center', display: 'flex', alignItems: 'flex-start', justifyItems: 'center', justifyContent: f.alignment === 'L' ? 'flex-start' : f.alignment === 'R' ? 'flex-end' : 'center' }}>
                <div className={`absolute -inset-2 border-2 rounded-lg transition-all ${selectedFieldId === f.id ? 'border-blue-500 bg-blue-500/5 shadow-md' : 'border-transparent'}`} />
                <span className={`relative font-black tracking-tight w-full leading-none break-words hyphens-auto ${selectedFieldId === f.id ? 'text-blue-700' : 'text-slate-800 opacity-60'}`} style={{ overflowWrap: 'break-word', wordBreak: 'break-word', lineHeight: 1 }}>
                  {f.label}
                  {f.isDropdown && <ChevronDown size={8} className="inline mr-1 opacity-40" />}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsPanel = ({ template, setTemplate, userPermissions, currentUser }: { template: ContractTemplate, setTemplate: (t: any) => void, userPermissions: string[], currentUser: any }) => {
  const isAdmin = currentUser?.username === 'admin';
  const [mainTab, setMainTab] = useState<'users' | 'boom' | 'backup'>(() => { 
    if (isAdmin || userPermissions.includes('settings_boom')) return 'boom'; 
    if (userPermissions.includes('settings_users')) return 'users'; 
    return 'backup'; 
  });
  const [activeSubTab, setActiveSubTab] = useState<'design' | 'fields'>('design');
  const [activePage, setActivePage] = useState(1);
  const [isDesignUnlocked, setIsDesignUnlocked] = useState(false);

  return (
    <div className="flex flex-col h-[calc(100vh-40px)] animate-in fade-in duration-500 no-print">
      <div className="flex items-center justify-center gap-4 py-6 bg-white border-b border-slate-100 no-print">
         {(isAdmin || userPermissions.includes('settings_users')) && <button onClick={() => setMainTab('users')} className={`flex items-center gap-3 px-8 py-3.5 rounded-[20px] font-black text-sm transition-all ${mainTab === 'users' ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}><User size={18}/> مدیریت کاربران و نقش‌ها</button>}
         {(isAdmin || userPermissions.includes('settings_boom')) && <button onClick={() => setMainTab('boom')} className={`flex items-center gap-3 px-8 py-3.5 rounded-[20px] font-black text-sm transition-all ${mainTab === 'boom' ? 'bg-blue-600 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}><Layers size={18}/> مدیریت سربرگ و المان‌ها</button>}
         {(isAdmin || userPermissions.includes('settings_backup')) && <button onClick={() => setMainTab('backup')} className={`flex items-center gap-3 px-8 py-3.5 rounded-[20px] font-black text-sm transition-all ${mainTab === 'backup' ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}><Database size={18}/> پشتیبان‌گیری و داده‌ها</button>}
      </div>
      <div className="flex-1 overflow-hidden no-print">
        {mainTab === 'boom' && (
          <div className="h-full">
            {isDesignUnlocked || isAdmin ? (
              <DesktopSettings template={template} setTemplate={setTemplate} activePageNum={activePage} activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} onPageChange={setActivePage} />
            ) : (
              <DesignGate onUnlock={() => setIsDesignUnlocked(true)} onCancel={() => setMainTab('users')} />
            )}
          </div>
        )}
        {mainTab === 'users' && <UsersManager currentUser={currentUser} />}
        {mainTab === 'backup' && <BackupManager />}
      </div>
    </div>
  );
};

const ArchivePanel = ({ onEdit, perms, template, currentUser, activeFont }: { onEdit: (contract: any) => void, perms: string[], template: ContractTemplate, currentUser: any, activeFont: string }) => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'main' | 'extended'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentModal, setAssignmentModal] = useState<any>(null);
  const [isExpiryPanelOpen, setIsExpiryPanelOpen] = useState(false);
  
  const isAdmin = currentUser?.username === 'admin';
  const isStrictEmployee = currentUser?.role_id === 'employee_role';
  
  const canPrint = isAdmin || perms.includes('archive_print') || isStrictEmployee; // Employee MUST print assigned
  const canEdit = isAdmin || perms.includes('archive_edit') || isStrictEmployee; // Employee MUST edit assigned
  const canDelete = !isStrictEmployee && (isAdmin || perms.includes('archive_delete'));

  useEffect(() => { 
    fetchContracts(); 
    fetchUsers();
  }, [currentUser]);

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*');
    if (data) setUsers(data);
  };

  const fetchContracts = async () => { 
    let query = supabase.from('contracts').select('*');
    // Security: Only show assigned to employee
    if (isStrictEmployee) {
      query = query.eq('assigned_to', currentUser.id);
    }
    const { data } = await query.order('timestamp', { ascending: false }); 
    if (data) setContracts(data); 
  };

  const handleDelete = async (id: string) => { 
    if (!canDelete) return; 
    if (window.confirm('آیا از حذف دائمی این رکورد اطمینان دارید؟')) {
      const { error } = await supabase.from('contracts').delete().eq('id', id); 
      if (!error) { fetchContracts(); showToast('قرارداد از بایگانی حذف شد'); } 
    }
  };

  const handleAssign = async (userId: string | null) => {
    if (!assignmentModal) return;
    const { error } = await supabase.from('contracts').update({ assigned_to: userId }).eq('id', assignmentModal.id);
    if (!error) {
      showToast(userId ? 'قرارداد به کاربر ارجاع شد' : 'قرارداد از حالت ارجاع خارج شد');
      setAssignmentModal(null);
      fetchContracts();
    }
  };

  const expiredContracts = useMemo(() => {
    const now = new Date();
    return contracts.filter(c => c.expiry_date && new Date(c.expiry_date) < now);
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      const matchesType = filterType === 'all' || (filterType === 'main' ? !c.is_extended : c.is_extended);
      // For Employee, we disable the search UI, but let's keep search logic if it exists
      const matchesSearch = !searchTerm || c.client_name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.form_data?.tazkira && c.form_data.tazkira.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesType && matchesSearch;
    });
  }, [contracts, filterType, searchTerm]);

  return (
    <div className="max-w-5xl mx-auto py-12 animate-in fade-in zoom-in-95 duration-700 no-print h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 px-4 gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">
            {isStrictEmployee ? 'لیست قراردادهای ارجاعی من' : 'بایگانی هوشمند اسناد'}
          </h2>
          <p className="text-xs font-bold text-slate-400 mt-1">
            {isStrictEmployee ? 'قراردادهایی که مسئولیت آن‌ها با شماست' : 'مدیریت و فیلترینگ قراردادهای ثبت شده'}
          </p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          {!isStrictEmployee && (
            <div className="relative">
               <button onClick={() => setIsExpiryPanelOpen(!isExpiryPanelOpen)} className="p-3.5 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-red-500 hover:shadow-lg transition-all relative">
                  <Bell size={20} />
                  {expiredContracts.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                      {expiredContracts.length}
                    </span>
                  )}
               </button>
               {isExpiryPanelOpen && (
                 <div className="absolute top-full left-0 mt-3 w-72 bg-white border border-slate-100 shadow-2xl rounded-3xl z-[150] animate-in slide-in-from-top-2 overflow-hidden">
                    <div className="bg-red-50 p-4 border-b border-red-100 flex items-center justify-between">
                       <span className="text-[10px] font-black text-red-700 uppercase">قراردادهای منقضی شده</span>
                       <X size={14} className="text-red-400 cursor-pointer" onClick={() => setIsExpiryPanelOpen(false)}/>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                       {expiredContracts.length > 0 ? (
                         expiredContracts.map(c => (
                           <div key={c.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-all cursor-pointer" onClick={() => { onEdit(c); setIsExpiryPanelOpen(false); }}>
                              <p className="font-black text-xs text-slate-800 mb-1">{c.client_name}</p>
                              <p className="text-[9px] font-bold text-red-500">منقضی شده در: {new Date(c.expiry_date).toLocaleDateString('fa-IR')}</p>
                           </div>
                         ))
                       ) : (
                         <div className="p-8 text-center text-[10px] font-bold text-slate-400 italic">هیچ قرارداد منقضی شده‌ای یافت نشد.</div>
                       )}
                    </div>
                 </div>
               )}
            </div>
          )}

          {!isStrictEmployee && (
            <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
              {[
                {id: 'all', label: 'همه'},
                {id: 'main', label: 'اصلی'},
                {id: 'extended', label: 'تمدیدی'}
              ].map(t => (
                <button key={t.id} onClick={() => setFilterType(t.id as any)} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${filterType === t.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>{t.label}</button>
              ))}
            </div>
          )}
          
          {!isStrictEmployee && (
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 px-6 flex-1 md:flex-initial">
              <Search size={18} className="text-slate-300" />
              <input type="text" placeholder="جستجوی پلاک یا نام..." className="outline-none bg-transparent text-sm font-bold w-full md:w-48" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-24">
        {filteredContracts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContracts.map(contract => {
              const clientPlate = contract.form_data?.tazkira || '---';
              const assignedUser = users.find(u => u.id === contract.assigned_to);
              const isExpired = contract.expiry_date && new Date(contract.expiry_date) < new Date();
              
              return (
                <div key={contract.id} className={`bg-white p-8 rounded-[40px] shadow-sm border ${isExpired ? 'border-red-100 ring-2 ring-red-50/50' : 'border-slate-100'} hover:shadow-xl transition-all group relative overflow-hidden`}>
                   {contract.is_extended && <div className="absolute top-4 left-4 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black z-10">تمدید شده</div>}
                   {isExpired && !contract.is_extended && <div className="absolute top-4 left-4 bg-red-100 text-red-700 px-3 py-1 rounded-lg text-[10px] font-black z-10">پایان اعتبار</div>}
                   <div className="flex justify-between items-start mb-6">
                      <div className="relative">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${isExpired ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{(contract.client_name || 'N')[0]}</div>
                        {assignedUser && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-900 border-2 border-white rounded-full flex items-center justify-center text-[8px] text-white font-black" title={`ارجاع شده به: ${assignedUser.username}`}>
                            {assignedUser.username[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!isStrictEmployee && (
                          <div className="relative">
                            <button onClick={() => setActiveShareId(activeShareId === contract.id ? null : contract.id)} className="text-slate-300 hover:text-emerald-500 transition-all p-2 bg-slate-50 rounded-xl"><Share2 size={20}/></button>
                            {activeShareId === contract.id && (
                              <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-100 shadow-2xl rounded-2xl z-[100] animate-in zoom-in-95 p-2 overflow-hidden">
                                 <button onClick={() => { handleExportPDF(template, contract.form_data, contract.client_name, clientPlate, activeFont, true); setActiveShareId(null); }} className="w-full flex items-center gap-3 p-3 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all text-right"><MessageCircle size={18}/><span className="text-[11px] font-black">ارسال در واتساپ</span></button>
                                 <button onClick={() => { handleExportPDF(template, contract.form_data, contract.client_name, clientPlate, activeFont, false); setActiveShareId(null); }} className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 text-blue-600 rounded-xl transition-all text-right border-t border-slate-50"><Download size={18}/><span className="text-[11px] font-black">دانلود پی‌دی‌اف</span></button>
                              </div>
                            )}
                          </div>
                        )}
                        {isAdmin && <button onClick={() => setAssignmentModal(contract)} className={`p-2 rounded-xl transition-all ${contract.assigned_to ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-300 hover:text-blue-600'}`}><UserCheck size={20}/></button>}
                        {canEdit && <button onClick={() => onEdit(contract)} className="text-slate-300 hover:text-amber-500 transition-all p-2 bg-slate-50 rounded-xl"><Pencil size={20}/></button>}
                        {canPrint && <button onClick={() => { onEdit(contract); setTimeout(() => window.print(), 300); }} className="text-slate-300 hover:text-blue-600 transition-all p-2 bg-slate-50 rounded-xl"><Printer size={20}/></button>}
                        {canDelete && <button onClick={() => handleDelete(contract.id)} className="text-slate-300 hover:text-red-500 transition-all p-2 bg-slate-50 rounded-xl"><Trash2 size={20}/></button>}
                      </div>
                   </div>
                   <h4 className={`font-black text-xl mb-2 ${isExpired ? 'text-red-800' : 'text-slate-800'}`}>{contract.client_name}</h4>
                   <div className="flex flex-col gap-1">
                      <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><CreditCard size={12}/> پلاک: {clientPlate}</p>
                      <p className="text-[9px] text-slate-300 font-medium flex items-center gap-1"><Clock size={12}/> {new Date(contract.timestamp).toLocaleDateString('fa-IR')}</p>
                      {contract.expiry_date && (
                        <p className={`text-[9px] font-black mt-1 flex items-center gap-1 ${isExpired ? 'text-red-500' : 'text-blue-400'}`}>
                          <CalendarClock size={12}/> سررسید: {new Date(contract.expiry_date).toLocaleDateString('fa-IR')}
                        </p>
                      )}
                   </div>
                </div>
              );
            })}
          </div>
        ) : ( 
          <div className="text-center py-24 flex flex-col items-center gap-4">
            <Archive size={64} className="text-slate-100" />
            <h3 className="text-2xl font-black text-slate-300">
              {isStrictEmployee ? 'هیچ قراردادی به شما ارجاع نشده است.' : 'هیچ قراردادی مطابق فیلتر یافت نشد.'}
            </h3>
          </div> 
        )}
      </div>

      {assignmentModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setAssignmentModal(null)} />
          <div className="bg-white w-full max-w-md rounded-[48px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 border border-white">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center"><div><h3 className="text-2xl font-black flex items-center gap-3"><UserCheck size={24}/> ارجاع پرونده</h3><p className="text-[10px] font-bold opacity-60 mt-1">انتخاب کارمند مسئول برای قرارداد</p></div><button onClick={() => setAssignmentModal(null)} className="p-2 hover:bg-white/20 rounded-full transition-all"><X size={20}/></button></div>
            <div className="p-8 max-h-[400px] overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                <button onClick={() => handleAssign(null)} className={`w-full p-5 rounded-3xl border-2 transition-all flex items-center justify-between group ${!assignmentModal.assigned_to ? 'border-blue-600 bg-blue-50' : 'border-slate-50 hover:bg-slate-50'}`}><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><Shield size={18} className="text-slate-400"/></div><span className="font-black text-slate-700">بدون ارجاع (عمومی)</span></div>{!assignmentModal.assigned_to && <CheckCircle2 size={20} className="text-blue-600"/>}</button>
                {users.filter(u => u.username !== 'admin').map(user => (
                  <button key={user.id} onClick={() => handleAssign(user.id)} className={`w-full p-5 rounded-3xl border-2 transition-all flex items-center justify-between group ${assignmentModal.assigned_to === user.id ? 'border-blue-600 bg-blue-50' : 'border-slate-50 hover:bg-slate-50'}`}><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-black">{user.username?.[0]?.toUpperCase()}</div><span className="font-black text-slate-700">{user.username}</span></div>{assignmentModal.assigned_to === user.id && <CheckCircle2 size={20} className="text-blue-600"/>}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('workspace');
  const [editingContract, setEditingContract] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [activeFont, setActiveFont] = useState(() => localStorage.getItem('asra_active_font') || 'Vazirmatn');
  const DEFAULT_TEMPLATE: ContractTemplate = { id: 'default', pages: [ { pageNumber: 1, paperSize: PaperSize.A4, fields: INITIAL_FIELDS, showBackgroundInPrint: true }, { pageNumber: 2, paperSize: PaperSize.A4, fields: [], showBackgroundInPrint: true }, { pageNumber: 3, paperSize: PaperSize.A4, fields: [], showBackgroundInPrint: true } ] };
  const [template, setTemplate] = useState<ContractTemplate>(DEFAULT_TEMPLATE);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => { 
    localStorage.setItem('asra_active_font', activeFont);
  }, [activeFont]);

  useEffect(() => { initializeApp(); }, []);

  const initializeApp = async () => {
    const savedSession = localStorage.getItem('asra_gps_session_v2');
    if (savedSession) setCurrentUser(JSON.parse(savedSession));
    const { data: rData } = await supabase.from('roles').select('*');
    if (rData) setRoles(rData);
    const { data: sData } = await supabase.from('settings').select('*').eq('key', 'contract_template');
    let activeTemplate = DEFAULT_TEMPLATE;
    if (sData && sData.length > 0) {
      const dbTemplate = sData[0].value;
      activeTemplate = { ...DEFAULT_TEMPLATE, ...dbTemplate, pages: dbTemplate.pages && dbTemplate.pages.length > 0 ? dbTemplate.pages : DEFAULT_TEMPLATE.pages };
    } else { await supabase.from('settings').upsert([{ key: 'contract_template', value: DEFAULT_TEMPLATE }]); }
    setTemplate(activeTemplate);
    if (activeTemplate.pages) { for (const p of activeTemplate.pages) { if (p.bgImage) { try { await cacheImage(p.bgImage); } catch (err) { console.error('Initial sync failed', p.pageNumber, err); } } } }
    setInitializing(false);
  };

  const userPermissions = useMemo(() => { if (!currentUser) return []; const role = roles.find((r: any) => r.id === (currentUser.role_id || currentUser.roleId)); return role ? role.perms : []; }, [currentUser, roles]);
  const isAdmin = currentUser?.username === 'admin';
  const isStrictEmployee = currentUser?.role_id === 'employee_role';

  useEffect(() => { 
    if (!initializing && currentUser) {
      if (isStrictEmployee) {
        // Employee is forced to archive ONLY IF not currently editing something
        if (!editingContract && activeTab !== 'archive' && activeTab !== 'workspace') {
          setActiveTab('archive');
        }
      } else if (!isAdmin) {
        // Logic for custom roles:
        // 1. If the current active tab is NOT in their permission list
        if (!userPermissions.includes(activeTab)) {
          // 2. Redirect them to the first tab they DO have access to
          if (userPermissions.includes('workspace')) setActiveTab('workspace'); 
          else if (userPermissions.includes('archive')) setActiveTab('archive'); 
          else if (userPermissions.includes('accounting')) setActiveTab('accounting');
          else if (userPermissions.includes('reports')) setActiveTab('reports');
          else if (userPermissions.includes('settings')) setActiveTab('settings');
        }
      } 
    }
  }, [userPermissions, activeTab, initializing, isAdmin, isStrictEmployee, currentUser, editingContract]);

  const handleLogin = (user: any) => { setCurrentUser(user); localStorage.setItem('asra_gps_session_v2', JSON.stringify(user)); showToast(`خوش آمدید، ${user.username}`); };
  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('asra_gps_session_v2'); };

  if (initializing) return <div className="fixed inset-0 bg-slate-50 flex items-center justify-center font-black text-slate-400">در حال بارگذاری سیستم...</div>;
  if (!currentUser) return <LoginForm onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-[#FDFDFD] font-sans overflow-hidden select-none" dir="rtl">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userPermissions={userPermissions} onLogout={handleLogout} currentUser={currentUser} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative no-print">
        <div className="flex-1 overflow-hidden h-full">
          {activeTab === 'workspace' && (
            <Workspace 
              template={template} 
              editData={editingContract} 
              onEditCancel={() => { setEditingContract(null); if (isStrictEmployee) setActiveTab('archive'); }} 
              perms={userPermissions} 
              formData={formData} 
              setFormData={setFormData} 
              currentUser={currentUser} 
              activeFont={activeFont}
              setActiveFont={setActiveFont}
            />
          )}
          {activeTab === 'settings' && <SettingsPanel template={template} setTemplate={setTemplate} userPermissions={userPermissions} currentUser={currentUser} />}
          {activeTab === 'archive' && (
            <ArchivePanel 
              onEdit={(c) => { setEditingContract(c); setActiveTab('workspace'); }} 
              perms={userPermissions} 
              template={template} 
              currentUser={currentUser} 
              activeFont={activeFont}
            />
          )}
          {activeTab === 'accounting' && <AccountingPanel perms={userPermissions} currentUser={currentUser} />}
          {activeTab === 'reports' && <ReportsPanel />}
        </div>
      </main>
      <PrintLayout template={template} formData={formData} activeFont={activeFont} />
      <Toast />
      <style>{`
        @font-face { font-family: 'Vazirmatn'; font-display: swap; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
      `}</style>
    </div>
  );
}
