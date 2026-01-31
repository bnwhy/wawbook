import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Cloud, ChevronDown, Menu, X, ChevronRight, ShoppingCart, User, LogOut, Package } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useMenus } from '../context/MenuContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface NavigationProps {
  onStart: () => void;
}

const CloudLogo = () => (
  <div className="relative w-12 h-12 flex items-center justify-center hover:scale-110 transition-transform duration-300">
     <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
        {/* Sun rays */}
        <g className="animate-[spin_10s_linear_infinite] origin-[75px_35px]">
           <path d="M75 10 L75 20 M75 50 L75 60 M55 35 L45 35 M105 35 L95 35 M61 21 L68 28 M82 42 L89 49 M89 21 L82 28 M61 49 L68 42" stroke="#FCD34D" strokeWidth="4" strokeLinecap="round" />
        </g>
        {/* Sun body */}
        <circle cx="75" cy="35" r="18" fill="#FCD34D" />
        
        {/* Fluffy Cloud */}
        <path d="M20 70 C 10 70, 10 50, 30 50 C 30 30, 60 30, 60 50 C 70 40, 90 40, 90 60 C 90 80, 70 80, 60 80 L 30 80 C 10 80, 10 70, 20 70" fill="#60A5FA" stroke="#3B82F6" strokeWidth="2" />
        
        {/* Cute Face */}
        <g transform="translate(0, 2)">
           <circle cx="45" cy="65" r="3" fill="white" />
           <circle cx="65" cy="65" r="3" fill="white" />
           <path d="M50 72 Q 55 78, 60 72" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
           {/* Cheeks */}
           <circle cx="42" cy="70" r="3" fill="#FF9999" opacity="0.6" />
           <circle cx="68" cy="70" r="3" fill="#FF9999" opacity="0.6" />
        </g>
     </svg>
  </div>
);

