
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Layout, FileText, Settings, Archive, User, Search, Printer, Plus, Save, Move, RotateCw, Upload, Trash2, AlignLeft, AlignCenter, AlignRight, Grid, List, Layers, PlusCircle, ChevronDown, Files, UserPlus, X, ChevronLeft, CheckCircle2, Type, Maximize2, Bell, Pencil, ShieldCheck, Database, Download, FileJson, Key, Check, Lock, LogOut, UserCheck, Shield, Eye, EyeOff, Repeat, Phone, CreditCard, UserCircle } from 'lucide-react';
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
    request.onerror = () => reject(request.error);
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

    // If not cached, fetch and store
    // Use 'no-cors' only if necessary, but here we expect Supabase to have proper CORS
    const response = await fetch(url, { mode: 'cors' });
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

// --- Print Renderer Component ---
const PrintLayout = ({ template, formData }: { template: ContractTemplate, formData: Record<string, string> }) => {
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
              backgroundRepeat: 'no-repeat'
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
                <span className="print-text-content">
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

const Sidebar = ({ activeTab, setActiveTab, userPermissions, onLogout }: { activeTab: string, setActiveTab: (t: string) => void, userPermissions: string[], onLogout: () => void }) => {
  const menuItems = [
    { id: 'workspace', icon: Layout, label: 'میز کار', perm: 'workspace' },
    { id: 'archive', icon: Archive, label: 'بایگانی', perm: 'archive' },
    { id: 'settings', icon: Settings, label: 'تنظیمات', perm: 'settings' }
  ].filter(item => userPermissions.includes(item.perm));

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

const Workspace = ({ template, editData, onEditCancel, perms, formData, setFormData }: { template: ContractTemplate, editData?: any, onEditCancel?: () => void, perms: string[], formData: Record<string, string>, setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>> }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visiblePages, setVisiblePages] = useState<number[]>([1]);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (data) setClients(data);
  };

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
    if (!perms.includes('workspace_search')) return [];
    const lowerSearch = searchTerm.toLowerCase().trim();
    if (!lowerSearch) return [];
    return clients.filter(c => c.name.toLowerCase().includes(lowerSearch) || c.tazkira.toLowerCase().includes(lowerSearch));
  }, [clients, searchTerm, perms]);

  const handleCreateClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!perms.includes('workspace_create')) { showToast('شما دسترسی ایجاد پرونده ندارید'); return; }
    const data = new FormData(e.currentTarget);
    const newClient = { 
      id: Date.now().toString(), 
      name: data.get('name') as string, 
      father_name: data.get('fatherName') as string, 
      tazkira: data.get('tazkira') as string, 
      phone: data.get('phone') as string 
    };
    if (!newClient.name || !newClient.tazkira) { showToast('لطفاً فیلدهای ضروری را پر کنید'); return; }
    
    const { error } = await supabase.from('clients').insert([newClient]);
    if (!error) {
      await fetchClients();
      setSelectedClient(newClient as any);
      setIsModalOpen(false);
      showToast('پرونده دیجیتال مشتری ایجاد شد');
    }
  };

  const handleSaveContract = async (isExtension: boolean = false) => {
    if (!selectedClient) return;
    if (!perms.includes('workspace_create') && !editData) return;
    if (editData && !perms.includes('archive_edit') && !isExtension) { showToast('دسترسی ویرایش قرارداد را ندارید'); return; }
    
    if (editData && !isExtension) {
      const { error } = await supabase.from('contracts').update({ form_data: formData, timestamp: new Date().toISOString() }).eq('id', editData.id);
      if (!error) showToast('تغییرات قرارداد بروزرسانی شد');
    } else {
      const newEntry = { 
        id: Date.now().toString(), 
        client_id: selectedClient.id, 
        client_name: selectedClient.name, 
        form_data: formData, 
        timestamp: new Date().toISOString(), 
        template_id: template.id, 
        is_extended: isExtension 
      };
      const { error } = await supabase.from('contracts').insert([newEntry]);
      if (!error) showToast(isExtension ? 'قرارداد تمدید و به عنوان سند جدید ثبت شد' : 'قرارداد با موفقیت در بایگانی ثبت شد');
    }
    resetWorkspace();
  };

  const handleEnter = (e: React.KeyboardEvent, currentKey: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const allKeys = (template.pages || []).flatMap(p => (p.fields || []).filter(f => f.isActive)).map(f => f.key);
      const currentIndex = allKeys.indexOf(currentKey);
      if (currentIndex < allKeys.length - 1) inputRefs.current[allKeys[currentIndex + 1]]?.focus();
    }
  };

  const resetWorkspace = () => { setSelectedClient(null); setFormData({}); setVisiblePages([1]); if (onEditCancel) onEditCancel(); };

  if (!selectedClient) {
    return (
      <div className="max-w-4xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-4 no-print">
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
            <input disabled={!perms.includes('workspace_search')} type="text" placeholder={perms.includes('workspace_search') ? "جستجوی نام یا تذکره مشتری..." : "شما دسترسی جستجو ندارید"} className={`w-full pr-16 pl-8 py-6 bg-white border-2 border-slate-100 rounded-[32px] shadow-sm outline-none transition-all text-xl font-medium ${!perms.includes('workspace_search') ? 'opacity-50 grayscale cursor-not-allowed' : 'focus:border-blue-500 focus:shadow-[0_20px_50px_rgba(59,130,246,0.1)]'}`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          {perms.includes('workspace_create') && (
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-6 rounded-[32px] shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-105 transition-all flex items-center gap-3 group">
                <UserPlus size={28} />
                <span className="hidden md:block font-black text-lg">تشکیل پرونده</span>
            </button>
          )}
        </div>
        {searchTerm && perms.includes('workspace_search') && (
          <div className="mt-8 bg-white/80 backdrop-blur-xl rounded-[40px] border border-white/50 shadow-2xl overflow-hidden animate-in zoom-in-95 mx-4">
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
                           <span>تذکره: {client.tazkira}</span>
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
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
            <form onSubmit={handleCreateClient} className="bg-white w-full max-w-xl rounded-[48px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 border border-white/20">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-10 text-white flex justify-between items-center">
                <h3 className="text-2xl font-black flex items-center gap-3"><UserPlus size={32} /> تشکیل پرونده مشتری</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 rounded-full hover:bg-white/20 transition-all"><X size={24}/></button>
              </div>
              <div className="p-12 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2 uppercase">نام و تخلص</label>
                    <input name="name" type="text" className="w-full p-5 bg-slate-50 rounded-[24px] outline-none font-bold focus:bg-white focus:ring-2 ring-blue-100 transition-all" placeholder="..." required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2 uppercase">نام پدر</label>
                    <input name="fatherName" type="text" className="w-full p-5 bg-slate-50 rounded-[24px] outline-none font-bold focus:bg-white focus:ring-2 ring-blue-100 transition-all" placeholder="..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 mr-2 uppercase">شماره تذکره (ID)</label>
                  <input name="tazkira" type="text" className="w-full p-5 bg-slate-50 rounded-[24px] outline-none font-bold focus:bg-white focus:ring-2 ring-blue-100 transition-all" placeholder="..." required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 mr-2 uppercase">شماره تماس</label>
                  <input name="phone" type="text" className="w-full p-5 bg-slate-50 rounded-[24px] outline-none font-bold focus:bg-white focus:ring-2 ring-blue-100 transition-all" placeholder="..." />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-black text-xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">تایید و ایجاد پرونده</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-full mx-auto py-6 px-6 animate-in fade-in duration-500 flex flex-col h-full overflow-hidden no-print">
      <div className="bg-white rounded-[28px] px-8 py-5 shadow-sm border border-slate-100 mb-6 flex items-center justify-between no-print hover:shadow-md transition-all group w-full">
        <div className="flex-1 grid grid-cols-4 gap-8 items-center">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><UserCircle size={20}/></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">نام مشتری</span>
                  <span className="text-2xl font-black text-slate-900 leading-none">{selectedClient.name}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 text-slate-500 rounded-lg"><User size={20}/></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">نام پدر</span>
                  <span className="text-2xl font-black text-slate-900 leading-none">{selectedClient.father_name || selectedClient.fatherName}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 text-slate-500 rounded-lg"><CreditCard size={20}/></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">تذکره</span>
                  <span className="text-2xl font-black text-slate-900 leading-none">{selectedClient.tazkira}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Phone size={20}/></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">تماس</span>
                  <span className="text-2xl font-black text-slate-900 leading-none">{selectedClient.phone || '---'}</span>
                </div>
            </div>
        </div>
        <button onClick={resetWorkspace} className="mr-6 p-3 rounded-xl hover:bg-red-50 text-slate-200 hover:text-red-500 transition-all flex-shrink-0 no-print"><X size={24}/></button>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 space-y-6 custom-scrollbar px-1 no-print">
        {(template.pages || []).map((page) => {
          const isPageOpen = visiblePages.includes(page.pageNumber);
          const activeFields = (page.fields || []).filter(f => f.isActive);
          if (activeFields.length === 0) return null;
          return (
            <div key={page.pageNumber} className={`bg-white rounded-[32px] border border-slate-100 transition-all w-full ${isPageOpen ? 'shadow-lg' : 'opacity-60 shadow-sm'}`}>
              <div onClick={() => setVisiblePages(p => p.includes(page.pageNumber) ? p.filter(x => x !== page.pageNumber) : [...p, page.pageNumber])} className="p-6 flex items-center justify-between cursor-pointer group">
                <h4 className="font-black text-xl text-slate-800 flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-full transition-all ${isPageOpen ? 'bg-blue-600' : 'bg-slate-200'}`} />
                  برگ قرارداد شماره {page.pageNumber}
                </h4>
                <div className={`p-2 rounded-xl transition-all ${isPageOpen ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                   <ChevronDown className={`transition-transform duration-500 ${isPageOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
              {isPageOpen && (
                <div className="p-8 pt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6 animate-in slide-in-from-top-4 duration-300">
                  {activeFields.map((field) => (
                    <div key={field.id} className="flex flex-col gap-2">
                      <label className="text-[13px] font-black text-slate-800 px-1 tracking-tight truncate">{field.label}</label>
                      <input ref={el => inputRefs.current[field.key] = el} type="text" value={formData[field.key] || ''} onChange={(e) => setFormData({...formData, [field.key]: e.target.value})} onKeyDown={(e) => handleEnter(e, field.key)} placeholder="..." className="w-full px-5 py-4 bg-slate-50/50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500/30 focus:shadow-sm transition-all font-bold text-lg text-slate-700 placeholder:text-slate-300" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-5xl px-4 no-print z-50">
        <div className="bg-white/80 backdrop-blur-2xl border border-white/50 p-4 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-wrap gap-3 items-center justify-center">
          <button onClick={() => handleSaveContract(false)} className="flex-1 min-w-[180px] bg-blue-600 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3">
            <Save size={24} /> {editData ? 'بروزرسانی سند' : 'ثبت نهایی قرارداد'}
          </button>
          {editData && (
            <button onClick={() => handleSaveContract(true)} className="flex-1 min-w-[180px] bg-emerald-500 text-white py-5 rounded-[24px] font-black text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-600 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3">
              <Repeat size={24} /> تمدید قرارداد (ثبت جدید)
            </button>
          )}
          <button onClick={() => window.print()} className="px-10 bg-slate-900 text-white py-5 rounded-[24px] font-black text-lg flex items-center justify-center gap-3 hover:bg-black hover:-translate-y-0.5 transition-all shadow-xl">
            <Printer size={22}/> چاپ
          </button>
        </div>
      </div>
    </div>
  );
};

const UsersManager = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<'users' | 'roles'>('users');
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const permissionsList = [
    { id: 'workspace', label: 'دسترسی به میز کار', parent: null }, { id: 'workspace_create', label: 'ایجاد پرونده جدید', parent: 'workspace' }, { id: 'workspace_search', label: 'جستجوی مشتریان', parent: 'workspace' }, { id: 'archive', label: 'مشاهده بایگانی', parent: null }, { id: 'archive_print', label: 'چاپ در بایگانی', parent: 'archive' }, { id: 'archive_edit', label: 'ویرایش در بایگانی', parent: 'archive' }, { id: 'archive_delete', label: 'حذف سوابق بایگانی', parent: 'archive' }, { id: 'settings', label: 'دسترسی به تنظیمات', parent: null }, { id: 'settings_boom', label: 'مدیریت بوم طراحی', parent: 'settings' }, { id: 'settings_users', label: 'مدیریت کاربران و نقش‌ها', parent: 'settings' }, { id: 'settings_backup', label: 'پشتیبان‌گیری داده‌ها', parent: 'settings' }
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
      await supabase.from('users').update({ username, password, role_id: roleId }).eq('id', editingUser.id);
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

  const deleteUser = async (id: string) => {
    await supabase.from('users').delete().eq('id', id);
    fetchData();
  };

  const deleteRole = async (id: string) => {
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
              <h3 className="font-black text-xl mb-8 flex items-center gap-2 text-slate-800"><UserPlus className="text-blue-600"/> {editingUser ? 'ویرایش کاربر' : 'ایجاد کاربر جدید'}</h3>
              <form onSubmit={handleSaveUser} className="space-y-6">
                <input name="username" type="text" defaultValue={editingUser?.username} placeholder="نام کاربری" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold" required />
                <input name="password" type="password" defaultValue={editingUser?.password} placeholder="رمز عبور" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold" required />
                <select name="roleId" defaultValue={editingUser?.role_id || editingUser?.roleId} className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold">
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
                     <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400">{u.username[0]}</div>
                     <div><p className="font-bold text-slate-700">{u.username}</p><p className="text-xs text-slate-400">{roles.find((r:any)=>r.id===(u.role_id || u.roleId))?.name}</p></div>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => setEditingUser(u)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl"><Pencil size={18}/></button>
                     {u.username !== 'admin' && <button onClick={() => deleteUser(u.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={18}/></button>}
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
                    <div className="flex justify-between items-center mb-4"><h4 className="font-black text-lg text-blue-600">{r.name}</h4>{r.id !== 'admin_role' && <Trash2 size={16} className="text-slate-300 cursor-pointer hover:text-red-500" onClick={() => deleteRole(r.id)} />}</div>
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
    
    const data = { 
      settings: t, 
      clients: c, 
      contracts: a, 
      users: u, 
      roles: r, 
      version: '2.0.0', 
      exportDate: new Date().toISOString() 
    };
    
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
        
        // Clear all tables
        await supabase.from('contracts').delete().neq('id', '0');
        await supabase.from('clients').delete().neq('id', '0');
        await supabase.from('users').delete().neq('username', 'admin');
        await supabase.from('roles').delete().neq('id', 'admin_role');
        await supabase.from('settings').delete().neq('key', '0');

        // Restore
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
  const [newField, setNewField] = useState({ label: '', fontSize: 14, width: 150, alignment: 'R' as TextAlignment });
  const [canvasBg, setCanvasBg] = useState<string>('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // SAFETY: Ensure template and pages exist
  const pages = template.pages || [];
  const activePage = pages.find(p => p.pageNumber === activePageNum) || pages[0] || { pageNumber: activePageNum, fields: [], paperSize: PaperSize.A4, showBackgroundInPrint: true };
  const fields = activePage.fields || [];
  const selectedField = fields.find(f => f.id === selectedFieldId);

  // Load local cached background for canvas
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
  
  const handleSaveTemplate = async () => { 
    const { error } = await supabase.from('settings').upsert([{ key: 'contract_template', value: template }]);
    if (!error) showToast('قالب طراحی در پایگاه داده تثبیت شد'); 
  };

  const updateField = (id: string, updates: Partial<ContractField>) => setTemplate({ ...template, pages: pages.map(p => p.pageNumber === activePageNum ? { ...p, fields: fields.map(f => f.id === id ? { ...f, ...updates } : f) } : p) });
  const handleAddField = () => { if (!newField.label) { showToast('نام المان نمی‌تواند خالی باشد'); return; } const id = Date.now().toString(); const field: ContractField = { id, label: newField.label, key: `f_${id}`, isActive: true, x: 40, y: 40, width: newField.width, height: 30, fontSize: newField.fontSize, rotation: 0, alignment: newField.alignment }; setTemplate({ ...template, pages: pages.map(p => p.pageNumber === activePageNum ? { ...p, fields: [...fields, field] } : p) }); setNewField({ label: '', fontSize: 14, width: 150, alignment: 'R' }); showToast('المان جدید به بوم اضافه شد'); };
  const removeField = (id: string) => { setTemplate({ ...template, pages: pages.map(p => p.pageNumber === activePageNum ? { ...p, fields: fields.filter(f => f.id !== id) } : p) }); showToast('المان حذف شد'); };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { 
    const file = e.target.files?.[0]; 
    if (file) { 
      // 1. Delete old file if exists
      if (activePage.bgImage) {
        try {
          const oldPath = activePage.bgImage.split('/').pop();
          if (oldPath) {
            await supabase.storage.from('letterheads').remove([`headers/${oldPath}`]);
          }
        } catch (e) { console.error('Cleanup failed:', e); }
      }

      // 2. Upload new file
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `headers/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('letterheads').upload(filePath, file);
      
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('letterheads').getPublicUrl(filePath);
        
        // 3. Instant local preview
        const localUrl = URL.createObjectURL(file);
        setCanvasBg(localUrl);
        
        // 4. Update state and cache in background
        updatePage({ bgImage: publicUrl });
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(file, publicUrl);
        
        showToast('تصویر سربرگ جدید جایگزین و کش شد');
      }
    } 
  };

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
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="space-y-1"><label className="text-[9px] font-black text-blue-400 block text-center uppercase tracking-widest">سایز</label><input type="number" value={selectedField.fontSize} onChange={e => updateField(selectedField.id, { fontSize: Number(e.target.value) })} className="w-full bg-white border-none shadow-sm rounded-xl p-3 text-center font-black text-sm text-blue-700 outline-none" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-blue-400 block text-center uppercase tracking-widest">عرض</label><input type="number" value={selectedField.width} onChange={e => updateField(selectedField.id, { width: Number(e.target.value) })} className="w-full bg-white border-none shadow-sm rounded-xl p-3 text-center font-black text-sm text-blue-700 outline-none" /></div>
                  </div>
                  <div className="mb-6 space-y-2">
                    <div className="flex justify-between items-center px-1"><label className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1"><RotateCw size={10} /> چرخش</label><span className="text-[10px] font-black text-blue-700">{selectedField.rotation}°</span></div>
                    <input type="range" min="0" max="360" value={selectedField.rotation} onChange={e => updateField(selectedField.id, { rotation: Number(e.target.value) })} className="w-full accent-blue-600 h-1.5 bg-blue-100 rounded-full cursor-pointer transition-all" />
                  </div>
                  <div className="grid grid-cols-3 bg-white p-1 rounded-xl shadow-sm border border-blue-100/30">
                    {(['L', 'C', 'R'] as TextAlignment[]).map(a => <button key={a} onClick={() => updateField(selectedField.id, { alignment: a })} className={`py-2 rounded-lg text-xs font-black transition-all duration-300 ${selectedField.alignment === a ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-blue-600'}`}>{a === 'L' ? <AlignLeft size={14} className="mx-auto" /> : a === 'C' ? <AlignCenter size={14} className="mx-auto" /> : <AlignRight size={14} className="mx-auto" />}</button>)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col gap-6">
              <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100">
                <h3 className="text-xs font-black text-blue-900 mb-4 flex items-center gap-2"><PlusCircle size={14} /> تعریف المان</h3>
                <div className="space-y-4"><input type="text" value={newField.label} placeholder="عنوان فیلد..." onChange={e => setNewField({...newField, label: e.target.value})} className="w-full p-3.5 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-xs" /><button onClick={handleAddField} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs shadow-lg shadow-blue-100">افزودن به برگه</button></div>
              </div>
              <div className="space-y-3">{fields.map(f => <div key={f.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-3"><span className="text-xs font-bold text-slate-700 flex-1">{f.label}</span><div className="flex gap-1"><button onClick={() => updateField(f.id, { isActive: !f.isActive })} className={`p-1.5 rounded transition-all ${f.isActive ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 bg-slate-50'}`}><Check size={14}/></button><button onClick={() => removeField(f.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400"><Trash2 size={14}/></button></div></div>)}</div>
            </div>
          )}
          <div className="mt-auto pt-4 border-t border-slate-100">
             <div onClick={() => updatePage({ showBackgroundInPrint: !activePage.showBackgroundInPrint })} className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-2 ${activePage.showBackgroundInPrint ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-700'}`}>
              <div className="flex flex-col"><span className="text-[10px] font-black">تصویر سربرگ در چاپ</span></div>
              <div className={`w-10 h-5 rounded-full relative transition-all ${activePage.showBackgroundInPrint ? 'bg-white/20' : 'bg-slate-200'}`}><div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all shadow-md ${activePage.showBackgroundInPrint ? 'right-5.5 bg-white' : 'right-0.5 bg-white'}`} /></div>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-slate-200/30 p-8 overflow-auto flex items-start justify-center custom-scrollbar no-print">
          <div ref={canvasRef} className="bg-white shadow-2xl relative border border-slate-200 transition-all origin-top no-print" style={{ width: activePage.paperSize === PaperSize.A4 ? '595px' : '420px', height: activePage.paperSize === PaperSize.A4 ? '842px' : '595px', backgroundImage: canvasBg ? `url(${canvasBg})` : 'none', backgroundSize: '100% 100%' }}>
            {fields.filter(f => f.isActive).map(f => (
              <div key={f.id} onMouseDown={e => handleDrag(e, f.id)} className={`absolute cursor-move select-none group/field ${selectedFieldId === f.id ? 'z-50' : 'z-10'}`} style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.width}px`, transform: `rotate(${f.rotation}deg)`, fontSize: `${f.fontSize}px`, textAlign: f.alignment === 'L' ? 'left' : f.alignment === 'R' ? 'right' : 'center', display: 'flex', alignItems: 'center', justifyContent: f.alignment === 'L' ? 'flex-start' : f.alignment === 'R' ? 'flex-end' : 'center' }}>
                <div className={`absolute -inset-2 border-2 rounded-lg transition-all ${selectedFieldId === f.id ? 'border-blue-500 bg-blue-500/5 shadow-md' : 'border-transparent'}`} />
                <span className={`relative font-black tracking-tight w-full leading-tight break-words hyphens-auto ${selectedFieldId === f.id ? 'text-blue-700' : 'text-slate-800 opacity-60'}`} style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{f.label}</span>
              </div>
            ))}
            {!canvasBg && <div className="absolute inset-0 flex flex-col items-center justify-center opacity-5 grayscale pointer-events-none"><Maximize2 size={60} /><span className="font-black text-xl mt-4">Canvas Ready</span></div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsPanel = ({ template, setTemplate, userPermissions }: { template: ContractTemplate, setTemplate: (t: any) => void, userPermissions: string[] }) => {
  const [mainTab, setMainTab] = useState<'users' | 'boom' | 'backup'>(() => { if (userPermissions.includes('settings_boom')) return 'boom'; if (userPermissions.includes('settings_users')) return 'users'; return 'backup'; });
  const [activeSubTab, setActiveSubTab] = useState<'design' | 'fields'>('design');
  const [activePage, setActivePage] = useState(1);
  return (
    <div className="flex flex-col h-[calc(100vh-40px)] animate-in fade-in duration-500 no-print">
      <div className="flex items-center justify-center gap-4 py-6 bg-white border-b border-slate-100 no-print">
         {userPermissions.includes('settings_users') && <button onClick={() => setMainTab('users')} className={`flex items-center gap-3 px-8 py-3.5 rounded-[20px] font-black text-sm transition-all ${mainTab === 'users' ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}><User size={18}/> مدیریت کاربران و نقش‌ها</button>}
         {userPermissions.includes('settings_boom') && <button onClick={() => setMainTab('boom')} className={`flex items-center gap-3 px-8 py-3.5 rounded-[20px] font-black text-sm transition-all ${mainTab === 'boom' ? 'bg-blue-600 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}><Layers size={18}/> مدیریت سربرگ و المان‌ها</button>}
         {userPermissions.includes('settings_backup') && <button onClick={() => setMainTab('backup')} className={`flex items-center gap-3 px-8 py-3.5 rounded-[20px] font-black text-sm transition-all ${mainTab === 'backup' ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}><Database size={18}/> پشتیبان‌گیری و داده‌ها</button>}
      </div>
      <div className="flex-1 overflow-hidden no-print">
        {mainTab === 'boom' && <div className="h-full"><DesktopSettings template={template} setTemplate={setTemplate} activePageNum={activePage} activeSubTab={activeSubTab} setActiveSubTab={setActiveSubTab} onPageChange={setActivePage} /></div>}
        {mainTab === 'users' && <UsersManager />}
        {mainTab === 'backup' && <BackupManager />}
      </div>
    </div>
  );
};

const ArchivePanel = ({ onEdit, perms }: { onEdit: (contract: any) => void, perms: string[] }) => {
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    const { data } = await supabase.from('contracts').select('*').order('timestamp', { ascending: false });
    if (data) setContracts(data);
  };

  const handleDelete = async (id: string) => { 
    if (!perms.includes('archive_delete')) return; 
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (!error) {
      fetchContracts();
      showToast('قرارداد از بایگانی حذف شد'); 
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 animate-in fade-in zoom-in-95 duration-700 no-print">
      <div className="flex justify-between items-center mb-10 px-4"><div><h2 className="text-3xl font-black text-slate-800 tracking-tight">بایگانی اسناد صادر شده</h2></div><div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 px-6"><Search size={18} className="text-slate-300" /><input type="text" placeholder="جستجوی سریع..." className="outline-none bg-transparent text-sm font-bold w-48" /></div></div>
      {contracts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
          {contracts.map(contract => (
            <div key={contract.id} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 hover:shadow-xl transition-all group relative">
               {contract.is_extended && <div className="absolute top-4 left-4 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black z-10">تمدید شده</div>}
               <div className="flex justify-between items-start mb-6"><div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-black">{(contract.client_name || 'N')[0]}</div><div className="flex gap-2">{perms.includes('archive_edit') && <button onClick={() => onEdit(contract)} className="text-slate-300 hover:text-amber-500 transition-all p-2 bg-slate-50 rounded-xl"><Pencil size={20}/></button>}{perms.includes('archive_print') && <button onClick={() => { onEdit(contract); setTimeout(() => window.print(), 100); }} className="text-slate-300 hover:text-blue-600 transition-all p-2 bg-slate-50 rounded-xl"><Printer size={20}/></button>}{perms.includes('archive_delete') && <button onClick={() => handleDelete(contract.id)} className="text-slate-300 hover:text-red-500 transition-all p-2 bg-slate-50 rounded-xl"><Trash2 size={20}/></button>}</div></div>
               <h4 className="font-black text-xl text-slate-800 mb-2">{contract.client_name}</h4><p className="text-xs text-slate-400 font-medium mb-6">ثبت شده در: {new Date(contract.timestamp).toLocaleDateString('fa-IR')}</p>
            </div>
          ))}
        </div>
      ) : ( <div className="text-center py-24"><h3 className="text-2xl font-black text-slate-300">هنوز قراردادی ثبت نشده است.</h3></div> )}
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('workspace');
  const [editingContract, setEditingContract] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  
  const DEFAULT_TEMPLATE: ContractTemplate = { 
    id: 'default', 
    pages: [ 
      { pageNumber: 1, paperSize: PaperSize.A4, fields: INITIAL_FIELDS, showBackgroundInPrint: true }, 
      { pageNumber: 2, paperSize: PaperSize.A4, fields: [], showBackgroundInPrint: true }, 
      { pageNumber: 3, paperSize: PaperSize.A4, fields: [], showBackgroundInPrint: true } 
    ]
  };

  const [template, setTemplate] = useState<ContractTemplate>(DEFAULT_TEMPLATE);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    // 1. Load Session
    const savedSession = localStorage.getItem('asra_gps_session_v2');
    if (savedSession) setCurrentUser(JSON.parse(savedSession));

    // 2. Load Roles
    const { data: rData } = await supabase.from('roles').select('*');
    if (rData) setRoles(rData);

    // 3. Load Template from Settings
    const { data: sData } = await supabase.from('settings').select('*').eq('key', 'contract_template');
    
    let activeTemplate = DEFAULT_TEMPLATE;
    if (sData && sData.length > 0) {
      const dbTemplate = sData[0].value;
      activeTemplate = {
        ...DEFAULT_TEMPLATE,
        ...dbTemplate,
        pages: dbTemplate.pages && dbTemplate.pages.length > 0 ? dbTemplate.pages : DEFAULT_TEMPLATE.pages
      };
    } else {
      await supabase.from('settings').upsert([{ key: 'contract_template', value: DEFAULT_TEMPLATE }]);
    }
    
    setTemplate(activeTemplate);

    // CRITICAL: Hydrate and Cache all images in background to ensure persistence
    if (activeTemplate.pages) {
      for (const p of activeTemplate.pages) {
        if (p.bgImage) {
          try {
            await cacheImage(p.bgImage);
          } catch (err) {
            console.error('Initial sync failed for page', p.pageNumber, err);
          }
        }
      }
    }

    setInitializing(false);
  };

  const userPermissions = useMemo(() => { 
    if (!currentUser) return []; 
    const role = roles.find((r: any) => r.id === (currentUser.role_id || currentUser.roleId)); 
    return role ? role.perms : []; 
  }, [currentUser, roles]);

  useEffect(() => { 
    if (!initializing && currentUser && !userPermissions.includes(activeTab)) { 
      if (userPermissions.includes('workspace')) setActiveTab('workspace'); 
      else if (userPermissions.includes('archive')) setActiveTab('archive'); 
      else if (userPermissions.includes('settings')) setActiveTab('settings'); 
    } 
  }, [userPermissions, activeTab, initializing]);

  const handleLogin = (user: any) => { 
    setCurrentUser(user); 
    localStorage.setItem('asra_gps_session_v2', JSON.stringify(user)); 
    showToast(`خوش آمدید، ${user.username}`); 
  };

  const handleLogout = () => { 
    setCurrentUser(null); 
    localStorage.removeItem('asra_gps_session_v2'); 
  };

  if (initializing) return <div className="fixed inset-0 bg-slate-50 flex items-center justify-center font-black text-slate-400">در حال بارگذاری سیستم...</div>;
  if (!currentUser) return <LoginForm onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-[#FDFDFD] font-sans overflow-hidden select-none" dir="rtl">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userPermissions={userPermissions} onLogout={handleLogout} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative no-print">
        <div className="flex-1 overflow-auto p-0 md:p-5 custom-scrollbar h-full">
          {activeTab === 'workspace' && <Workspace template={template} editData={editingContract} onEditCancel={() => setEditingContract(null)} perms={userPermissions} formData={formData} setFormData={setFormData} />}
          {activeTab === 'settings' && <SettingsPanel template={template} setTemplate={setTemplate} userPermissions={userPermissions} />}
          {activeTab === 'archive' && <ArchivePanel onEdit={(c) => { setEditingContract(c); setActiveTab('workspace'); }} perms={userPermissions} />}
        </div>
      </main>
      
      <PrintLayout template={template} formData={formData} />
      
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
