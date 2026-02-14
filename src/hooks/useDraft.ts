import { useState, useEffect, useCallback } from 'react';

const DRAFT_PREFIX = 'anef_draft_';

interface UseDraftOptions<T> {
  key: string;
  initialValue: T;
  debounceMs?: number;
}

export function useDraft<T>({ key, initialValue, debounceMs = 1000 }: UseDraftOptions<T>) {
  const storageKey = `${DRAFT_PREFIX}${key}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...initialValue, ...parsed };
      }
    } catch {
      // Ignore parsing errors
    }
    return initialValue;
  });

  const [hasDraft, setHasDraft] = useState(() => {
    return localStorage.getItem(storageKey) !== null;
  });

  // Debounced save to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
        setHasDraft(true);
      } catch {
        // Handle storage errors silently
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [value, storageKey, debounceMs]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setHasDraft(false);
  }, [storageKey]);

  const resetToInitial = useCallback(() => {
    setValue(initialValue);
    clearDraft();
  }, [initialValue, clearDraft]);

  return {
    value,
    setValue,
    hasDraft,
    clearDraft,
    resetToInitial,
  };
}
