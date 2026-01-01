import { useMemo } from 'react';

export type SiteMode = 'public' | 'admin';

export function useSubdomain(): SiteMode {
  return useMemo(() => {
    const hostname = window.location.hostname;
    
    if (hostname.startsWith('admin.') || hostname.startsWith('admin-')) {
      return 'admin';
    }
    
    if (window.location.pathname.startsWith('/admin')) {
      return 'admin';
    }
    
    return 'public';
  }, []);
}
