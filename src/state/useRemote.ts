import {useCallback, useEffect, useState} from 'react';
import {asGitHubError, type GitHubError} from '../github/errors';
import {useGitHub} from './GitHubProvider';
import {remoteCache as cache} from './remoteCache';

export type Remote<T> = {kind: 'loading'} | {kind: 'ready'; value: T} | {kind: 'error'; error: GitHubError};


/**
 * One request of a detail screen, keyed by `key` (null: nothing to load). A
 * refused token sends the app back to Setup.
 */
export function useRemote<T>(key: string | null, request: () => Promise<T>): {state: Remote<T>; reload(): void} {
  const {tokenRefused, backend} = useGitHub();
  const [state, setState] = useState<Remote<T>>(() => (key && cache.has(key) ? {kind: 'ready', value: cache.get(key) as T} : {kind: 'loading'}));
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!key || !backend) return;
    let alive = true;
    const cached = cache.get(key);
    setState(cached !== undefined ? {kind: 'ready', value: cached as T} : {kind: 'loading'});
    request().then(
      value => {
        cache.set(key, value);
        if (alive) setState({kind: 'ready', value});
      },
      (caught: unknown) => {
        if (!alive) return;
        const error = asGitHubError(caught);
        if (error.kind === 'auth') tokenRefused();
        // Keep a cached answer on screen when the refresh fails.
        if (cached === undefined) setState({kind: 'error', error});
      },
    );
    return () => {
      alive = false;
    };
    // `request` is a new function each render; the key says what it fetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, backend, round, tokenRefused]);

  const reload = useCallback(() => setRound(value => value + 1), []);
  return {state, reload};
}

