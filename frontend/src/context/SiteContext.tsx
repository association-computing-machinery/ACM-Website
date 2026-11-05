import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';

interface SiteSettings {
  societyName: string;
  location: string;
  logoUrl: string;
}

interface SiteContextValue {
  settings: SiteSettings;
  update: (s: Partial<SiteSettings>) => void;
}

const defaults: SiteSettings = {
  societyName: 'ACM ITU',
  location: 'Information Technology University, Lahore',
  logoUrl: 'https://ik.imagekit.io/acmitu/Others/ACM_logo_t6VesqNX4.png',
};

const SiteContext = createContext<SiteContextValue>({
  settings: defaults,
  update: () => undefined,
});

export function SiteProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaults);

  useEffect(() => {
    let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement('link');
      icon.rel = 'icon';
      document.head.appendChild(icon);
    }
    icon.type = 'image/png';
    icon.href = settings.logoUrl;
  }, [settings.logoUrl]);

  useEffect(() => {
    api<SiteSettings>('/settings')
      .then(s => setSettings(s))
      .catch(() => {/* keep defaults on failure */});
  }, []);

  const update = (partial: Partial<SiteSettings>) =>
    setSettings(prev => ({ ...prev, ...partial }));

  return (
    <SiteContext.Provider value={{ settings, update }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  return useContext(SiteContext);
}
