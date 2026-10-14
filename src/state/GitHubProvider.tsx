import {Toast} from '@wearables-ui-toolkit/mrbd';
import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import type {RepoRef} from '../config/lumenConfig';
import {DEMO_REPOS, DemoBackend} from '../demo/demoBackend';
import {GitHubClient, type GitHubBackend} from '../github/client';
import {GitHubError, asGitHubError} from '../github/errors';
import type {Commit, Pull, Repo} from '../github/types';
import {t, type StringKey} from '../i18n/strings';
import {remoteCache} from './remoteCache';
import {loadRepo, loadTab, saveRepo, saveTab} from './storage';
import {useLumenConfig} from './useLumenConfig';

const REFRESH_EVERY_MS = 5 * 60 * 1000;
/** The phone's internet can take 7 to 30 s to come up after the app opens. */
const NETWORK_RETRY_S = [2, 4, 8, 15];
const TICK_MS = 30 * 1000;

export type Phase = {kind: 'loading'} | {kind: 'setup'; reason: 'missing' | 'refused'; missing: string[]} | {kind: 'ready'};

export type DataStatus =
  | {kind: 'loading'}
  /** Waiting for the internet, retrying on its own. */
  | {kind: 'connecting'}
  | {kind: 'ready'}
  | {kind: 'error'; error: GitHubError};

/** What the Repositories tab knows of each repository in the settings. */
export type RepoEntry = {ref: RepoRef; repo: Repo | null; error: GitHubError | null};

type GitHubState = {
  phase: Phase;
  backend: GitHubBackend | null;
  /** The repositories of the settings, in their order. */
  repos: RepoEntry[];
  /** The repository on screen. */
  selected: RepoRef | null;
  select(ref: RepoRef): void;
  /** The commits and pull requests of the repository on screen. */
  status: DataStatus;
  repo: Repo | null;
  commits: Commit[];
  pulls: Pull[];
  /** Updated every 30 s, for "5 minutes ago". */
  current: Date;
  retry(): void;
  /** Setup's Try again: re-reads the settings and loads again. */
  reconnect(): Promise<void>;
  /** Called by a screen whose own request was refused for the token. */
  tokenRefused(): void;
  tab: number;
  setTab(tab: number): void;
};

const GitHubContext = createContext<GitHubState | null>(null);

export function useGitHub(): GitHubState {
  const value = useContext(GitHubContext);
  if (!value) throw new Error('useGitHub outside GitHubProvider');
  return value;
}

const FAILURE_REASON: Record<GitHubError['kind'], StringKey> = {
  network: 'reasonNetwork',
  auth: 'reasonAuth',
  forbidden: 'reasonForbidden',
  notfound: 'reasonNotFound',
  ratelimit: 'reasonRate',
  server: 'reasonServer',
};

export function failureReason(error: unknown): string {
  return t(FAILURE_REASON[asGitHubError(error).kind]);
}

const sameRef = (a: RepoRef | null, b: RepoRef | null) => a != null && b != null && a.fullName.toLowerCase() === b.fullName.toLowerCase();

export const PULLS_TAB = 0;
export const COMMITS_TAB = 1;
export const REPOS_TAB = 2;

