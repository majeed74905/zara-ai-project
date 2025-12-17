
import { ThemeName } from '../theme/types';
import { ViewMode } from '../types';

export const APP_VERSION = "Zara AI v3.0 Pro";

export const MODE_THEME_MAPPING: Partial<Record<ViewMode, ThemeName>> = {
  live: 'aurora',
  code: 'midnight', // or solarizedDark
  student: 'pastel',
  exam: 'light', // cleaner for reading
  voice: 'glass',
  workspace: 'royal',
  chat: 'dark', // Updated to dark as per user request
  planner: 'light',
  analytics: 'midnight',
  dashboard: 'light',
  memory: 'glass',
  builder: 'midnight'
};

export const DEFAULT_SYSTEM_CONFIG = {
  autoTheme: true,
  enableAnimations: true,
  density: 'comfortable' as 'comfortable' | 'compact',
  soundEffects: true
};