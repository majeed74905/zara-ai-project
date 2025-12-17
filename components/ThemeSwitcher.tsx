
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {availableThemes.map((theme) => {
        const isActive = currentThemeName === theme.name;
        
        return (
          <button
            key={theme.name}
            onClick={() => handleSelect(theme.name)}
            className={`relative flex flex-col gap-2 p-3 rounded-xl border-2 transition-all text-left group overflow-hidden ${
              isActive 
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-md scale-[1.02]' 
                : 'border-transparent bg-surfaceHighlight hover:border-border hover:bg-surfaceHighlight/80'
            }`}
          >
            {/* Theme Preview Box */}
            <div className="w-full aspect-[16/9] rounded-lg shadow-sm overflow-hidden border border-border/50 relative">
               {/* Split view for preview colors */}
               <div className="absolute inset-0 flex">
                  <div className="w-1/2 h-full" style={{ backgroundColor: theme.colors.background }}></div>
                  <div className="w-1/2 h-full" style={{ backgroundColor: theme.colors.surface }}></div>
               </div>
               
               {/* UI Elements simulation */}
               <div className="absolute top-2 left-2 right-2 h-1.5 rounded-full opacity-30" style={{ backgroundColor: theme.colors.textMain }}></div>
               <div className="absolute top-5 left-2 w-6 h-6 rounded-md shadow-sm" style={{ backgroundColor: theme.colors.primary }}></div>
               <div className="absolute top-5 right-2 w-12 h-6 rounded-md border opacity-50" style={{ borderColor: theme.colors.border }}></div>
               
               {/* Active Check Overlay */}
               {isActive && (
                  <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] flex items-center justify-center">
                     <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-lg">
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                     </div>
                  </div>
               )}
            </div>

            <div className="flex-1 min-w-0 px-1">
              <div className="flex items-center justify-between">
                 <h4 className={`text-xs font-bold truncate ${isActive ? 'text-primary' : 'text-text'}`}>
                   {theme.label}
                 </h4>
              </div>
              <p className="text-[10px] text-text-sub truncate opacity-80">
                {theme.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
