
import React, { useState, useEffect } from 'react';
import { Navbar, Footer, WhatsAppFloatingButton } from './components/Layout';
import { SeoHead } from './components/SeoHead';
import { Home } from './pages/Home';
import { Shop, ProductDetail } from './pages/Shop';
import { AdminDashboard } from './pages/Admin';
import { Product, BlogPost, PageView, PageContent, SiteConfig } from './types';
import { 
  getProducts, getBlogs, getPages, getSiteConfig,
  saveProduct, deleteProduct, saveBlog, deleteBlog, savePage, deletePage, saveSiteConfig, supabase
} from './services/store';
import { checkIsAuthenticated, login, logout } from './services/authService';
import { Lock, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

const DynamicPageDisplay: React.FC<{page: PageContent}> = ({page}) => (
  <div className="max-w-4xl mx-auto px-4 py-16 min-h-[60vh] animate-fade-in">
    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-8">{page.title}</h1>
    <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
      {page.content}
    </div>
  </div>
);

const hexToRgb = (hex: string) => {
  if (!hex || typeof hex !== 'string') return { r: 37, g: 99, b: 235 };
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 37, g: 99, b: 235 };
};

const mix = (c1: {r:number, g:number, b:number}, c2: {r:number, g:number, b:number}, weight: number) => {
  return {
    r: Math.round(c1.r * (1 - weight) + c2.r * weight),
    g: Math.round(c1.g * (1 - weight) + c2.g * weight),
    b: Math.round(c1.b * (1 - weight) + c2.b * weight)
  };
};

