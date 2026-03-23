import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Home, Search, PlusSquare, Heart, User, Bell, Package, ShieldCheck, Headphones, ShoppingBag, Award, ChevronLeft, ChevronRight, Camera, Star, CreditCard, Info, MessageCircle, Send, Menu, X, Share2, Clock, MapPin, CheckCircle2, AlertCircle, LogOut, Users, Filter } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import React, { useState, useEffect, createContext, useContext } from "react";

import { GoogleGenAI } from "@google/genai";
import Markdown from "react-markdown";

import { auth, db, storage } from "./firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from "firebase/auth";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Auth Context ---

interface AuthContextType {
  user: FirebaseUser | null;
  userData: any | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// --- Mock Data & Constants ---

const CITIES = ["الرياض", "جدة", "الدمام", "مكة", "المدينة", "أبها", "تبوك", "حائل", "نجران", "جازان"];
const PROVINCES: Record<string, string[]> = {
  "الرياض": ["الدرعية", "الخرج", "المجمعة", "القويعية"],
  "جدة": ["خليص", "رابع", "الليث"],
};

// --- Components ---

const Header = ({ title, showBack = true, onMenuClick }: { title?: string, showBack?: boolean, onMenuClick?: () => void }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <header className="p-4 flex items-center justify-between bg-brand-bg sticky top-0 z-30 border-b border-brand-primary/10" dir="rtl">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button onClick={onMenuClick} className="p-2 hover:bg-brand-primary/5 rounded-xl">
            <Menu size={24} className="text-brand-primary" />
          </button>
        )}
        {showBack && (
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-brand-primary/5 rounded-xl">
            <ChevronRight size={24} className="text-brand-primary" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md shadow-brand-primary/20">ل</div>
          <h1 className="text-xl font-bold text-brand-primary italic">{title || "لُقطة"}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!user ? (
          <div className="flex gap-2">
            <Link to="/login" className="px-4 py-2 text-xs font-bold text-brand-primary border border-brand-primary/20 rounded-xl hover:bg-brand-primary/5 transition-all">تسجيل الدخول</Link>
            <Link to="/register" className="px-4 py-2 text-xs font-bold bg-brand-primary text-white rounded-xl shadow-lg shadow-brand-primary/20 hover:opacity-90 transition-all">إنشاء حساب</Link>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link to="/messages" className="p-2 bg-white rounded-xl relative shadow-sm border border-brand-primary/5">
              <MessageCircle size={20} className="text-brand-primary" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Link>
            <Link to="/notifications" className="p-2 bg-white rounded-xl relative shadow-sm border border-brand-primary/5">
              <Bell size={20} className="text-brand-primary" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

const Sidebar = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    onClose();
    navigate('/');
  };

  const menuItems = user ? [
    { icon: <User size={20} />, label: userData?.name || "مستخدم", sub: userData?.role === 'admin' ? "مدير النظام 👑" : "حساب موثق ✅", color: "text-green-600", link: "/profile" },
    { icon: <Award size={20} />, label: `نوع الاشتراك: ${userData?.subscription === 'golden' ? 'ذهبي' : userData?.subscription === 'premium' ? 'مميز' : 'عادي'}`, color: "text-amber-500", link: "/packages" },
    { icon: <Filter size={20} />, label: "تصفية حسب المنطقة", link: "/filter" },
    { icon: <Package size={20} />, label: "إعلاناتي", link: "/my-ads" },
    { icon: <ShoppingBag size={20} />, label: "المشتريات والتواصل", link: "/my-purchases" },
    { icon: <Star size={20} />, label: "تقييماتي", link: "/ratings" },
    { icon: <Heart size={20} />, label: "اهتماماتي", link: "/interests" },
    { icon: <CreditCard size={20} />, label: "الباقات والاشتراكات", link: "/packages" },
    { icon: <Share2 size={20} />, label: "مشاركة التطبيق", link: "/share" },
    { icon: <ShieldCheck size={20} />, label: "ضمان waffy", link: "/waffy" },
    { icon: <Info size={20} />, label: "سياسة الخصوصية", link: "/privacy" },
    { icon: <Users size={20} />, label: "من نحن", link: "/about" },
    { icon: <Headphones size={20} />, label: "الدعم الفني", link: "/support" },
    { icon: <LogOut size={20} />, label: "تسجيل الخروج", onClick: handleLogout, color: "text-red-500" },
  ] : [
    { icon: <Filter size={20} />, label: "تصفية حسب المنطقة", link: "/filter" },
    { icon: <ShieldCheck size={20} />, label: "ضمان waffy", link: "/waffy" },
    { icon: <Info size={20} />, label: "سياسة الخصوصية", link: "/privacy" },
    { icon: <Users size={20} />, label: "من نحن", link: "/about" },
    { icon: <Headphones size={20} />, label: "الدعم الفني", link: "/support" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-4/5 max-w-sm bg-brand-bg z-50 shadow-2xl overflow-y-auto no-scrollbar"
            dir="rtl"
          >
            <div className="p-6 border-b border-brand-primary/10 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-primary/20">ل</div>
                <span className="text-xl font-bold text-brand-primary italic">لُقطة</span>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-brand-primary/5 rounded-xl">
                <X size={24} className="text-brand-primary" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {menuItems.map((item, i) => (
                item.onClick ? (
                  <button 
                    key={i} 
                    onClick={item.onClick}
                    className="w-full flex items-center gap-4 p-4 hover:bg-brand-primary/5 rounded-2xl transition-all group"
                  >
                    <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-brand-primary/5 group-hover:border-brand-primary/20 transition-all ${item.color || 'text-brand-primary'}`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 text-right">
                      <div className={`font-bold text-sm ${item.color || 'text-brand-ink'}`}>{item.label}</div>
                    </div>
                  </button>
                ) : (
                  <Link 
                    to={item.link!} 
                    key={i} 
                    onClick={onClose}
                    className="flex items-center gap-4 p-4 hover:bg-brand-primary/5 rounded-2xl transition-all group"
                  >
                    <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-brand-primary/5 group-hover:border-brand-primary/20 transition-all ${item.color || 'text-brand-primary'}`}>
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <div className={`font-bold text-sm ${item.color || 'text-brand-ink'}`}>{item.label}</div>
                      {item.sub && <div className={`text-[10px] font-bold ${item.color || 'text-brand-ink/40'}`}>{item.sub}</div>}
                    </div>
                  </Link>
                )
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const AdCard = ({ type, ad }: { type: 'golden' | 'premium' | 'normal', ad: any }) => {
  const [timeLeft, setTimeLeft] = useState({ d: 2, h: 5, m: 30, s: 45 });
  const { user } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.s > 0) return { ...prev, s: prev.s - 1 };
        if (prev.m > 0) return { ...prev, m: prev.m - 1, s: 59 };
        if (prev.h > 0) return { ...prev, h: prev.h - 1, m: 59, s: 59 };
        if (prev.d > 0) return { ...prev, d: prev.d - 1, h: 23, m: 59, s: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const badgeColor = type === 'golden' ? 'bg-amber-500' : type === 'premium' ? 'bg-brand-primary' : 'bg-brand-ink/40';
  const badgeLabel = type === 'golden' ? 'ذهبي ✨' : type === 'premium' ? 'مميز' : 'عادي';

  return (
    <div className={`bg-white rounded-[32px] overflow-hidden border border-brand-primary/5 shadow-sm hover:shadow-xl transition-all duration-500 group ${type === 'normal' ? 'flex gap-4 p-3' : 'space-y-3'}`} dir="rtl">
      <div className={`relative overflow-hidden rounded-[24px] ${type === 'normal' ? 'w-32 h-32 shrink-0' : 'aspect-[4/3]'}`}>
        <img 
          src={ad.images?.[0] || `https://picsum.photos/seed/dress${ad.id}/600/800`} 
          alt="Dress" 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className={`absolute top-3 right-3 ${badgeColor} text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-md bg-opacity-90`}>
          {badgeLabel}
        </div>
        <div className="absolute top-3 left-3 flex gap-2">
          <button className="p-2 bg-white/90 backdrop-blur-md rounded-full text-brand-ink/20 hover:text-red-500 transition-all shadow-sm">
            <Heart size={16} />
          </button>
          <button className="p-2 bg-white/90 backdrop-blur-md rounded-full text-brand-ink/20 hover:text-brand-primary transition-all shadow-sm">
            <Share2 size={16} />
          </button>
        </div>
        {type !== 'normal' && (
          <div className="absolute bottom-3 left-3 right-3 bg-black/40 backdrop-blur-md rounded-2xl p-2 flex justify-around text-white text-[10px] font-bold">
            <div className="flex flex-col items-center"><span>{timeLeft.d}</span><span>يوم</span></div>
            <div className="flex flex-col items-center"><span>{timeLeft.h}</span><span>ساعة</span></div>
            <div className="flex flex-col items-center"><span>{timeLeft.m}</span><span>دقيقة</span></div>
            <div className="flex flex-col items-center"><span>{timeLeft.s}</span><span>ثانية</span></div>
          </div>
        )}
      </div>

      <div className={`flex-1 flex flex-col justify-between ${type === 'normal' ? 'py-1' : 'px-4 pb-4'}`}>
        <div>
          <h3 className="font-bold text-brand-ink text-sm truncate">{ad.title}</h3>
          <div className="flex items-center gap-2 text-[10px] text-brand-ink/40 mt-1">
            <MapPin size={10} />
            <span>{ad.city || "الرياض"}</span>
            <span className="w-1 h-1 bg-brand-ink/10 rounded-full"></span>
            <Clock size={10} />
            <span>منذ ٣ ساعات</span>
          </div>
        </div>
        
        <div className="flex justify-between items-end mt-2">
          <div className="text-brand-primary font-bold text-lg">{ad.price} ر.س</div>
          {user ? (
            <Link to={`/product/${ad.id}`} className="text-[10px] font-bold text-brand-primary underline">التفاصيل</Link>
          ) : (
            <Link to="/login" className="text-[10px] font-bold text-red-400">سجلي الدخول للمعاينة</Link>
          )}
        </div>
        
        {type === 'normal' && (
          <div className="mt-2 flex justify-between items-center text-[9px] font-bold text-brand-ink/30">
            <div className="flex gap-1">
              <span>{timeLeft.d}ي</span>
              <span>{timeLeft.h}س</span>
              <span>{timeLeft.m}د</span>
            </div>
            <div className="flex gap-2">
              <button className="hover:text-red-500"><Heart size={14} /></button>
              <button className="hover:text-brand-primary"><Share2 size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Pages ---

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      setError("خطأ في تسجيل الدخول. يرجى التأكد من البيانات.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          role: 'user',
          points: 0,
          subscription: 'normal',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen p-8 flex flex-col justify-center space-y-8 bg-brand-bg" dir="rtl">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-brand-primary rounded-3xl flex items-center justify-center text-white font-bold text-4xl mx-auto shadow-xl shadow-brand-primary/20">ل</div>
        <h1 className="text-3xl font-bold text-brand-primary font-serif italic">لُقطة</h1>
        <p className="text-brand-ink/60">مرحباً بكِ مجدداً في عالم الأناقة</p>
      </div>

      <div className="space-y-4">
        {error && <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-sm font-bold">{error}</div>}
        <div className="space-y-1">
          <label className="text-sm font-bold text-brand-ink/70">البريد الإلكتروني</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@mail.com" 
            className="w-full p-4 bg-white border border-brand-primary/10 rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-brand-ink/70">كلمة المرور</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" 
            className="w-full p-4 bg-white border border-brand-primary/10 rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none" 
          />
        </div>
        <button 
          onClick={async () => {
            if (email) {
              await sendPasswordResetEmail(auth, email);
              alert("تم إرسال رابط استعادة كلمة المرور لبريدك");
            } else {
              alert("يرجى إدخال البريد الإلكتروني أولاً");
            }
          }}
          className="text-sm text-brand-primary font-medium"
        >
          نسيت كلمة المرور؟
        </button>
      </div>

      <div className="space-y-4">
        <button 
          onClick={handleLogin} 
          disabled={loading}
          className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold shadow-lg shadow-brand-primary/20 disabled:opacity-50"
        >
          {loading ? "جاري التحميل..." : "تسجيل الدخول"}
        </button>
        <button 
          onClick={handleGoogleLogin}
          className="w-full py-4 bg-white text-brand-ink border border-brand-primary/10 rounded-2xl font-bold flex items-center justify-center gap-2"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          تسجيل الدخول بواسطة جوجل
        </button>
        <div className="text-center text-sm text-brand-ink/50">
          ليس لديكِ حساب؟ <Link to="/register" className="text-brand-primary font-bold">إنشاء حساب جديد</Link>
        </div>
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون ٨ أحرف على الأقل");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        name,
        email,
        phone,
        role: 'user',
        points: 0,
        subscription: 'normal',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      navigate('/');
    } catch (err: any) {
      setError("حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 flex flex-col justify-center space-y-8 bg-brand-bg" dir="rtl">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-serif font-bold text-brand-ink">إنشاء حساب</h1>
        <p className="text-brand-ink/60">انضمي إلينا واعرضي فساتينك بكل سهولة</p>
      </div>

      <div className="space-y-4">
        {error && <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-sm font-bold">{error}</div>}
        <div className="space-y-1">
          <label className="text-sm font-bold text-brand-ink/70">الاسم الكامل</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نورة محمد" 
            className="w-full p-4 bg-white border border-brand-primary/10 rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-brand-ink/70">البريد الإلكتروني</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@mail.com" 
            className="w-full p-4 bg-white border border-brand-primary/10 rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-brand-ink/70">رقم الجوال</label>
          <input 
            type="tel" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05xxxxxxxx" 
            className="w-full p-4 bg-white border border-brand-primary/10 rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none" 
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-brand-ink/70">كلمة المرور</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" 
            className="w-full p-4 bg-white border border-brand-primary/10 rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none" 
          />
        </div>
      </div>

      <div className="space-y-4">
        <button 
          onClick={handleRegister} 
          disabled={loading}
          className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold shadow-lg shadow-brand-primary/20 disabled:opacity-50"
        >
          {loading ? "جاري التحميل..." : "إنشاء الحساب"}
        </button>
        <div className="text-center text-sm text-brand-ink/50">
          لديكِ حساب بالفعل؟ <Link to="/login" className="text-brand-primary font-bold">تسجيل الدخول</Link>
        </div>
      </div>
    </div>
  );
};

const NotificationsPage = () => (
  <div className="pb-24 bg-brand-bg min-h-screen">
    <Header title="التنبيهات" />
    <div className="p-4 space-y-4" dir="rtl">
      {[
        { title: "تم قبول إعلانك!", desc: "إعلانك 'فستان سهرة أزرق' أصبح متاحاً الآن للجميع.", time: "منذ ٥ دقائق", type: "success" },
        { title: "رسالة جديدة", desc: "وصلتك رسالة من 'أمل' بخصوص فستان الزفاف.", time: "منذ ساعة", type: "msg" },
        { title: "تحديث النقاط", desc: "مبروك! حصلتِ على ٥٠ نقطة جديدة لمشاركتك التطبيق.", time: "منذ يومين", type: "points" },
      ].map((notif, i) => (
        <div key={i} className="bg-white p-4 rounded-2xl shadow-sm flex gap-4 items-start border border-brand-primary/5">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'success' ? 'bg-green-50 text-green-600' : notif.type === 'msg' ? 'bg-brand-primary/10 text-brand-primary' : 'bg-amber-50 text-amber-600'}`}>
            {notif.type === 'success' ? <ShieldCheck size={20} /> : notif.type === 'msg' ? <Bell size={20} /> : <Award size={20} />}
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-bold text-brand-ink">{notif.title}</h3>
            <p className="text-sm text-brand-ink/60">{notif.desc}</p>
            <span className="text-[10px] text-brand-ink/30 block">{notif.time}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MyAdsPage = () => {
  const { user } = useAuth();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const path = 'ads';
    const q = query(collection(db, path), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAds(adsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="pb-24 bg-brand-bg min-h-screen">
      <Header title="إعلاناتي" />
      <div className="p-4 space-y-4" dir="rtl">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : ads.length > 0 ? (
          ads.map((ad, i) => (
            <div key={ad.id} className="bg-white p-3 rounded-2xl shadow-sm flex gap-4 border border-brand-primary/5">
              <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0">
                <img src={ad.images?.[0] || `https://picsum.photos/seed/myad${i}/200/200`} alt="Ad" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 flex flex-col justify-between py-1">
                <div>
                  <h3 className="font-bold text-brand-ink text-sm truncate">{ad.title}</h3>
                  <p className="text-brand-primary font-bold">{ad.price} ر.س</p>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${ad.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                    {ad.status === 'active' ? 'نشط' : 'قيد المراجعة'}
                  </span>
                  <div className="flex gap-2">
                    <button className="text-xs text-brand-ink/40 underline">تعديل</button>
                    <button className="text-xs text-red-400 underline">حذف</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 space-y-4">
            <Package size={48} className="mx-auto text-brand-ink/10" />
            <p className="text-brand-ink/40 font-bold">لا توجد إعلانات حالياً</p>
            <Link to="/add" className="inline-block px-8 py-3 bg-brand-primary text-white rounded-2xl font-bold">أضيفي إعلانك الأول</Link>
          </div>
        )}
      </div>
    </div>
  );
};

const PointsPage = () => (
  <div className="pb-24 bg-brand-bg min-h-screen">
    <Header title="نقاطي وجوائزي" />
    <div className="p-4 space-y-6" dir="rtl">
      <div className="bg-brand-primary p-8 rounded-[40px] text-white text-center space-y-4 shadow-xl shadow-brand-primary/20">
        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto">
          <Award size={40} />
        </div>
        <div>
          <div className="text-4xl font-bold">2,450</div>
          <div className="text-sm opacity-80">نقطة لُقطة</div>
        </div>
        <button className="bg-white text-brand-primary px-8 py-3 rounded-2xl font-bold text-sm">استبدال النقاط</button>
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-lg text-brand-ink">كيف تحصلين على نقاط؟</h2>
        <div className="grid grid-cols-1 gap-3">
          {[
            { label: "إضافة إعلان جديد", points: "+50", icon: <PlusSquare /> },
            { label: "مشاركة التطبيق", points: "+100", icon: <Info /> },
            { label: "إتمام عملية شراء", points: "+200", icon: <ShoppingBag /> },
          ].map((item, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-brand-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-bg text-brand-primary rounded-xl flex items-center justify-center">{item.icon}</div>
                <span className="font-medium text-brand-ink/70">{item.label}</span>
              </div>
              <span className="text-green-600 font-bold">{item.points}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const PackagesPage = () => (
  <div className="pb-24 bg-brand-bg min-h-screen">
    <Header title="الباقات والاشتراكات" />
    <div className="p-4 space-y-6" dir="rtl">
      {[
        { name: "الباقة الذهبية", price: "199 ر.س", features: ["٥ إعلانات ذهبية", "ظهور في الصفحة الأولى", "دعم فني ٢٤/٧"], color: "bg-amber-500", shadow: "shadow-amber-200" },
        { name: "الباقة المميزة", price: "99 ر.س", features: ["٣ إعلانات مميزة", "ظهور متكرر", "إحصائيات متقدمة"], color: "bg-brand-primary", shadow: "shadow-brand-primary/20" },
        { name: "الباقة المجانية", price: "0 ر.س", features: ["إعلان واحد عادي", "مدة الإعلان ٣٠ يوم"], color: "bg-brand-ink", shadow: "shadow-brand-ink/20" },
      ].map((pkg, i) => (
        <div key={i} className={`${pkg.color} p-6 rounded-[32px] text-white space-y-6 shadow-xl ${pkg.shadow}`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold">{pkg.name}</h3>
              <p className="text-sm opacity-80">شهرياً</p>
            </div>
            <div className="text-3xl font-bold">{pkg.price}</div>
          </div>
          <ul className="space-y-3">
            {pkg.features.map((f, j) => (
              <li key={j} className="flex items-center gap-2 text-sm">
                <ShieldCheck size={16} />
                {f}
              </li>
            ))}
          </ul>
          <button className="w-full py-4 bg-white/20 backdrop-blur-md rounded-2xl font-bold hover:bg-white/30 transition-colors">اشتركي الآن</button>
        </div>
      ))}
    </div>
  </div>
);

const PrivacyPage = () => (
  <div className="pb-24 bg-brand-bg min-h-screen">
    <Header title="سياسة الخصوصية" />
    <div className="p-6 space-y-6 text-right" dir="rtl">
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-brand-primary">١. جمع المعلومات</h2>
        <p className="text-brand-ink/70 leading-relaxed">نحن نجمع المعلومات التي تقدمينها لنا مباشرة عند إنشاء حساب، مثل الاسم والبريد الإلكتروني ورقم الجوال.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-brand-primary">٢. استخدام المعلومات</h2>
        <p className="text-brand-ink/70 leading-relaxed">نستخدم المعلومات لتحسين تجربتك في التطبيق، ومعالجة إعلاناتك، والتواصل معك بخصوص التحديثات.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-brand-primary">٣. حماية البيانات</h2>
        <p className="text-brand-ink/70 leading-relaxed">نحن نطبق مجموعة من الإجراءات الأمنية للحفاظ على سلامة معلوماتك الشخصية وعدم مشاركتها مع أطراف ثالثة.</p>
      </section>
    </div>
  </div>
);

const SupportPage = () => (
  <div className="pb-24 bg-brand-bg min-h-screen">
    <Header title="الدعم الفني" />
    <div className="p-4 space-y-6" dir="rtl">
      <div className="bg-white p-6 rounded-3xl text-center space-y-4 shadow-sm border border-brand-primary/5">
        <div className="w-16 h-16 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center mx-auto">
          <Headphones size={32} />
        </div>
        <h2 className="text-xl font-bold text-brand-ink">كيف يمكننا مساعدتك؟</h2>
        <p className="text-brand-ink/50 text-sm">فريقنا متواجد دائماً للإجابة على استفساراتك</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-bold text-brand-ink/70">نوع الاستفسار</label>
          <select className="w-full p-4 bg-white border border-brand-primary/10 rounded-2xl focus:ring-2 focus:ring-brand-primary appearance-none shadow-sm outline-none">
            <option>مشكلة تقنية</option>
            <option>استفسار عن باقة</option>
            <option>اقتراح جديد</option>
            <option>أخرى</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-bold text-brand-ink/70">الالرسالة</label>
          <textarea rows={5} placeholder="اكتبي استفسارك هنا..." className="w-full p-4 bg-white border border-brand-primary/10 rounded-2xl focus:ring-2 focus:ring-brand-primary shadow-sm outline-none"></textarea>
        </div>
        <button className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold shadow-lg shadow-brand-primary/20">إرسال الطلب</button>
      </div>
    </div>
  </div>
);

const FavoritesPage = () => {
  const { user } = useAuth();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const path = 'favorites';
    const q = query(collection(db, path), where("userUid", "==", user.uid), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const favoriteAdIds = snapshot.docs.map(doc => doc.data().adId);
      
      if (favoriteAdIds.length === 0) {
        setAds([]);
        setLoading(false);
        return;
      }

      // Fetch the actual ad documents
      const adsData: any[] = [];
      for (const adId of favoriteAdIds) {
        const adDoc = await getDoc(doc(db, 'ads', adId));
        if (adDoc.exists()) {
          adsData.push({ id: adDoc.id, ...adDoc.data() });
        }
      }
      
      setAds(adsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="pb-24 bg-brand-bg min-h-screen">
      <Header title="المفضلة" />
      <div className="p-4" dir="rtl">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : ads.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 space-y-4">
            <Heart size={48} className="mx-auto text-brand-ink/10" />
            <p className="text-brand-ink/40 font-bold">لا توجد فساتين في المفضلة حالياً</p>
            <Link to="/" className="inline-block px-8 py-3 bg-brand-primary text-white rounded-2xl font-bold">استكشفي الفساتين</Link>
          </div>
        )}
      </div>
    </div>
  );
};

const SearchPage = () => (
  <div className="pb-24 bg-brand-bg min-h-screen">
    <header className="p-4 bg-brand-bg sticky top-0 z-10 border-b border-brand-primary/10 space-y-4" dir="rtl">
      <h1 className="text-xl font-serif font-bold text-brand-ink">البحث</h1>
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/30 group-hover:text-brand-primary transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="ابحثي عن فستان، مصمم، أو مدينة..." 
          className="w-full pl-10 pr-4 py-3 bg-white border border-brand-primary/10 rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none text-right shadow-sm"
          dir="rtl"
          autoFocus
        />
      </div>
    </header>

    <div className="p-4 space-y-8" dir="rtl">
      <div className="space-y-4">
        <h2 className="text-[10px] font-bold text-brand-ink/30 uppercase tracking-widest">عمليات البحث الأخيرة</h2>
        <div className="flex flex-wrap gap-2">
          {["فستان زفاف دانتيل", "مصمم إيلي صعب", "الرياض", "مقاس سمول"].map((tag, i) => (
            <button key={i} className="px-5 py-2.5 bg-white rounded-2xl text-sm text-brand-ink/70 border border-brand-primary/5 shadow-sm hover:border-brand-primary transition-all">
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-[10px] font-bold text-brand-ink/30 uppercase tracking-widest">اقتراحات لكِ</h2>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-brand-primary/5 group">
              <div className="aspect-[3/4] overflow-hidden">
                <img src={`https://picsum.photos/seed/search${i}/300/400`} alt="Suggest" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="p-3 space-y-1">
                <p className="text-sm font-bold text-brand-ink truncate">فستان سهرة كلاسيك</p>
                <p className="text-brand-primary font-bold text-xs">1,100 ر.س</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const MyPurchasesPage = () => (
  <div className="pb-24 bg-brand-bg min-h-screen">
    <Header title="مشترياتي" />
    <div className="p-4 space-y-4" dir="rtl">
      {[
        { id: "#12345", date: "١٥ مارس ٢٠٢٤", price: "2,500 ر.س", status: "تم التوصيل", img: "dress1" },
        { id: "#12346", date: "١٠ مارس ٢٠٢٤", price: "1,800 ر.س", status: "قيد الشحن", img: "dress2" },
      ].map((order, i) => (
        <div key={i} className="bg-white p-4 rounded-3xl shadow-sm space-y-4 border border-brand-primary/5">
          <div className="flex justify-between items-center border-b border-brand-primary/5 pb-3">
            <div>
              <div className="text-xs text-brand-ink/30">رقم الطلب</div>
              <div className="font-bold text-brand-ink">{order.id}</div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'تم التوصيل' ? 'bg-green-50 text-green-600' : 'bg-brand-primary/10 text-brand-primary'}`}>
              {order.status}
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-brand-bg">
              <img src={`https://picsum.photos/seed/${order.img}/200/200`} alt="Order" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-sm font-bold text-brand-ink">فستان سهرة راقي</div>
              <div className="text-xs text-brand-ink/30">{order.date}</div>
            </div>
            <div className="flex flex-col justify-center text-left">
              <div className="font-bold text-brand-primary">{order.price}</div>
            </div>
          </div>
          <button className="w-full py-3 bg-brand-bg text-brand-ink/60 rounded-xl text-sm font-bold border border-brand-primary/5">تفاصيل الطلب</button>
        </div>
      ))}
    </div>
  </div>
);

const MessagesPage = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const path = 'chats';
    const q = query(collection(db, path), where("participants", "array-contains", user.uid), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChats(chatsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="pb-24 bg-brand-bg min-h-screen">
      <Header title="الرسائل" />
      <div className="p-4 space-y-4" dir="rtl">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : chats.length > 0 ? (
          chats.map((chat) => (
            <Link to={`/chat/${chat.id}`} key={chat.id} className="bg-white p-4 rounded-[32px] shadow-sm flex gap-4 items-center border border-brand-primary/5 hover:border-brand-primary/20 transition-all group">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-brand-bg shrink-0 border-2 border-brand-primary/10 shadow-sm">
                <img src={`https://i.pravatar.cc/150?u=${chat.id}`} alt="User" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-brand-ink group-hover:text-brand-primary transition-colors">مستخدم لُقطة</h3>
                  <span className="text-[10px] font-bold text-brand-ink/30 uppercase">
                    {chat.updatedAt?.toDate ? chat.updatedAt.toDate().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <p className="text-sm truncate text-brand-ink/50">{chat.lastMessage || 'لا توجد رسائل بعد'}</p>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-20 space-y-4">
            <MessageSquare size={48} className="mx-auto text-brand-ink/10" />
            <p className="text-brand-ink/40 font-bold">لا توجد رسائل حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ChatPage = () => {
  const { chatId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) return;
    const path = `chats/${chatId}/messages`;
    const q = query(collection(db, path), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [chatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chatId) return;

    const msgText = newMessage;
    setNewMessage('');

    try {
      const path = `chats/${chatId}/messages`;
      await addDoc(collection(db, path), {
        senderUid: user.uid,
        text: msgText,
        createdAt: serverTimestamp()
      });

      // Update last message in chat
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: msgText,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}/messages`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-brand-bg" dir="rtl">
      <header className="p-4 bg-white border-b border-brand-primary/10 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-brand-bg rounded-full transition-colors">
          <ChevronLeft size={24} className="text-brand-primary" />
        </button>
        <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-bg border-2 border-brand-primary/10 shadow-sm">
          <img src={`https://i.pravatar.cc/150?u=${chatId}`} alt="User" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-brand-ink">مستخدم لُقطة</h2>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">متصلة الآن</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderUid === user?.uid ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-5 rounded-[28px] shadow-xl max-w-[85%] ${
                msg.senderUid === user?.uid 
                  ? 'bg-brand-primary text-white rounded-tl-none shadow-brand-primary/20' 
                  : 'bg-white text-brand-ink/80 rounded-tr-none shadow-brand-primary/5 border border-brand-primary/5'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <span className={`text-[10px] font-bold block mt-2 uppercase ${msg.senderUid === user?.uid ? 'opacity-50 text-right' : 'text-brand-ink/20 text-left'}`}>
                  {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20">
            <p className="text-brand-ink/30 font-bold">ابدئي المحادثة الآن</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-brand-primary/10 flex gap-3 items-center shadow-2xl">
        <button type="button" className="p-3 text-brand-ink/30 hover:text-brand-primary transition-colors">
          <PlusSquare size={26} />
        </button>
        <div className="flex-1 relative">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="اكتبي رسالتك هنا..." 
            className="w-full pl-14 pr-5 py-4 bg-brand-bg border border-brand-primary/5 rounded-[24px] focus:ring-2 focus:ring-brand-primary outline-none shadow-inner"
          />
          <button type="submit" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-10 h-10 bg-brand-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/30 hover:opacity-90 transition-opacity">
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

const CategoryPage = () => {
  const { slug } = useParams();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const categoryMap: Record<string, string> = {
    'evening': 'سهرة',
    'wedding': 'زفاف',
    'daily': 'يومي',
    'kids': 'أطفال'
  };
  
  const title = categoryMap[slug || ''] || 'فساتين';

  useEffect(() => {
    const path = 'ads';
    const categoryName = categoryMap[slug || ''];
    let q;
    if (categoryName) {
      q = query(collection(db, path), where("category", "==", categoryName), orderBy("createdAt", "desc"));
    } else {
      q = query(collection(db, path), orderBy("createdAt", "desc"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAds(adsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [slug]);

  return (
    <div className="pb-24 bg-brand-bg min-h-screen">
      <Header title={`فساتين ${title}`} />
      <div className="p-4" dir="rtl">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : ads.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 space-y-4">
            <Package size={48} className="mx-auto text-brand-ink/10" />
            <p className="text-brand-ink/40 font-bold">لا توجد فساتين في هذا القسم حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App Logic ---

const HomePage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "ads"), where("status", "==", "active"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAds(adsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "ads");
    });
    return unsubscribe;
  }, []);

  const goldenAds = ads.filter(ad => ad.type === 'golden');
  const premiumAds = ads.filter(ad => ad.type === 'premium');
  const normalAds = ads.filter(ad => ad.type === 'normal');

  return (
    <div className="pb-24 bg-brand-bg min-h-screen">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="p-4 space-y-8">
        {/* Search & Filter */}
        <div className="flex gap-2">
          <Link to="/search" className="flex-1 relative block group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/30 group-hover:text-brand-primary transition-colors" size={20} />
            <div className="w-full pl-10 pr-4 py-3 bg-white border border-brand-primary/10 rounded-2xl text-brand-ink/30 text-right shadow-sm group-hover:border-brand-primary/30 transition-colors" dir="rtl">
              ابحثي عن فستان أحلامك...
            </div>
          </Link>
          <Link to="/filter" className="p-3 bg-white border border-brand-primary/10 rounded-2xl text-brand-primary shadow-sm hover:bg-brand-primary/5 transition-all">
            <Filter size={24} />
          </Link>
        </div>

        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar" dir="rtl">
          {[
            { name: "الكل", slug: "all" },
            { name: "عرس", slug: "wedding" },
            { name: "خطوبة", slug: "engagement" },
            { name: "سهرة", slug: "evening" },
            { name: "غمرة", slug: "ghomra" },
            { name: "أخرى", slug: "other" }
          ].map((cat, i) => (
            <Link 
              to={cat.slug === 'all' ? '/' : `/category/${cat.slug}`}
              key={i} 
              className={`px-6 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${i === 0 ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20' : 'bg-white text-brand-ink/60 border border-brand-primary/10 hover:border-brand-primary/30'}`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Golden Ads - Horizontal Scroll */}
            {goldenAds.length > 0 && (
              <section className="space-y-4">
                <div className="flex justify-between items-center px-1" dir="rtl">
                  <h2 className="text-lg font-bold text-brand-ink flex items-center gap-2">
                    الإعلانات الذهبية <span className="text-amber-500">✨</span>
                  </h2>
                  <button className="text-brand-primary text-xs font-bold">عرض الكل</button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-1" dir="rtl">
                  {goldenAds.map((ad) => (
                    <div key={ad.id} className="w-[85vw] shrink-0">
                      <AdCard type="golden" ad={ad} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Premium Ads - Horizontal Scroll */}
            {premiumAds.length > 0 && (
              <section className="space-y-4">
                <div className="flex justify-between items-center px-1" dir="rtl">
                  <h2 className="text-lg font-bold text-brand-ink">الإعلانات المميزة</h2>
                  <button className="text-brand-primary text-xs font-bold">عرض الكل</button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar px-1" dir="rtl">
                  {premiumAds.map((ad) => (
                    <div key={ad.id} className="w-[70vw] shrink-0">
                      <AdCard type="premium" ad={ad} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Normal Ads - Vertical List */}
            <section className="space-y-4">
              <div className="flex justify-between items-center px-1" dir="rtl">
                <h2 className="text-lg font-bold text-brand-ink">أحدث الإعلانات</h2>
                <div className="flex items-center gap-2 text-[10px] text-brand-ink/30 font-bold uppercase tracking-widest">
                  <CheckCircle2 size={12} className="text-green-500" />
                  معتمدة من الإدارة
                </div>
              </div>
              <div className="space-y-4 px-1">
                {normalAds.length > 0 ? normalAds.map((ad) => (
                  <AdCard key={ad.id} type="normal" ad={ad} />
                )) : (
                  <div className="text-center py-10 text-brand-ink/40">لا توجد إعلانات حالياً</div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [ad, setAd] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);

  useEffect(() => {
    if (!id) return;
    const path = `ads/${id}`;
    const unsubscribe = onSnapshot(doc(db, 'ads', id), (docSnap) => {
      if (docSnap.exists()) {
        setAd({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.error("Ad not found");
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  const handleRevealContact = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Simulation of payment
    setIsRevealing(true);
    setTimeout(() => {
      setShowContact(true);
      setIsRevealing(false);
      alert("تم دفع ٢٠ ريال بنجاح. يمكنك الآن رؤية بيانات التواصل.");
    }, 1500);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-brand-bg">
      <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!ad) return (
    <div className="flex flex-col items-center justify-center h-screen bg-brand-bg space-y-4">
      <AlertCircle size={48} className="text-red-500" />
      <h2 className="text-xl font-bold text-brand-ink">الإعلان غير موجود</h2>
      <Link to="/" className="text-brand-primary font-bold underline">العودة للرئيسية</Link>
    </div>
  );

  return (
    <div className="pb-24 bg-brand-bg min-h-screen">
      <div className="relative h-[65vh]">
        <img 
          src={ad.images?.[0] || "https://picsum.photos/seed/dress1/800/1200"} 
          alt="Product" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-6 left-0 right-0 px-6 flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="p-3 bg-white/90 backdrop-blur-md rounded-full text-brand-ink shadow-lg border border-brand-primary/10">
            <ChevronLeft size={24} />
          </button>
          <button className="p-3 bg-white/90 backdrop-blur-md rounded-full text-brand-ink shadow-lg border border-brand-primary/10">
            <Heart size={24} />
          </button>
        </div>
        <div className={`absolute bottom-12 right-6 ${ad.type === 'golden' ? 'bg-amber-500' : ad.type === 'premium' ? 'bg-brand-primary' : 'bg-brand-ink/40'} text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-md bg-opacity-90`}>
          {ad.type === 'golden' ? 'ذهبي ✨' : ad.type === 'premium' ? 'مميز' : 'عادي'}
        </div>
      </div>
      
      <div className="bg-white -mt-10 rounded-t-[48px] p-8 space-y-8 relative shadow-2xl border-t border-brand-primary/5" dir="rtl">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-bold text-brand-ink leading-tight">{ad.title}</h1>
            <div className="flex items-center gap-2 text-xs text-brand-ink/40 font-bold">
              <span>{ad.city}</span>
              <span className="w-1 h-1 bg-brand-ink/20 rounded-full"></span>
              <span>منذ ساعتين</span>
            </div>
          </div>
          <div className="text-left">
            <div className="text-2xl font-bold text-brand-primary">{ad.price} ر.س</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "المقاس", value: ad.size || "M" },
            { label: "الحالة", value: ad.condition || "ممتازة" },
            { label: "التصنيف", value: ad.category }
          ].map((item, i) => (
            <div key={i} className="bg-brand-bg p-4 rounded-3xl text-center border border-brand-primary/5">
              <div className="text-[10px] font-bold text-brand-ink/30 mb-1 uppercase tracking-wider">{item.label}</div>
              <div className="font-bold text-brand-ink text-sm">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="font-serif font-bold text-lg text-brand-ink">الوصف</h2>
          <p className="text-brand-ink/70 leading-relaxed text-sm">
            {ad.description}
          </p>
        </div>

        <div className="flex items-center gap-4 p-5 bg-brand-bg rounded-[32px] border border-brand-primary/10">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-white border-2 border-brand-primary/20 shadow-sm">
            <img src={ad.userPhoto || `https://i.pravatar.cc/150?u=${ad.userId}`} alt="Seller" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-brand-ink">{ad.userName}</div>
            <div className="text-[10px] font-bold text-brand-ink/40 uppercase tracking-wider">عضو منذ ٢٠٢٣ • ٤.٨ ⭐</div>
          </div>
          <button className="px-5 py-2.5 bg-white text-brand-primary rounded-2xl text-xs font-bold border border-brand-primary/10 hover:bg-brand-primary hover:text-white transition-all shadow-sm">عرض الملف</button>
        </div>

        {showContact ? (
          <div className="p-6 bg-brand-primary/5 rounded-[32px] border border-brand-primary/20 space-y-4">
            <h3 className="font-bold text-brand-ink">بيانات التواصل:</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-brand-ink/70">
                <ShoppingBag size={18} />
                <span className="font-bold">050XXXXXXX</span>
              </div>
              <div className="flex items-center gap-3 text-brand-ink/70">
                <Bell size={18} />
                <span className="font-bold">{ad.userName}@example.com</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-brand-primary/5 rounded-[32px] border border-brand-primary/20 text-center space-y-4">
            <p className="text-sm font-bold text-brand-ink/70">بيانات التواصل مخفية لحماية الخصوصية</p>
            <button 
              onClick={handleRevealContact}
              disabled={isRevealing}
              className="px-8 py-3 bg-brand-primary text-white rounded-2xl font-bold shadow-lg shadow-brand-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isRevealing ? "جاري المعالجة..." : "إظهار بيانات التواصل (٢٠ ر.س)"}
            </button>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-brand-primary/10 flex gap-4 z-50 max-w-md mx-auto">
        <Link to={`/chat/${ad.userId}`} className="flex-1 bg-brand-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-brand-primary/20 text-center hover:opacity-90 transition-opacity">تواصل الآن</Link>
        <button onClick={() => alert("سيتم توجيهك لبوابة الدفع قريباً")} className="flex-1 bg-brand-ink text-white py-4 rounded-2xl font-bold shadow-xl shadow-brand-ink/20 text-center hover:opacity-90 transition-opacity">شراء مباشر</button>
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="pb-24 bg-brand-bg min-h-screen flex flex-col items-center justify-center p-6 space-y-6">
        <div className="w-24 h-24 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary">
          <User size={48} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-brand-ink">سجلي الدخول للوصول لملفك</h2>
          <p className="text-sm text-brand-ink/50">تابعي إعلاناتك، مشترياتك، ونقاطك في مكان واحد</p>
        </div>
        <Link to="/login" className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold text-center shadow-lg shadow-brand-primary/20">تسجيل الدخول</Link>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-brand-bg min-h-screen">
      <header className="bg-brand-primary p-10 pb-20 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
        </div>
        <h1 className="text-xl font-serif font-bold relative z-10">الملف الشخصي</h1>
        <div className="absolute -bottom-14 left-1/2 -translate-x-1/2">
          <div className="w-28 h-28 rounded-[32px] border-4 border-brand-bg overflow-hidden bg-white shadow-2xl relative z-10">
            <img src={user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`} alt="User" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      <div className="mt-20 p-6 space-y-8">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-serif font-bold text-brand-ink">{userData?.name || user.displayName || "مستخدم لُقطة"}</h2>
          <p className="text-brand-ink/40 text-sm font-bold">{user.email}</p>
          <div className="flex justify-center gap-2 mt-2">
            <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-bold uppercase tracking-wider">
              {userData?.subscription || "باقة مجانية"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-0 bg-white rounded-[32px] shadow-xl shadow-brand-primary/5 border border-brand-primary/5 overflow-hidden">
          {[
            { label: "إعلان", value: userData?.adsCount || "٠" },
            { label: "متابعة", value: userData?.followingCount || "٠" },
            { label: "نقاط", value: userData?.points || "٠" }
          ].map((stat, i) => (
            <div key={i} className={`text-center py-6 ${i !== 2 ? 'border-l border-brand-primary/5' : ''}`}>
              <div className="text-xl font-bold text-brand-primary mb-1">{stat.value}</div>
              <div className="text-[10px] font-bold text-brand-ink/30 uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[40px] shadow-xl shadow-brand-primary/5 border border-brand-primary/5 overflow-hidden" dir="rtl">
          {[
            { icon: <ShoppingBag size={20} />, label: "مشترياتي", link: "/my-purchases" },
            { icon: <Package size={20} />, label: "إعلاناتي", link: "/my-ads" },
            { icon: <Heart size={20} />, label: "المفضلة", link: "/favorites" },
            { icon: <Award size={20} />, label: "نقاطي وجوائزي", link: "/points" },
            { icon: <Package size={20} />, label: "الباقات والاشتراكات", link: "/packages" },
            { icon: <ShieldCheck size={20} />, label: "سياسة الخصوصية", link: "/privacy" },
            { icon: <Info size={20} />, label: "الإعدادات", link: "/settings" },
            { icon: <Headphones size={20} />, label: "الدعم الفني", link: "/support" },
          ].map((item, i) => (
            <Link 
              key={i} 
              to={item.link} 
              className={`flex items-center gap-5 p-5 hover:bg-brand-bg transition-all group ${i !== 7 ? 'border-b border-brand-primary/5' : ''}`}
            >
              <div className="w-12 h-12 bg-brand-bg text-brand-primary rounded-2xl flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition-all shadow-sm">
                {item.icon}
              </div>
              <span className="flex-1 font-bold text-brand-ink/70 group-hover:text-brand-primary transition-colors">{item.label}</span>
              <div className="text-brand-ink/20 group-hover:text-brand-primary group-hover:translate-x-[-4px] transition-all">←</div>
            </Link>
          ))}
        </div>

        <button 
          onClick={async () => {
            await logout();
            navigate('/');
          }}
          className="w-full py-5 text-red-500 font-bold bg-white rounded-[32px] shadow-xl shadow-red-500/5 border border-red-500/10 hover:bg-red-50 hover:border-red-500/20 transition-all"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
};

const AddAdPage = () => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("فساتين سهرة");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState(userData?.city || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles]);
      
      const newUrls = newFiles.map(file => URL.createObjectURL(file));
      setImageUrls(prev => [...prev, ...newUrls]);
    }
  };

  const generateDescription = async () => {
    if (!title) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `اكتبي وصفاً جذاباً وراقياً لفستان سهرة بعنوان: "${title}". الوصف يجب أن يكون باللغة العربية، يبرز جمال الفستان، ويشجع على الشراء. اجعليه قصيراً ومؤثراً.`,
      });
      setDescription(response.text || "");
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!title || !price || !category || images.length === 0) {
      alert("الرجاء إكمال جميع الحقول وإضافة صورة واحدة على الأقل");
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedImageUrls = [];
      for (const image of images) {
        const imageRef = ref(storage, `ads/${user.uid}/${Date.now()}_${image.name}`);
        await uploadBytes(imageRef, image);
        const url = await getDownloadURL(imageRef);
        uploadedImageUrls.push(url);
      }

      const adData = {
        title,
        description,
        category,
        size,
        price: parseFloat(price),
        city,
        images: uploadedImageUrls,
        userId: user.uid,
        userName: userData?.name || user.displayName || "مستخدم لُقطة",
        userPhoto: user.photoURL || "",
        status: 'pending', // Needs admin approval for normal ads
        type: 'normal', // Default
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        views: 0,
        favorites: 0,
      };

      const path = 'ads';
      try {
        await addDoc(collection(db, path), adData);
        navigate('/');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } catch (error) {
      console.error("Submission Error:", error);
      alert("حدث خطأ أثناء نشر الإعلان. الرجاء المحاولة مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-24 p-4 space-y-6 bg-brand-bg min-h-screen" dir="rtl">
      <header className="flex justify-between items-center py-4">
        <h1 className="text-2xl font-serif font-bold text-brand-ink">إضافة إعلان جديد</h1>
        <button onClick={() => navigate(-1)} className="text-brand-ink/40">إلغاء</button>
      </header>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <label className="aspect-square bg-white rounded-2xl flex flex-col items-center justify-center text-brand-ink/30 border-2 border-dashed border-brand-primary/20 hover:border-brand-primary transition-colors cursor-pointer">
            <PlusSquare size={32} />
            <span className="text-[10px] mt-1">أضف صور</span>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
          </label>
          {imageUrls.map((url, i) => (
            <div key={i} className="aspect-square bg-brand-primary/10 rounded-2xl overflow-hidden relative group">
              <img src={url} alt="Dress" className="w-full h-full object-cover" />
              <button 
                onClick={() => {
                  setImages(prev => prev.filter((_, index) => index !== i));
                  setImageUrls(prev => prev.filter((_, index) => index !== i));
                }}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-brand-ink/70">عنوان الإعلان</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً: فستان سهرة حرير" 
              className="w-full p-4 bg-white border border-brand-primary/10 rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-brand-ink/70">التصنيف</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-4 bg-white border border-brand-primary/10 rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none appearance-none"
            >
              <option>فساتين سهرة</option>
              <option>فساتين زفاف</option>
              <option>فساتين خطوبة</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-brand-ink/70">المقاس</label>
              <input 
                type="text" 
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="S, M, L..." 
                className="w-full p-4 bg-white border border-brand-primary/10 rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-brand-ink/70">السعر</label>
              <input 
                type="number" 
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00" 
                className="w-full p-4 bg-white border border-brand-primary/10 rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none" 
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-brand-ink/70">المدينة</label>
            <input 
              type="text" 
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="الرياض، جدة..." 
              className="w-full p-4 bg-white border border-brand-primary/10 rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none" 
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-brand-ink/70">الوصف</label>
              <button 
                onClick={generateDescription}
                disabled={isGenerating || !title}
                className="text-xs text-brand-primary font-bold flex items-center gap-1 hover:opacity-80 disabled:opacity-50"
              >
                <Star size={12} fill="currentColor" />
                {isGenerating ? "جاري التوليد..." : "ساعدني في الوصف (AI)"}
              </button>
            </div>
            <textarea 
              rows={4} 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتبي تفاصيل الفستان..." 
              className="w-full p-4 bg-white border border-brand-primary/10 rounded-2xl focus:ring-2 focus:ring-brand-primary outline-none"
            ></textarea>
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold shadow-lg shadow-brand-primary/20 disabled:opacity-50"
        >
          {isSubmitting ? "جاري النشر..." : "نشر الإعلان"}
        </button>
      </div>
    </div>
  );
};

const SettingsPage = () => (
  <div className="pb-24 bg-brand-bg min-h-screen">
    <Header title="الإعدادات" />
    <div className="p-6 space-y-6" dir="rtl">
      <div className="space-y-4">
        <h2 className="text-[10px] font-bold text-brand-ink/30 uppercase tracking-widest">إعدادات الحساب</h2>
        <div className="bg-white rounded-3xl border border-brand-primary/5 overflow-hidden">
          {[
            { label: "تعديل الملف الشخصي", icon: <User size={18} /> },
            { label: "تغيير كلمة المرور", icon: <ShieldCheck size={18} /> },
            { label: "إعدادات الإشعارات", icon: <Bell size={18} /> },
          ].map((item, i) => (
            <button key={i} className={`w-full flex items-center justify-between p-5 hover:bg-brand-bg transition-colors ${i !== 2 ? 'border-b border-brand-primary/5' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="text-brand-primary">{item.icon}</div>
                <span className="font-bold text-brand-ink/70">{item.label}</span>
              </div>
              <ChevronLeft size={16} className="text-brand-ink/20" />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-[10px] font-bold text-brand-ink/30 uppercase tracking-widest">عام</h2>
        <div className="bg-white rounded-3xl border border-brand-primary/5 overflow-hidden">
          {[
            { label: "اللغة", value: "العربية" },
            { label: "الوضع الليلي", value: "مغلق" },
            { label: "عن لُقطة", value: "الإصدار ١.٠.٠" },
          ].map((item, i) => (
            <div key={i} className={`w-full flex items-center justify-between p-5 ${i !== 2 ? 'border-b border-brand-primary/5' : ''}`}>
              <span className="font-bold text-brand-ink/70">{item.label}</span>
              <span className="text-sm text-brand-primary font-bold">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const FilterPage = () => {
  const navigate = useNavigate();
  return (
    <div className="pb-24 bg-brand-bg min-h-screen">
      <Header title="تصفية النتائج" />
      <div className="p-6 space-y-8" dir="rtl">
        <div className="space-y-4">
          <h2 className="font-serif font-bold text-lg text-brand-ink">السعر</h2>
          <div className="flex gap-4">
            <input type="number" placeholder="من" className="flex-1 p-4 bg-white border border-brand-primary/10 rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary" />
            <input type="number" placeholder="إلى" className="flex-1 p-4 bg-white border border-brand-primary/10 rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary" />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-serif font-bold text-lg text-brand-ink">المقاس</h2>
          <div className="flex flex-wrap gap-2">
            {["XS", "S", "M", "L", "XL", "XXL"].map((size) => (
              <button key={size} className="w-12 h-12 rounded-xl border border-brand-primary/10 flex items-center justify-center font-bold text-brand-ink/60 hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all">
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-serif font-bold text-lg text-brand-ink">المدينة</h2>
          <div className="grid grid-cols-2 gap-2">
            {["الرياض", "جدة", "الدمام", "مكة", "المدينة", "أبها"].map((city) => (
              <button key={city} className="p-3 rounded-xl border border-brand-primary/10 text-sm font-bold text-brand-ink/60 hover:border-brand-primary hover:text-brand-primary transition-all">
                {city}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button onClick={() => navigate(-1)} className="flex-1 py-4 bg-brand-primary text-white rounded-2xl font-bold shadow-lg shadow-brand-primary/20">تطبيق</button>
          <button onClick={() => navigate(-1)} className="flex-1 py-4 bg-white text-brand-ink/40 rounded-2xl font-bold border border-brand-primary/10">إعادة تعيين</button>
        </div>
      </div>
    </div>
  );
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  return (
    <div className="pb-24 bg-brand-bg min-h-screen">
      <Header title="إتمام الشراء" />
      <div className="p-6 space-y-8" dir="rtl">
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-brand-primary/5 space-y-4">
          <h2 className="font-serif font-bold text-lg text-brand-ink">ملخص الطلب</h2>
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-brand-bg">
              <img src="https://picsum.photos/seed/dress1/200/200" alt="Dress" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-bold text-brand-ink">فستان سهرة راقي</h3>
              <p className="text-brand-primary font-bold">2,500 ر.س</p>
            </div>
          </div>
          <div className="pt-4 border-t border-brand-primary/5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-brand-ink/40">سعر الفستان</span>
              <span className="text-brand-ink font-bold">2,500 ر.س</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brand-ink/40">رسوم التوصيل</span>
              <span className="text-brand-ink font-bold">50 ر.س</span>
            </div>
            <div className="flex justify-between text-lg pt-2">
              <span className="font-serif font-bold text-brand-ink">الإجمالي</span>
              <span className="font-bold text-brand-primary">2,550 ر.س</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-serif font-bold text-lg text-brand-ink">طريقة الدفع</h2>
          <div className="space-y-3">
            {[
              { id: 'card', name: 'بطاقة مدى / فيزا', icon: <CreditCard size={20} /> },
              { id: 'apple', name: 'Apple Pay', icon: <div className="font-bold"> Pay</div> },
              { id: 'cash', name: 'الدفع عند الاستلام', icon: <ShoppingBag size={20} /> },
            ].map((method) => (
              <label key={method.id} className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-brand-primary/5 cursor-pointer hover:border-brand-primary transition-all">
                <input type="radio" name="payment" className="w-5 h-5 accent-brand-primary" defaultChecked={method.id === 'card'} />
                <div className="w-10 h-10 bg-brand-bg text-brand-primary rounded-xl flex items-center justify-center">
                  {method.icon}
                </div>
                <span className="font-bold text-brand-ink/70">{method.name}</span>
              </label>
            ))}
          </div>
        </div>

        <button 
          onClick={() => navigate('/success')}
          className="w-full py-5 bg-brand-primary text-white rounded-2xl font-bold shadow-xl shadow-brand-primary/20"
        >
          تأكيد الدفع
        </button>
      </div>
    </div>
  );
};

const SuccessPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-8 text-center space-y-8" dir="rtl">
      <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-green-500/20 animate-bounce">
        <ShieldCheck size={48} />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-serif font-bold text-brand-ink">تم الطلب بنجاح!</h1>
        <p className="text-brand-ink/60">شكراً لكِ على ثقتكِ بـ لُقطة. سيتم التواصل معكِ قريباً لتأكيد موعد التوصيل.</p>
      </div>
      <div className="w-full space-y-4">
        <button 
          onClick={() => navigate('/my-purchases')}
          className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold shadow-lg shadow-brand-primary/20"
        >
          تتبع الطلب
        </button>
        <button 
          onClick={() => navigate('/')}
          className="w-full py-4 bg-white text-brand-primary rounded-2xl font-bold border border-brand-primary/10"
        >
          العودة للرئيسية
        </button>
      </div>
    </div>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const hideNav = ["/product/", "/login", "/register", "/chat/"].some(path => location.pathname.startsWith(path));

  return (
    <div className="max-w-md mx-auto bg-brand-bg min-h-screen relative shadow-2xl overflow-x-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-lg border-t border-brand-primary/10 px-6 py-3 flex justify-between items-center z-50">
          <Link to="/" className={`flex flex-col items-center gap-1 ${location.pathname === '/' ? 'text-brand-primary' : 'text-brand-ink/40'}`}>
            <Home size={24} />
            <span className="text-[10px] font-bold">الرئيسية</span>
          </Link>
          <Link to="/search" className={`flex flex-col items-center gap-1 ${location.pathname === '/search' ? 'text-brand-primary' : 'text-brand-ink/40'}`}>
            <Search size={24} />
            <span className="text-[10px] font-bold">بحث</span>
          </Link>
          <Link to="/add" className="flex flex-col items-center -mt-10">
            <div className="w-14 h-14 bg-brand-primary rounded-full flex items-center justify-center text-white shadow-lg shadow-brand-primary/20 border-4 border-white">
              <PlusSquare size={28} />
            </div>
            <span className="text-[10px] font-bold text-brand-primary mt-1">أضف إعلان</span>
          </Link>
          <Link to="/favorites" className={`flex flex-col items-center gap-1 ${location.pathname === '/favorites' ? 'text-brand-primary' : 'text-brand-ink/40'}`}>
            <Heart size={24} />
            <span className="text-[10px] font-bold">المفضلة</span>
          </Link>
          <Link to="/profile" className={`flex flex-col items-center gap-1 ${location.pathname === '/profile' ? 'text-brand-primary' : 'text-brand-ink/40'}`}>
            <User size={24} />
            <span className="text-[10px] font-bold">حسابي</span>
          </Link>
        </nav>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/add" element={<AddAdPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/my-purchases" element={<MyPurchasesPage />} />
            <Route path="/my-ads" element={<MyAdsPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/points" element={<PointsPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/filter" element={<FilterPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/chat/:id" element={<ChatPage />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}
