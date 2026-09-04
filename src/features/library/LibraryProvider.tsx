import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {LibraryResponse} from '../../../shared/contracts';
import {ApiError} from '../../api/http';
import {fetchLibrary} from '../../api/library-api';

export type LibraryStatus = 'loading' | 'ready' | 'empty' | 'unavailable' | 'error';

export type LibraryContextValue = {
  library: LibraryResponse | null;
  status: LibraryStatus;
  error: Error | null;
  refresh: () => void;
};

type LibraryState = Pick<LibraryContextValue, 'library' | 'status' | 'error'>;

const initialState: LibraryState = {
  library: null,
  status: 'loading',
  error: null,
};

export const LibraryContext = createContext<LibraryContextValue | null>(null);

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

function asError(error: unknown) {
  return error instanceof Error ? error : new Error('曲库加载失败');
}

export function LibraryProvider({children}: {children: ReactNode}) {
  const [state, setState] = useState<LibraryState>(initialState);
  const requestTokenRef = useRef(0);
  const activeControllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    const requestToken = ++requestTokenRef.current;
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    setState(initialState);

    void fetchLibrary(controller.signal).then(
      (library) => {
        if (requestToken !== requestTokenRef.current) {
          return;
        }

        activeControllerRef.current = null;
        setState({
          library,
          status: library.songs.length === 0 ? 'empty' : 'ready',
          error: null,
        });
      },
      (reason: unknown) => {
        if (requestToken !== requestTokenRef.current || isAbortError(reason)) {
          return;
        }

        activeControllerRef.current = null;
        const error = asError(reason);
        setState({
          library: null,
          status: error instanceof ApiError && error.code === 'SERVICE_UNAVAILABLE'
            ? 'unavailable'
            : 'error',
          error,
        });
      },
    );
  }, []);

  useEffect(() => {
    refresh();

    return () => {
      requestTokenRef.current += 1;
      activeControllerRef.current?.abort();
      activeControllerRef.current = null;
    };
  }, [refresh]);

  const value = useMemo<LibraryContextValue>(
    () => ({...state, refresh}),
    [refresh, state],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const library = useContext(LibraryContext);
  if (!library) {
    throw new Error('useLibrary must be used within LibraryProvider.');
  }

  return library;
}
