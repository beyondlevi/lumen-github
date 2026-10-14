import {GitHubError, errorFromResponse} from './errors';
import {mapCommit, mapCommitDetail, mapPull, mapPullDetail, mapRepo, summarizeCi} from './mapping';
import type {CiSummary, Commit, CommitDetail, Pull, PullDetail, Repo, RepoRef} from './types';

/** How many commits and pull requests a list shows. */
export const LIST_SIZE = 20;
const TIMEOUT_MS = 20_000;

/** What the screens read; the GitHub client and the demo backend both provide it. */
export interface GitHubBackend {
  getRepo(ref: RepoRef): Promise<Repo>;
  listCommits(repo: Repo): Promise<Commit[]>;
  listPulls(repo: Repo): Promise<Pull[]>;
  getCommit(ref: RepoRef, sha: string): Promise<CommitDetail>;
  getPull(ref: RepoRef, number: number): Promise<PullDetail>;
  getCi(ref: RepoRef, sha: string): Promise<CiSummary>;
}

type Fetch = typeof fetch;

const path = (ref: RepoRef) => `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.name)}`;

/**
 * The GitHub REST API with a personal access token. Requests carry only the
 * `Authorization` and `Accept` headers (both allowed by api.github.com's CORS).
 */
export class GitHubClient implements GitHubBackend {
  constructor(
    private readonly token: string,
    private readonly noTitle: string,
    private readonly apiBase = 'https://api.github.com',
    private readonly fetchImpl: Fetch = (...args) => fetch(...args),
  ) {}

  private async get(pathAndQuery: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.apiBase}${pathAndQuery}`, {
        headers: {Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json'},
        cache: 'no-store',
        signal: controller.signal,
      });
    } catch (error) {
      throw new GitHubError('network', null, error instanceof Error ? error.message : 'network');
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) throw await errorFromResponse(response);
    return response.json();
  }

  async getRepo(ref: RepoRef): Promise<Repo> {
    return mapRepo(ref, await this.get(path(ref)));
  }

  async listCommits(repo: Repo): Promise<Commit[]> {
    const raw = await this.get(`${path(repo)}/commits?sha=${encodeURIComponent(repo.defaultBranch)}&per_page=${LIST_SIZE}`);
    return Array.isArray(raw) ? raw.map(entry => mapCommit(entry, this.noTitle)) : [];
  }

  /** Open and recently closed pull requests, the most recently updated first. */
  async listPulls(repo: Repo): Promise<Pull[]> {
    const raw = await this.get(`${path(repo)}/pulls?state=all&sort=updated&direction=desc&per_page=${LIST_SIZE}`);
    return Array.isArray(raw) ? raw.map(entry => mapPull(entry, this.noTitle)) : [];
  }

  async getCommit(ref: RepoRef, sha: string): Promise<CommitDetail> {
    return mapCommitDetail(await this.get(`${path(ref)}/commits/${encodeURIComponent(sha)}`), this.noTitle);
  }

  async getPull(ref: RepoRef, number: number): Promise<PullDetail> {
    const [pull, reviews] = await Promise.all([
      this.get(`${path(ref)}/pulls/${number}`),
      this.get(`${path(ref)}/pulls/${number}/reviews?per_page=100`).catch(() => []),
    ]);
    return mapPullDetail(pull, reviews, this.noTitle);
  }

  /** A token that may not read check runs (GitHub's docs list no permission for them on fine-grained tokens) still gets the commit statuses. */
  async getCi(ref: RepoRef, sha: string): Promise<CiSummary> {
    const commit = `${path(ref)}/commits/${encodeURIComponent(sha)}`;
    const [runs, status] = await Promise.all([
      this.get(`${commit}/check-runs?per_page=100`).catch((error: unknown) => {
        if (error instanceof GitHubError && (error.kind === 'forbidden' || error.kind === 'notfound')) return null;
        throw error;
      }),
      this.get(`${commit}/status`).catch((error: unknown) => {
        if (error instanceof GitHubError && (error.kind === 'forbidden' || error.kind === 'notfound')) return {};
        throw error;
      }),
    ]);
    return summarizeCi(runs, status);
  }
}