const Navigation: React.FC<NavigationProps> = ({ onStart }) => {
  const { mainMenu } = useMenus();
  const { itemCount } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMobileItem, setExpandedMobileItem] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getLink = (base: string, item: string) => {
    return `${base}/${encodeURIComponent(item)}`;
  };

  const isHomePage = location === '/';
  const isTransparent = isHomePage && !scrolled;

  return (
    <>
    <nav 
      className={`fixed w-full z-50 transition-all duration-300 py-2 ${
        isTransparent 
          ? 'bg-transparent' 
          : 'bg-white lg:bg-white/90 lg:backdrop-blur-md'
      }`}
    >
      {/* Desktop Navigation */}
      <div className="hidden lg:flex max-w-7xl mx-auto px-6 justify-between items-center">
        
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => {
          setLocation('/');
          window.location.reload(); 
        }}>
          <CloudLogo />
          <span className="text-3xl font-display font-black text-cloud-blue tracking-tight group-hover:text-cloud-deep transition-colors pb-1 lowercase">
            nuagebook
          </span>
        </div>

        {/* Desktop Menu */}
        <div className="flex items-center gap-1">
          {mainMenu.filter(menu => menu.id !== 'help').map((menu, idx) => {
            const hasSubMenu = (menu.items && menu.items.length > 0) || (menu.columns && menu.columns.length > 0);
            
            return hasSubMenu ? (
              <div 
                key={idx}
                className="relative group"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <button className={`px-4 py-2 rounded-full font-bold text-cloud-dark/70 hover:text-cloud-blue hover:bg-cloud-light/50 transition-all flex items-center gap-1 text-lg ${hoveredIndex === idx ? 'text-cloud-blue bg-cloud-light/50' : ''}`}>
                  {menu.label}
                  <ChevronDown size={14} className={`transition-transform duration-300 ${hoveredIndex === idx ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Panel */}
                <div className={`absolute top-full left-1/2 -translate-x-1/2 pt-4 w-max min-w-[200px] transition-all duration-200 origin-top ${hoveredIndex === idx ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}>
                  <div className="bg-white rounded-2xl shadow-cloud border-4 border-cloud-lightest p-2 overflow-hidden">
                  
                  {/* Simple List Type */}
                  {menu.type === 'simple' && menu.items && (
                    <div className="flex flex-col gap-1 p-2">
                      {menu.items.map((item, i) => (
                        <Link key={i} href={getLink(menu.basePath || '', item as string)} className="px-3 py-2 rounded-xl hover:bg-cloud-lightest text-cloud-dark/80 font-bold text-sm hover:text-cloud-blue transition-colors flex items-center gap-2 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-sun flex-shrink-0"></span>
                            {item as string}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Columns Type */}
                  {menu.type === 'columns' && menu.columns && (
                    <div className="flex gap-6 p-4">
                      {menu.columns.map((col, i) => (
                        <div key={i} className="w-48">
                          <h4 className="font-display font-black mb-3 px-2 text-lg text-[#0c4a6e]">{col.title}</h4>
                          <div className="flex flex-col gap-1">
                            {col.items.map((item, j) => (
                              <Link key={j} href={getLink(menu.basePath || '', item)} className="px-2 py-1.5 rounded-lg hover:bg-cloud-lightest text-cloud-dark/80 font-bold text-sm hover:text-cloud-blue transition-colors flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-accent-sun flex-shrink-0"></span>
                                  {item}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Grid Type */}
                  {menu.type === 'grid' && menu.items && (
                    <div className="grid grid-cols-2 gap-2 p-4 w-[400px]">
                      {menu.items.map((item, i) => (
                        <Link key={i} href={getLink(menu.basePath || '', item as string)} className="px-3 py-2 rounded-xl hover:bg-cloud-lightest text-cloud-dark/80 font-bold text-sm hover:text-cloud-blue transition-colors flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-sun"></span>
                            {item as string}
                        </Link>
                      ))}
                    </div>
                  )}

                </div>
              </div>
              </div>
            ) : (
              <Link 
                key={idx}
                href={menu.basePath || '/'}
                className="px-4 py-2 rounded-full font-bold text-cloud-dark/70 hover:text-cloud-blue hover:bg-cloud-light/50 transition-all text-lg"
              >
                {menu.label}
              </Link>
            );
          })}
        </div>

        {/* Desktop User Menu & Cart */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-cloud-lightest transition-colors"
              >
                <div className="w-8 h-8 bg-cloud-blue text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
                <span className="font-bold text-cloud-dark text-sm">{user?.firstName}</span>
                <ChevronDown size={16} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-50">
                  <Link href="/account">
                    <a onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-cloud-lightest transition-colors text-stone-700 hover:text-cloud-blue">
                      <User size={18} />
                      <span className="font-medium">Mon compte</span>
                    </a>
                  </Link>
                  <Link href="/account/orders">
                    <a onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-cloud-lightest transition-colors text-stone-700 hover:text-cloud-blue">
                      <Package size={18} />
                      <span className="font-medium">Mes commandes</span>
                    </a>
                  </Link>
                  <div className="border-t border-stone-200 my-2"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-red-600 hover:text-red-700"
                  >
                    <LogOut size={18} />
                    <span className="font-medium">Déconnexion</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-cloud-dark hover:text-cloud-blue hover:bg-cloud-lightest transition-all">
              <User size={20} />
              Connexion
            </Link>
          )}

          <Link href="/cart" className="flex px-5 py-2.5 bg-gradient-to-r from-accent-sun to-yellow-400 text-yellow-900 rounded-full font-display font-black text-base hover:scale-105 hover:shadow-lg transition-all shadow-md items-center gap-2">
               <ShoppingCart size={20} />
               <span>Panier</span>
               {itemCount > 0 && (
                <span className="w-5 h-5 bg-white text-yellow-900 text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                  {itemCount}
                </span>
               )}
          </Link>
        </div>
      </div>

      {/* Mobile Navigation - Menu left, Logo center, User & Cart right */}
      <div className="lg:hidden flex items-center justify-between px-4">
        {/* Left: Menu Button */}
        <button 
          className="p-2 text-cloud-dark hover:bg-cloud-lightest rounded-full transition-colors"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu size={28} />
        </button>

        {/* Center: Logo */}
        <div className="flex items-center gap-2 cursor-pointer group absolute left-1/2 -translate-x-1/2" onClick={() => {
          setLocation('/');
          window.location.reload(); 
        }}>
          <CloudLogo />
          <span className="text-2xl font-display font-black text-cloud-blue tracking-tight group-hover:text-cloud-deep transition-colors pb-1 lowercase">
            nuagebook
          </span>
        </div>

        {/* Right: User & Cart Icons */}
        <div className="flex items-center gap-1">
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="p-2 text-cloud-dark hover:bg-cloud-lightest rounded-full transition-colors"
              >
                <div className="w-7 h-7 bg-cloud-blue text-white rounded-full flex items-center justify-center font-bold text-xs">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-50">
                    <Link href="/account">
                      <a onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-cloud-lightest transition-colors text-stone-700 hover:text-cloud-blue">
                        <User size={18} />
                        <span className="font-medium">Mon compte</span>
                      </a>
                    </Link>
                    <Link href="/account/orders">
                      <a onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-cloud-lightest transition-colors text-stone-700 hover:text-cloud-blue">
                        <Package size={18} />
                        <span className="font-medium">Mes commandes</span>
                      </a>
                    </Link>
                    <div className="border-t border-stone-200 my-2"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-red-600 hover:text-red-700"
                    >
                      <LogOut size={18} />
                      <span className="font-medium">Déconnexion</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/login" className="p-2 text-cloud-dark hover:bg-cloud-lightest rounded-full transition-colors">
              <User size={24} />
            </Link>
          )}

          <Link href="/cart" className="relative p-2 text-cloud-dark hover:bg-cloud-lightest rounded-full transition-colors">
               <ShoppingCart size={24} />
               {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-sun text-yellow-900 text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                  {itemCount}
                </span>
               )}
          </Link>
        </div>
      </div>
      </nav>

      {/* --- MOBILE MENU OVERLAY (Portal to body) --- */}
      {createPortal(
        <>
          <div className={`fixed inset-0 bg-cloud-dark/20 backdrop-blur-sm z-[9998] transition-opacity duration-300 lg:hidden ${mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} onClick={() => setMobileMenuOpen(false)} />
          <div className={`fixed top-0 left-0 w-[300px] h-full bg-white shadow-2xl z-[9999] transform transition-transform duration-300 lg:hidden flex flex-col overflow-y-auto ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-6 flex justify-between items-center border-b border-cloud-light">
              <span className="font-display font-black text-2xl text-cloud-blue">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-red-50 text-cloud-dark/50 hover:text-red-400 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-2">
               {mainMenu.filter(menu => menu.id !== 'help').map((menu, idx) => {
                 const hasSubMenu = (menu.items && menu.items.length > 0) || (menu.columns && menu.columns.length > 0);
                 
                 return hasSubMenu ? (
                   <div key={idx} className="border-b border-cloud-lightest last:border-0 pb-2 mb-2">
                     <button 
                       onClick={() => setExpandedMobileItem(expandedMobileItem === idx ? null : idx)}
                       className="w-full flex items-center justify-between py-3 px-2 font-bold text-cloud-dark text-lg"
                     >
                       {menu.label}
                       <ChevronDown size={20} className={`transition-transform ${expandedMobileItem === idx ? 'rotate-180 text-cloud-blue' : 'text-gray-300'}`} />
                     </button>
                     
                     {/* Mobile Submenu */}
                     <div className={`overflow-hidden transition-all duration-300 ${expandedMobileItem === idx ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                       <div className="bg-cloud-lightest/50 rounded-xl p-3 flex flex-col gap-2 mb-2">
                        {menu.type === 'simple' && menu.items && menu.items.map((item, i) => (
                          <Link key={i} href={getLink(menu.basePath || '', item as string)} onClick={() => setMobileMenuOpen(false)} className="text-cloud-dark/70 font-medium px-2 py-1 hover:text-cloud-blue block">
                            {item as string}
                          </Link>
                        ))}

                        {menu.type === 'grid' && menu.items && menu.items.map((item, i) => (
                          <Link key={i} href={getLink(menu.basePath || '', item as string)} onClick={() => setMobileMenuOpen(false)} className="text-cloud-dark/70 font-medium px-2 py-1 hover:text-cloud-blue block">
                            {item as string}
                          </Link>
                        ))}

                        {menu.type === 'columns' && menu.columns && menu.columns.map((col, i) => (
                          <div key={i} className="mb-2">
                            <h5 className="text-xs font-black text-cloud-blue uppercase tracking-wider mb-1 px-2">{col.title}</h5>
                            {col.items.map((item, j) => (
                              <Link key={j} href={getLink(menu.basePath || '', item)} onClick={() => setMobileMenuOpen(false)} className="text-cloud-dark/70 font-medium px-2 py-1 hover:text-cloud-blue block text-sm">
                                {item}
                              </Link>
                            ))}
                          </div>
                        ))}
                       </div>
                     </div>
                   </div>
                 ) : (
                   <Link
                     key={idx}
                     href={menu.basePath || '/'}
                     onClick={() => setMobileMenuOpen(false)}
                     className="w-full py-3 px-2 font-bold text-cloud-dark text-lg hover:text-cloud-blue border-b border-cloud-lightest last:border-0"
                   >
                     {menu.label}
                   </Link>
                 );
               })}
            </div>

            <div className="mt-auto p-6 border-t border-cloud-light">
              <button 
                onClick={() => { onStart(); setMobileMenuOpen(false); }}
                className="w-full py-4 bg-accent-sun text-yellow-900 rounded-2xl font-display font-black text-xl shadow-md flex items-center justify-center gap-2"
              >
                <Sparkles size={20} />
                Créer mon livre
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default Navigation;