export function GitHubProvider({children}: {children: ReactNode}) {
  const config = useLumenConfig();
  const configState = config.state;
  const [refused, setRefused] = useState(false);
  const [status, setStatus] = useState<DataStatus>({kind: 'loading'});
  const [repoInfo, setRepoInfo] = useState<Record<string, {repo: Repo | null; error: GitHubError | null}>>({});
  const [commits, setCommits] = useState<Commit[]>([]);
  const [pulls, setPulls] = useState<Pull[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(loadRepo);
  const [tab, setTabState] = useState(loadTab);
  const [current, setCurrent] = useState(() => new Date());

  const refs = useMemo<RepoRef[]>(
    () => (configState.status === 'demo' ? DEMO_REPOS : configState.status === 'ready' ? configState.config.repos : []),
    [configState],
  );

  const backend = useMemo<GitHubBackend | null>(() => {
    if (configState.status === 'demo') return new DemoBackend(new Date(), t('noTitle'));
    if (configState.status !== 'ready') return null;
    return new GitHubClient(configState.config.token, t('noTitle'), configState.config.apiBase);
  }, [configState]);

  const selected = useMemo(() => refs.find(ref => ref.fullName.toLowerCase() === chosen?.toLowerCase()) ?? refs[0] ?? null, [chosen, refs]);

  const backendRef = useRef(backend);
  backendRef.current = backend;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const refsRef = useRef(refs);
  refsRef.current = refs;
  const generation = useRef(0);
  const hasData = useRef(false);

  /** The repository on screen (its commits and pull requests) first; the others' names and descriptions after. */
  const load = useCallback(async (manual: boolean) => {
    const source = backendRef.current;
    const ref = selectedRef.current;
    if (!source || !ref) return;
    const run = ++generation.current;
    const alive = () => run === generation.current && backendRef.current === source;
    if (!hasData.current) setStatus({kind: 'loading'});
    for (let attempt = 0; ; attempt += 1) {
      try {
        const repo = await source.getRepo(ref);
        const [nextCommits, nextPulls] = await Promise.all([source.listCommits(repo), source.listPulls(repo)]);
        if (!alive()) return;
        hasData.current = true;
        setRepoInfo(previous => ({...previous, [ref.fullName.toLowerCase()]: {repo, error: null}}));
        setCommits(nextCommits);
        setPulls(nextPulls);
        setLoadedFor(ref.fullName.toLowerCase());
        setCurrent(new Date());
        setStatus({kind: 'ready'});
        break;
      } catch (caught) {
        if (!alive()) return;
        const error = asGitHubError(caught);
        if (error.kind === 'auth') {
          setRefused(true);
          return;
        }
        if (hasData.current && !manual) {
          // A background refresh failed: keep what is on screen.
          return;
        }
        const delay = NETWORK_RETRY_S[attempt];
        if (error.kind !== 'network' || delay == null || hasData.current) {
          setRepoInfo(previous => ({...previous, [ref.fullName.toLowerCase()]: {repo: previous[ref.fullName.toLowerCase()]?.repo ?? null, error}}));
          setStatus({kind: 'error', error});
          return;
        }
        setStatus({kind: 'connecting'});
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
        if (!alive()) return;
      }
    }
    // The other repositories, for the Repositories tab; one at a time is plenty.
    for (const other of refsRef.current) {
      if (sameRef(other, ref)) continue;
      try {
        const repo = await source.getRepo(other);
        if (!alive()) return;
        setRepoInfo(previous => ({...previous, [other.fullName.toLowerCase()]: {repo, error: null}}));
      } catch (caught) {
        if (!alive()) return;
        const error = asGitHubError(caught);
        if (error.kind === 'auth') {
          setRefused(true);
          return;
        }
        setRepoInfo(previous => ({...previous, [other.fullName.toLowerCase()]: {repo: previous[other.fullName.toLowerCase()]?.repo ?? null, error}}));
      }
    }
  }, []);

  // A new configuration starts over.
  useEffect(() => {
    hasData.current = false;
    remoteCache.clear();
    setRefused(false);
    setRepoInfo({});
    setCommits([]);
    setPulls([]);
    setLoadedFor(null);
  }, [backend]);

  // Another repository on screen: its lists replace the previous ones.
  const selectedKey = selected?.fullName.toLowerCase() ?? null;
  useEffect(() => {
    if (!backend || !selectedKey) return;
    hasData.current = false;
    void load(false);
  }, [backend, load, selectedKey]);

  // Refresh when the wearer comes back to the app and every 5 minutes while it's open.
  useEffect(() => {
    if (!backend) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setCurrent(new Date());
        void load(false);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    const refresh = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(false);
    }, REFRESH_EVERY_MS);
    const tick = window.setInterval(() => setCurrent(new Date()), TICK_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(refresh);
      window.clearInterval(tick);
    };
  }, [backend, load]);

  const phase: Phase =
    configState.status === 'loading'
      ? {kind: 'loading'}
      : configState.status === 'missing'
        ? {kind: 'setup', reason: 'missing', missing: configState.missing}
        : refused
          ? {kind: 'setup', reason: 'refused', missing: []}
          : {kind: 'ready'};

  const retry = useCallback(() => void load(true), [load]);
  const tokenRefused = useCallback(() => setRefused(true), []);

  const reconnect = useCallback(async () => {
    const next = await config.reload();
    if (next.status === 'missing') {
      Toast.show(t('stillNotConnected'));
      return;
    }
    setRefused(false);
    hasData.current = false;
    await load(true);
  }, [config, load]);

  const setTab = useCallback((next: number) => {
    setTabState(next);
    saveTab(next);
  }, []);

  const select = useCallback(
    (ref: RepoRef) => {
      setChosen(ref.fullName);
      saveRepo(ref.fullName);
      setTab(PULLS_TAB);
      Toast.show(t('showingRepo', {repo: ref.fullName}));
    },
    [setTab],
  );

  const repos = useMemo<RepoEntry[]>(
    () => refs.map(ref => ({ref, repo: repoInfo[ref.fullName.toLowerCase()]?.repo ?? null, error: repoInfo[ref.fullName.toLowerCase()]?.error ?? null})),
    [refs, repoInfo],
  );

  // Until the selected repository's own lists arrive, show it as loading, not the previous one's lists.
  const fresh = loadedFor === selectedKey;
  const value: GitHubState = {
    phase,
    backend,
    repos,
    selected,
    select,
    status: fresh || status.kind !== 'ready' ? status : {kind: 'loading'},
    repo: selectedKey ? (repoInfo[selectedKey]?.repo ?? null) : null,
    commits: fresh ? commits : [],
    pulls: fresh ? pulls : [],
    current,
    retry,
    reconnect,
    tokenRefused,
    tab,
    setTab,
  };

  return <GitHubContext.Provider value={value}>{children}</GitHubContext.Provider>;
}
