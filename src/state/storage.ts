// What the app keeps on the glasses: the repository on screen (localStorage),
// and the open tab (sessionStorage, so it survives the page being reloaded by
// Android). Nothing from GitHub is stored.

const REPO_KEY = 'lumen-github.repo';
const TAB_KEY = 'lumen-github.tab';

function safeGet(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: () => Storage, key: string, value: string | null): void {
  try {
    if (value == null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    // Storage full or blocked: the choice lasts until the app closes.
  }
}

const local = () => window.localStorage;
const session = () => window.sessionStorage;

export function loadRepo(): string | null {
  return safeGet(local, REPO_KEY);
}

export function saveRepo(fullName: string): void {
  safeSet(local, REPO_KEY, fullName);
}

export function loadTab(): number {
  const value = Number(safeGet(session, TAB_KEY));
  return Number.isInteger(value) && value >= 0 && value <= 2 ? value : 0;
}

export function saveTab(tab: number): void {
  safeSet(session, TAB_KEY, String(tab));
}
