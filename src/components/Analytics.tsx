// src/components/Analytics.tsx
'use client';

import { useEffect } from 'react';

export function Analytics() {
  useEffect(() => {
    // Vercel Analytics
    if (process.env.NODE_ENV === 'production') {
      import('@vercel/analytics').then(({ track }) => {
        track('page_view');
      });
    }
  }, []);

  return null;
}