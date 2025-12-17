
import React from 'react';
import { useTheme } from '../theme/ThemeContext';
import { Check } from 'lucide-react';

interface ThemeSwitcherProps {
  onThemeSelect?: (themeName: string) => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ onThemeSelect }) => {
  const { currentThemeName, setTheme, availableThemes } = useTheme();

  const handleSelect = (name: any) => {
    setTheme(name);
    if (onThemeSelect) {
      onThemeSelect(name);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {availableThemes.map((theme) => {
        const isActive = currentThemeName === theme.name;
        
        return (
          <button
            key={theme.name}
            onClick={() => handleSelect(theme.name)}
            className={`relative flex items-center gap-6 p-6 rounded-[28px] border-2 transition-all text-left group overflow-hidden ${
              isActive 
                ? 'border-primary bg-primary/10 ring-[8px] ring-primary/5 shadow-2xl shadow-primary/20 scale-[1.01]' 
                : 'border-white/5 bg-[#09090b] hover:border-white/10 hover:bg-[#0e0e11]'
            }`}
          >
            {/* Theme Visual Preview Box */}
            <div className="flex-shrink-0 w-24 h-16 rounded-[14px] shadow-2xl overflow-hidden border border-white/10 relative">
               <div className="absolute inset-0 flex flex-col">
                  <div className="flex-1" style={{ backgroundColor: theme.colors.background }}></div>
                  <div className="h-[40%] flex">
                     <div className="flex-1" style={{ backgroundColor: theme.colors.surface }}></div>
                     <div className="w-[35%]" style={{ backgroundColor: theme.colors.primary }}></div>
                  </div>
               </div>
               
               {/* Tiny UI elements mockup */}
               <div className="absolute top-2 left-2 flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.colors.primary }}></div>
                  <div className="w-1.5 h-1.5 rounded-full opacity-20" style={{ backgroundColor: theme.colors.textMain }}></div>
               </div>
               
               {isActive && (
                  <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px] flex items-center justify-center">
                     <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-lg ring-4 ring-primary/20 animate-fade-in">
                        <Check className="w-4 h-4 stroke-[3.5px]" />
                     </div>
                  </div>
               )}
            </div>

            <div className="flex-1 min-w-0 pr-2">
              <h4 className={`text-[15px] font-black truncate tracking-tight mb-0.5 ${isActive ? 'text-white' : 'text-gray-200'}`}>
                {theme.label}
              </h4>
              <p className="text-[10px] font-bold text-gray-500 leading-snug line-clamp-2">
                {theme.description}
              </p>
            </div>
            
            {/* Ambient Background Glow on active/hover */}
            <div className={`absolute right-0 bottom-0 p-12 opacity-0 group-hover:opacity-[0.05] transition-opacity pointer-events-none ${isActive ? 'opacity-[0.08]' : ''}`}>
               <div className="w-24 h-24 rounded-full blur-[40px]" style={{ backgroundColor: theme.colors.primary }} />
            </div>
          </button>
        );
      })}
    </div>
  );
};
