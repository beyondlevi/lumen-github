// Configuration contract with the Lumen platform.
//
// On the glasses the platform injects `window.lumen.config`, backed by the
// fields declared under `lumen_config` in public/manifest.webmanifest and
// filled in on the phone companion (Apps tab): a GitHub personal access token
// (secret, kept on the glasses) and the repositories to follow (text). The
// token is never bundled, logged or typed in the app.
//
// In a regular browser (development only) `window.lumen` does not exist, so
// the values come from `?github.token=…&github.repos=…` (plus `?github.api=…` to
// point the app at a mock server) and are kept in localStorage. The parameters
// are removed from the address bar right after they are read.
//
// Demo mode: the optional `demo` field set to anything but empty, 0, false, off
// or no, or `?demo=1` on the address (for this tab), shows built-in fictional
// repositories (src/demo) with no network.

export const TOKEN_KEY = 'github.token';
export const REPOS_KEY = 'github.repos';
export const DEMO_KEY = 'demo';
/** Development and test only: an origin serving the GitHub REST API (a mock). */
export const API_ORIGIN_KEY = 'github.api';

export const REQUIRED_KEYS = [TOKEN_KEY, REPOS_KEY] as const;
const URL_KEYS: readonly string[] = [...REQUIRED_KEYS, DEMO_KEY, API_ORIGIN_KEY];

export const DEV_STORAGE_KEY = 'lumen-github.dev-config';
export const DEMO_SESSION_KEY = 'lumen-github.demo';
/** At most this many repositories are followed (the rest of the list is ignored). */
export const MAX_REPOS = 12;

export type ConfigValues = Record<string, string>;

/** A repository as `owner/name`. */
export type RepoRef = {owner: string; name: string; fullName: string};

export type GitHubConfig = {
  token: string;
  repos: RepoRef[];
  /** The REST API base, without a trailing slash. */
  apiBase: string;
};

export type ConfigState =
  | {status: 'loading'}
  | {status: 'missing'; missing: string[]}
  | {status: 'ready'; config: GitHubConfig}
  | {status: 'demo'};

type LumenConfigApi = {
  get(): Promise<ConfigValues>;
  onChange(callback: (values?: ConfigValues) => void): unknown;
};

declare global {
  /** What the Lumen host injects. */
  interface LumenHost {
    config?: LumenConfigApi;
  }
  interface Window {
    lumen?: LumenHost;
  }
}

export type ConfigSource = {
  kind: 'lumen' | 'dev';
  get(): Promise<ConfigValues>;
  /** Calls back with the new values when known, or with nothing (caller re-reads). */
  subscribe(callback: (values?: ConfigValues) => void): () => void;
};

/** The parts of `window` this module uses (lets tests pass a plain object). */
export type HostWindow = {
  location: {href: string};
  localStorage: Storage;
  sessionStorage: Storage;
  history: {state: unknown; replaceState(state: unknown, unused: string, url: string): void};
  addEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
  removeEventListener(type: 'storage', listener: (event: StorageEvent) => void): void;
  lumen?: {config?: LumenConfigApi};
};

function readDevConfig(storage: Storage): ConfigValues {
  try {
    const raw = storage.getItem(DEV_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed == null || typeof parsed !== 'object') {
      return {};
    }
    const values: ConfigValues = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') {
        values[key] = value;
      }
    }
    return values;
  } catch {
    return {};
  }
}

function isOn(value: string | null | undefined): boolean {
  const text = (value ?? '').trim().toLowerCase();
  return text !== '' && !['0', 'false', 'off', 'no'].includes(text);
}

/**
 * Reads the address: `?demo=1` turns demo mode on for this tab (`?demo=0` off)
 * everywhere; the other keys are stored only in development (`store`). All of
 * them are removed from the address bar.
 */
export function captureConfigFromUrl(store: boolean, win: HostWindow = window): void {
  const url = new URL(win.location.href);
  const keys = URL_KEYS.filter(key => url.searchParams.has(key));
  if (keys.length === 0) {
    return;
  }
  if (url.searchParams.has(DEMO_KEY)) {
    try {
      if (isOn(url.searchParams.get(DEMO_KEY))) {
        win.sessionStorage.setItem(DEMO_SESSION_KEY, '1');
      } else {
        win.sessionStorage.removeItem(DEMO_SESSION_KEY);
      }
    } catch {
      // Storage blocked: demo mode stays as it was.
    }
  }
  if (store) {
    const values = readDevConfig(win.localStorage);
    for (const key of keys.filter(key => key !== DEMO_KEY)) {
      const value = (url.searchParams.get(key) ?? '').trim();
      if (value) {
        values[key] = value;
      } else {
        delete values[key];
      }
    }
    try {
      win.localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(values));
    } catch {
      // Storage full or blocked: the values stay unavailable, which shows Setup.
    }
  }
  for (const key of keys) {
    url.searchParams.delete(key);
  }
  win.history.replaceState(win.history.state, '', url.pathname + url.search + url.hash);
}

