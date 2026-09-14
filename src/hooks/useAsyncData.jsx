import { useCallback, useEffect, useState } from 'react';

export default function useAsyncData(loader, deps = [], options = {}) {
  const { immediate = true, initialData = null } = options;
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextData = await loader();
      setData(nextData);
      return nextData;
    } catch (loadError) {
      setError(loadError);
      throw loadError;
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!immediate) return undefined;

    let ignore = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const nextData = await loader();
        if (!ignore) setData(nextData);
      } catch (loadError) {
        if (!ignore) setError(loadError);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    load();

    return () => {
      ignore = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    data,
    setData,
    isLoading,
    error,
    reload,
  };
}
