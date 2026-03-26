import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="BrightHouse" className="h-12 w-auto object-contain dark:brightness-0 dark:invert" />
        </Link>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary text-sm font-medium transition-colors" to="/proyectos">Proyectos</Link>
          <Link className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary text-sm font-medium transition-colors" to="/soluciones">Soluciones</Link>
          <Link className="text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary text-sm font-medium transition-colors" to="/nosotros">Nosotros</Link>
        </div>
        
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <Link className="text-slate-900 dark:text-white font-medium text-sm hover:text-primary" to="/login">Iniciar Sesión</Link>
          <a href="/#demo" className="bg-primary hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-primary/20">
            Solicitar Demo
          </a>
        </div>

        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          {/* Mobile Menu Button */}
          <button 
            className="text-deep-blue dark:text-white p-2 focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="material-symbols-outlined text-3xl">
              {isMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xl p-6 flex flex-col gap-4 animate-in slide-in-from-top-5 z-40">
          <Link 
            className="text-slate-600 dark:text-slate-300 hover:text-primary text-lg font-medium transition-colors py-2 border-b border-slate-100 dark:border-slate-800" 
            to="/proyectos"
            onClick={() => setIsMenuOpen(false)}
          >
            Proyectos
          </Link>
          <Link 
            className="text-slate-600 dark:text-slate-300 hover:text-primary text-lg font-medium transition-colors py-2 border-b border-slate-100 dark:border-slate-800" 
            to="/soluciones"
            onClick={() => setIsMenuOpen(false)}
          >
            Soluciones
          </Link>
          <Link 
            className="text-slate-600 dark:text-slate-300 hover:text-primary text-lg font-medium transition-colors py-2 border-b border-slate-100 dark:border-slate-800" 
            to="/nosotros"
            onClick={() => setIsMenuOpen(false)}
          >
            Nosotros
          </Link>
          <Link 
            className="text-slate-600 dark:text-slate-300 hover:text-primary text-lg font-medium transition-colors py-2 border-b border-slate-100 dark:border-slate-800" 
            to="/login"
            onClick={() => setIsMenuOpen(false)}
          >
            Iniciar Sesión
          </Link>
          <a href="/#demo" onClick={() => setIsMenuOpen(false)} className="bg-primary hover:bg-blue-700 text-white text-lg font-bold px-5 py-3.5 rounded-lg transition-all shadow-lg shadow-primary/20 w-full mt-2 block text-center">
            Solicitar Demo
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