export function demoForThisTab(win: Pick<HostWindow, 'sessionStorage'> = window): boolean {
  try {
    return win.sessionStorage.getItem(DEMO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function getConfigSource(win: HostWindow = window): ConfigSource {
  const lumenConfig = win.lumen?.config;
  if (lumenConfig != null && typeof lumenConfig.get === 'function') {
    return {
      kind: 'lumen',
      get: () => lumenConfig.get(),
      subscribe(callback) {
        if (typeof lumenConfig.onChange !== 'function') {
          return () => {};
        }
        const unsubscribe = lumenConfig.onChange(values =>
          callback(values != null && typeof values === 'object' ? values : undefined),
        );
        return typeof unsubscribe === 'function' ? () => unsubscribe() : () => {};
      },
    };
  }

  return {
    kind: 'dev',
    get: () => Promise.resolve(readDevConfig(win.localStorage)),
    subscribe(callback) {
      const onStorage = (event: StorageEvent) => {
        if (event.key === null || event.key === DEV_STORAGE_KEY) {
          callback();
        }
      };
      win.addEventListener('storage', onStorage);
      return () => win.removeEventListener('storage', onStorage);
    },
  };
}

const read = (values: ConfigValues | null | undefined, key: string): string => {
  const value = values?.[key];
  return typeof value === 'string' ? value.trim() : '';
};

/** A test origin over plain http is allowed only on this device. */
function apiOrigin(raw: string): string | null {
  try {
    const url = new URL(raw);
    const local = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
    return url.protocol === 'https:' || (url.protocol === 'http:' && local) ? url.origin : null;
  } catch {
    return null;
  }
}

const NAME = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,99})$/;

/** One entry of the list: `owner/name`, or a github.com address of the repository. */
export function parseRepoRef(raw: string): RepoRef | null {
  let text = raw.trim();
  if (!text) return null;
  text = text.replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, '').replace(/^git@github\.com:/i, '');
  text = text.replace(/[?#].*$/, '').replace(/\/+$/, '').replace(/\.git$/i, '');
  const parts = text.split('/');
  if (parts.length < 2) return null;
  const [owner, name] = parts;
  if (!NAME.test(owner) || !NAME.test(name) || name === '.' || name === '..') return null;
  return {owner, name, fullName: `${owner}/${name}`};
}

/** The repositories setting: entries separated by commas, spaces or new lines; duplicates and invalid entries dropped. */
export function parseRepoList(raw: string): RepoRef[] {
  const seen = new Set<string>();
  const repos: RepoRef[] = [];
  for (const entry of raw.split(/[\s,;]+/)) {
    const ref = parseRepoRef(entry);
    if (!ref || seen.has(ref.fullName.toLowerCase())) continue;
    seen.add(ref.fullName.toLowerCase());
    repos.push(ref);
    if (repos.length >= MAX_REPOS) break;
  }
  return repos;
}

export function parseConfig(values: ConfigValues | null | undefined, demoTab = false): ConfigState {
  if (demoTab || isOn(values?.[DEMO_KEY])) {
    return {status: 'demo'};
  }
  const repos = parseRepoList(read(values, REPOS_KEY));
  const missing: string[] = [];
  if (read(values, TOKEN_KEY) === '') missing.push(TOKEN_KEY);
  if (repos.length === 0) missing.push(REPOS_KEY);
  if (missing.length > 0) {
    return {status: 'missing', missing};
  }
  const origin = read(values, API_ORIGIN_KEY) ? apiOrigin(read(values, API_ORIGIN_KEY)) : null;
  return {
    status: 'ready',
    config: {
      token: read(values, TOKEN_KEY),
      repos,
      apiBase: origin ?? 'https://api.github.com',
    },
  };
}

export function sameConfig(a: ConfigState, b: ConfigState): boolean {
  if (a.status !== b.status) {
    return false;
  }
  if (a.status === 'ready' && b.status === 'ready') {
    return (
      a.config.token === b.config.token &&
      a.config.apiBase === b.config.apiBase &&
      a.config.repos.map(repo => repo.fullName).join() === b.config.repos.map(repo => repo.fullName).join()
    );
  }
  if (a.status === 'missing' && b.status === 'missing') {
    return a.missing.join() === b.missing.join();
  }
  return true;
}
