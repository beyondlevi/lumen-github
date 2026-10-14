export type GitHubErrorKind = 'network' | 'auth' | 'forbidden' | 'notfound' | 'ratelimit' | 'server';

/** A failed call to GitHub. `auth` means the token was refused: the Setup screen. */
export class GitHubError extends Error {
  readonly kind: GitHubErrorKind;
  readonly status: number | null;
  /** For `ratelimit`: when GitHub lets the app ask again, if it said. */
  readonly resetAt: Date | null;

  constructor(kind: GitHubErrorKind, status: number | null = null, message: string = kind, resetAt: Date | null = null) {
    super(message);
    this.name = 'GitHubError';
    this.kind = kind;
    this.status = status;
    this.resetAt = resetAt;
  }
}

export function asGitHubError(error: unknown): GitHubError {
  if (error instanceof GitHubError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') return new GitHubError('network', null, 'aborted');
  // fetch() rejects with a TypeError when the network is down or CORS fails.
  return new GitHubError('network');
}

type Headers = {get(name: string): string | null};

/** Maps an API response that isn't ok. GitHub signals rate limits with 403 or 429 and the x-ratelimit headers. */
export async function errorFromResponse(response: {status: number; headers: Headers; json(): Promise<unknown>}): Promise<GitHubError> {
  let message = '';
  try {
    const body = (await response.json()) as {message?: unknown};
    if (typeof body?.message === 'string') message = body.message;
  } catch {
    // Not JSON.
  }
  const status = response.status;
  const remaining = response.headers.get('x-ratelimit-remaining');
  const reset = Number(response.headers.get('x-ratelimit-reset'));
  const resetAt = Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000) : null;
  if (status === 429 || (status === 403 && (remaining === '0' || /rate limit/i.test(message)))) {
    return new GitHubError('ratelimit', status, message || 'ratelimit', resetAt);
  }
  if (status === 401) return new GitHubError('auth', status, message || 'auth');
  if (status === 403) return new GitHubError('forbidden', status, message || 'forbidden');
  if (status === 404 || status === 410) return new GitHubError('notfound', status, message || 'notfound');
  return new GitHubError('server', status, message || 'server');
}
