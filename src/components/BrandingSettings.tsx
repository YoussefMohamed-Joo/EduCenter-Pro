import { useState, useEffect, useRef } from 'react';
import { Palette, Upload, Image, Type } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BrandingSettings() {
  const [centerName, setCenterName] = useState('إديوسنتر برو');
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [logo, setLogo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [name, color, logoStr] = await Promise.all([
          window.electronAPI.getSetting('center_name'),
          window.electronAPI.getSetting('primary_color'),
          window.electronAPI.getSetting('logo_base64'),
        ]);
        if (name) setCenterName(name);
        if (color) { setPrimaryColor(color); applyColor(color); }
        if (logoStr) setLogo(logoStr);
      } catch {}
    })();
  }, []);

  const applyColor = (color: string) => {
    document.documentElement.style.setProperty('--primary-color', color);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  };

  const handleColorChange = async (color: string) => {
    setPrimaryColor(color);
    applyColor(color);
    await window.electronAPI.setSetting('primary_color', color);
    toast.success('تم تغيير اللون');
  };

  const handleNameChange = async (name: string) => {
    setCenterName(name);
    await window.electronAPI.setSetting('center_name', name);
    document.title = name;
    const titleEl = document.querySelector('.title-bar-name');
    if (titleEl) titleEl.textContent = name;
    toast.success('تم تغيير الاسم');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setLogo(base64);
      await window.electronAPI.setSetting('logo_base64', base64);
      toast.success('تم رفع الشعار');
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = async () => {
    setLogo(null);
    await window.electronAPI.setSetting('logo_base64', '');
    toast.success('تم إزالة الشعار');
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2">
          <Type size={16} className="text-primary-400" /> اسم المركز
        </h2>
        <input
          type="text"
          value={centerName}
          onChange={e => handleNameChange(e.target.value)}
          className="input-field max-w-md"
          placeholder="اسم المركز التعليمي"
        />
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2">
          <Palette size={16} className="text-primary-400" /> اللون الأساسي
        </h2>
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={primaryColor}
            onChange={e => handleColorChange(e.target.value)}
            className="w-12 h-12 rounded-lg cursor-pointer border-2 border-dark-600 bg-transparent"
          />
          <div className="flex gap-2 flex-wrap">
            {['#4f46e5', '#059669', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#e11d48', '#65a30d'].map(color => (
              <button
                key={color}
                onClick={() => handleColorChange(color)}
                className="w-7 h-7 rounded-lg border-2 border-dark-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span className="text-xs text-dark-400 font-mono">{primaryColor}</span>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2">
          <Image size={16} className="text-primary-400" /> شعار المركز
        </h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-xl border-2 border-dashed border-dark-600 flex items-center justify-center overflow-hidden bg-dark-700/30">
            {logo ? (
              <img src={logo} alt="شعار" className="w-full h-full object-contain" />
            ) : (
              <Upload size={24} className="text-dark-500" />
            )}
          </div>
          <div className="space-y-2">
            <button onClick={() => fileRef.current?.click()} className="btn-secondary text-sm">
              <Upload size={14} /> رفع شعار
            </button>
            {logo && (
              <button onClick={removeLogo} className="btn-ghost text-sm text-red-400 block">
                إزالة الشعار
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <p className="text-xs text-dark-500">أبعاد مناسبة: 200×200 بكسل</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-dark-200 mb-4">معاينة</h2>
        <div className="p-6 rounded-xl" style={{ backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}30`, borderWidth: 1 }}>
          <div className="flex items-center gap-4">
            {logo && <img src={logo} alt="" className="w-10 h-10 rounded-lg object-contain" />}
            <div>
              <p className="text-lg font-bold" style={{ color: primaryColor }}>{centerName}</p>
              <p className="text-xs text-dark-400">EduCenter Pro v1.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
