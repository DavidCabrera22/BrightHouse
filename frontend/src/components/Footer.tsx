import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-deep-blue text-white pt-20 pb-10 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <img src="/logo.png" alt="BrightHouse" className="h-12 w-auto object-contain brightness-0 invert" />
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-6">
              La plataforma líder en tecnología inmobiliaria que conecta desarrolladores con compradores reales a través de inteligencia artificial.
            </p>
            <div className="flex gap-4">
              <a className="w-10 h-10 rounded-full bg-white/5 hover:bg-primary transition-colors flex items-center justify-center text-white" href="#">
                <span className="text-xs font-bold">IN</span>
              </a>
              <a className="w-10 h-10 rounded-full bg-white/5 hover:bg-primary transition-colors flex items-center justify-center text-white" href="#">
                <span className="text-xs font-bold">TW</span>
              </a>
              <a className="w-10 h-10 rounded-full bg-white/5 hover:bg-primary transition-colors flex items-center justify-center text-white" href="#">
                <span className="text-xs font-bold">FB</span>
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-white mb-6">Plataforma</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><a className="hover:text-primary transition-colors" href="#">Proyectos</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Soluciones</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Precios</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Casos de Éxito</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-6">Compañía</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><a className="hover:text-primary transition-colors" href="#">Nosotros</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Carreras</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Blog</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Contacto</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><a className="hover:text-primary transition-colors" href="#">Privacidad</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Términos</a></li>
              <li><a className="hover:text-primary transition-colors" href="#">Cookies</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">© 2024 BrightHouse PropTech. Todos los derechos reservados.</p>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Sistemas operativos
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
