import { useEffect } from 'react';
import { api } from '../services/api';

export function useRenderKeepAwake() {
  useEffect(() => {
    // Ping every 10 minutes (600,000 ms) to keep Render free tier alive
    // Render sleeps after 15 mins of inactivity.
    const interval = setInterval(() => {
      // Assuming you have a basic endpoint, or we just hit a safe auth endpoint
      api.get('/auth/me').catch(() => {
        // We silently ignore 401s or errors here. The goal is just network traffic to the domain.
      });
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
}