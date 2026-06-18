import { useState, useEffect } from 'react';
import { Minus, Square, X, Search, Command } from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    window.electronAPI.isMaximized().then(setIsMaximized);
  }, []);

  const handleMaximize = async () => {
    const maximized = await window.electronAPI.maximize();
    setIsMaximized(maximized);
  };

  const openPalette = () => {
    const event = new CustomEvent('open-command-palette');
    window.dispatchEvent(event);
  };

  return (
    <div dir="ltr" className="flex items-center justify-between h-11 bg-dark-800 border-b border-dark-700 select-none draggable px-3">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-primary-500 to-primary-700" />
        <span className="text-sm font-semibold text-dark-200">إديوسنتر برو</span>
      </div>

      <div className="flex-1 max-w-md mx-4 no-drag">
        <button
          onClick={openPalette}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-700/50 border border-dark-600 text-dark-400 text-xs hover:bg-dark-700 transition-all"
        >
          <Search size={13} />
          <span className="flex-1 text-right">بحث سريع...</span>
          <kbd className="text-[9px] px-1 py-0.5 rounded bg-dark-600 flex items-center gap-0.5">
            <Command size={9} />K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1 no-drag">
        <NotificationBell />
        <button onClick={() => window.electronAPI.minimize()} className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors">
          <Minus size={14} />
        </button>
        <button onClick={handleMaximize} className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors">
          <Square size={14} />
        </button>
        <button onClick={() => window.electronAPI.close()} className="p-1.5 rounded-lg hover:bg-red-500/20 text-dark-400 hover:text-red-400 transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