const applyTheme = (hexColor: string) => {
  const base = hexToRgb(hexColor);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  const palette = {
    50: mix(base, white, 0.95), 100: mix(base, white, 0.9), 200: mix(base, white, 0.75),
    300: mix(base, white, 0.6), 400: mix(base, white, 0.3), 500: mix(base, white, 0.1), 
    600: base, 700: mix(base, black, 0.1), 800: mix(base, black, 0.25), 900: mix(base, black, 0.4), 950: mix(base, black, 0.6),
  };
  const root = document.documentElement;
  Object.entries(palette).forEach(([key, value]) => root.style.setProperty(`--brand-${key}`, `${value.r} ${value.g} ${value.b}`));
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<PageView>(PageView.HOME);
  
  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [pages, setPages] = useState<PageContent[]>([]);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  
  // Selection
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
  const [selectedPage, setSelectedPage] = useState<PageContent | null>(null);
  
  // UI
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Initial Load
  const fetchData = async () => {
    setLoading(true);
    const [c, p, b, pg] = await Promise.all([
      getSiteConfig(),
      getProducts(),
      getBlogs(),
      getPages()
    ]);
    setConfig(c);
    setProducts(p);
    setBlogs(b);
    setPages(pg);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Check URL for admin login
    const params = new URLSearchParams(window.location.search);
    if (params.get('page') === 'admin') {
      setView(PageView.ADMIN_LOGIN);
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (config && config.themeColor) applyTheme(config.themeColor);
  }, [config]);

  // Wrapper Functions for Admin Dashboard to handle Async Saves
  const handleUpdateProducts = async (newProducts: Product[]) => {
    // We only trigger re-fetch or optimistic update here. 
    // Since the Admin component passes the FULL array, we need to find diffs or simpler:
    // Actually, Admin Dashboard in previous code passed full array to setProducts. 
    // To adapt to Supabase without rewriting Admin.tsx entirely, we will refresh data.
    await fetchData();
  };

  // But wait, Admin.tsx expects synchronous setProducts. 
  // We need to intercept the "Save" actions inside Admin.
  // Since we can't easily change Admin's internal logic without rewriting it, 
  // we will pass a "Wrapped" setter that handles the DB call.
  
  // Actually, better approach: Modify AdminDashboard to accept "onSaveProduct", "onDeleteProduct" etc.
  // BUT the user asked to minimize changes.
  // WORKAROUND: We will pass a function that Updates Local State AND Calls DB.
  
  const handleProductChangeWrapper = async (updatedList: Product[]) => {
    // This is tricky. The Admin component manages state locally. 
    // Ideally we rewrite Admin.tsx to use onSave/onDelete.
    // Let's assume for this "Deployment" phase, we keep it simple:
    // The Admin.tsx calls setProducts. We need to catch *what changed*.
    // Since that's hard, we will modify Admin.tsx slightly in the next step or
    // we just use the API directly in Admin.tsx? No, separation of concerns.
    
    // For now, let's just update local state. The Real DB implementation requires Admin.tsx refactor.
    // SEE BELOW FOR ADMIN REFACTOR IN XML.
    setProducts(updatedList);
  };

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = login(loginPassword);
    if (result.success) {
      setLoginPassword('');
      setLoginError('');
      setView(PageView.ADMIN_DASHBOARD);
    } else {
      setLoginError(result.error || 'Login gagal');
    }
  };

  if (loading || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-950">
        <div className="text-center">
           <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-4" />
           <p className="text-slate-600 dark:text-slate-400">Memuat Toko...</p>
        </div>
      </div>
    );
  }

  // Define Handlers for Admin
  const onSaveProduct = async (p: Product) => { await saveProduct(p); fetchData(); };
  const onDeleteProduct = async (id: string) => { await deleteProduct(id); fetchData(); };
  const onSaveBlog = async (b: BlogPost) => { await saveBlog(b); fetchData(); };
  const onDeleteBlog = async (id: string) => { await deleteBlog(id); fetchData(); };
  const onSavePage = async (p: PageContent) => { await savePage(p); fetchData(); };
  const onDeletePage = async (id: string) => { await deletePage(id); fetchData(); };
  const onSaveConfig = async (c: SiteConfig) => { await saveSiteConfig(c); fetchData(); };

  const renderContent = () => {
    switch (view) {
      case PageView.ADMIN_LOGIN:
        return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-950 px-4 animate-fade-in">
            <SeoHead title="Admin Login" description="Restricted Area" config={config} />
            <div className="bg-white dark:bg-dark-900 p-8 rounded-2xl shadow-xl max-w-sm w-full border border-slate-200 dark:border-dark-800">
              <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="text-brand-600 dark:text-brand-400" size={32} />
                 </div>
                 <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Login</h2>
              </div>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-dark-950 border border-slate-300 dark:border-dark-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-brand-500 outline-none" placeholder="Masukkan Password..." />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                </div>
                {loginError && <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-500/10 p-3 rounded-lg"><AlertCircle size={16} /> {loginError}</div>}
                <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-500/30">Masuk Sistem</button>
              </form>
              <button onClick={() => setView(PageView.HOME)} className="w-full mt-6 text-slate-500 text-sm">← Kembali ke Website</button>
            </div>
          </div>
        );
      
      case PageView.ADMIN_DASHBOARD:
        if (!checkIsAuthenticated()) { setView(PageView.ADMIN_LOGIN); return null; }
        return (
          <>
             <SeoHead title="Dashboard" description="Admin Control Panel" config={config} />
             <AdminDashboard 
                products={products} 
                blogs={blogs} 
                pages={pages}
                config={config} 
                onLogout={() => { logout(); setView(PageView.HOME); }}
                // Pass async handlers
                onSaveProduct={onSaveProduct} onDeleteProduct={onDeleteProduct}
                onSaveBlog={onSaveBlog} onDeleteBlog={onDeleteBlog}
                onSavePage={onSavePage} onDeletePage={onDeletePage}
                onSaveConfig={onSaveConfig}
              />
          </>
        );

      case PageView.PRODUCT_DETAIL:
        return selectedProduct ? (
          <>
            <SeoHead title={selectedProduct.name} description={selectedProduct.description} image={selectedProduct.image} type="product" config={config} />
            <ProductDetail product={selectedProduct} onBack={() => setView(PageView.SHOP)} config={config} />
          </>
        ) : <Shop products={products} selectProduct={(p) => {setSelectedProduct(p); setView(PageView.PRODUCT_DETAIL); window.scrollTo(0,0);}} />;

      case PageView.SHOP:
        return (
          <>
            <SeoHead title="Katalog Produk" description="Jual Audio Mobil Berkualitas" config={config} />
            <Shop products={products} selectProduct={(p) => {setSelectedProduct(p); setView(PageView.PRODUCT_DETAIL); window.scrollTo(0,0);}} />
          </>
        );
        
      case PageView.BLOG_DETAIL:
         return selectedBlog ? (
           <div className="animate-fade-in">
             <SeoHead title={selectedBlog.title} description={selectedBlog.excerpt} image={selectedBlog.image} type="article" config={config} />
             <div className="max-w-4xl mx-auto px-4 py-16 min-h-[60vh]">
               <button onClick={() => setView(PageView.BLOG)} className="text-brand-600 hover:underline mb-6 flex items-center gap-2">← Kembali ke Blog</button>
               <div className="rounded-2xl overflow-hidden mb-8 h-64 md:h-96 w-full shadow-lg"><img src={selectedBlog.image} alt={selectedBlog.title} className="w-full h-full object-cover" /></div>
               <h1 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-8 leading-tight">{selectedBlog.title}</h1>
               <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 text-lg leading-relaxed whitespace-pre-line">{selectedBlog.content}</div>
             </div>
           </div>
         ) : <div />;

      case PageView.BLOG:
        return (
          <div className="max-w-7xl mx-auto px-4 py-12 min-h-screen animate-fade-in">
             <SeoHead title="Artikel" description="Tips Audio Mobil" config={config} />
             <div className="mb-12"><h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Artikel</h1></div>
             <div className="grid md:grid-cols-3 gap-8">
              {blogs.map(blog => (
                <div key={blog.id} className="group cursor-pointer bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-dark-800 overflow-hidden hover:shadow-xl transition-all" onClick={() => {setSelectedBlog(blog); setView(PageView.BLOG_DETAIL); window.scrollTo(0,0);}}>
                  <div className="h-52 overflow-hidden relative"><img src={blog.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /></div>
                  <div className="p-6"><h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-brand-600 transition-colors">{blog.title}</h3><p className="text-slate-600 text-sm line-clamp-3">{blog.excerpt}</p></div>
                </div>
              ))}
            </div>
          </div>
        );

      case PageView.DYNAMIC_PAGE:
        return selectedPage ? <><SeoHead title={selectedPage.title} description={selectedPage.title} config={config} /><DynamicPageDisplay page={selectedPage} /></> : null;

      default:
        return (
          <>
            <SeoHead title="Home" description={config.shopName} config={config} />
            <Home products={products} blogs={blogs} setView={setView} selectProduct={(p) => {setSelectedProduct(p); setView(PageView.PRODUCT_DETAIL); window.scrollTo(0,0);}} selectBlog={(b) => {setSelectedBlog(b); setView(PageView.BLOG_DETAIL); window.scrollTo(0,0);}} config={config} />
          </>
        );
    }
  };

  if (view === PageView.ADMIN_DASHBOARD || view === PageView.ADMIN_LOGIN) return renderContent();

  return (
    <div className="min-h-screen bg-white dark:bg-dark-950 transition-colors duration-300 selection:bg-brand-500 selection:text-white font-sans">
      <Navbar setView={setView} currentView={view} config={config} pages={pages} onPageClick={(p) => {setSelectedPage(p); setView(PageView.DYNAMIC_PAGE); window.scrollTo(0,0);}} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      <main className="pt-0">{renderContent()}</main>
      <Footer setView={setView} config={config} pages={pages} onPageClick={(p) => {setSelectedPage(p); setView(PageView.DYNAMIC_PAGE); window.scrollTo(0,0);}} />
      <WhatsAppFloatingButton config={config} />
    </div>
  );
};

export default App;
