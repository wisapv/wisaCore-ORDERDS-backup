import { useEffect, useState } from 'react';
import { HEALTH_URL } from '../constants/minmaxConstants';

export function useMinmaxHealth() {
  const [health, setHealth] = useState({ status: 'loading', message: 'Checking backend connection...', moduleName: 'minmax3month' });
  useEffect(() => {
    let isMounted = true;
    fetch(HEALTH_URL)
      .then((response) => response.json().then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (!isMounted) return;
        setHealth(ok && result.success
          ? { status: 'connected', message: 'Backend connection is healthy.', moduleName: result.module || 'minmax3month' }
          : { status: 'error', message: 'Backend responded, but the health check was not successful.', moduleName: 'minmax3month' });
      })
      .catch(() => isMounted && setHealth({ status: 'error', message: 'Unable to connect to backend at localhost:3000.', moduleName: 'minmax3month' }));
    return () => { isMounted = false; };
  }, []);
  return health;
}
