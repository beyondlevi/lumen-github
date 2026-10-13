import type {GitHubBackend} from '../github/client';
import {GitHubError} from '../github/errors';
import {mapCommit, mapCommitDetail, mapPull, mapPullDetail, mapRepo, summarizeCi} from '../github/mapping';
import type {CiSummary, Commit, CommitDetail, Pull, PullDetail, Repo, RepoRef} from '../github/types';
import {buildGitHub, type RawRepoData} from './build.mjs';
import fixtures from './fixtures.json';

/** The fictional repositories of demo mode, in the order of the fixtures. */
export const DEMO_REPOS: RepoRef[] = fixtures.repos.map(repo => {
  const [owner, name] = repo.full_name.split('/');
  return {owner, name, fullName: repo.full_name};
});

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Demo mode: the fixtures around `now`, no network. */
export class DemoBackend implements GitHubBackend {
  private readonly data: Record<string, RawRepoData>;

  constructor(
    now: Date,
    private readonly noTitle: string,
    private readonly delayMs = 250,
  ) {
    this.data = buildGitHub(fixtures, now);
  }

  private async repoData(ref: RepoRef): Promise<RawRepoData> {
    await pause(this.delayMs);
    const found = this.data[ref.fullName.toLowerCase()];
    if (!found) throw new GitHubError('notfound', 404);
    return found;
  }

  async getRepo(ref: RepoRef): Promise<Repo> {
    return mapRepo(ref, (await this.repoData(ref)).repo);
  }

  async listCommits(repo: Repo): Promise<Commit[]> {
    return (await this.repoData(repo)).commits.map(raw => mapCommit(raw, this.noTitle));
  }

  async listPulls(repo: Repo): Promise<Pull[]> {
    return (await this.repoData(repo)).pulls.map(raw => mapPull(raw, this.noTitle));
  }

  async getCommit(ref: RepoRef, sha: string): Promise<CommitDetail> {
    const raw = (await this.repoData(ref)).commitDetails[sha];
    if (!raw) throw new GitHubError('notfound', 404);
    return mapCommitDetail(raw, this.noTitle);
  }

  async getPull(ref: RepoRef, number: number): Promise<PullDetail> {
    const data = await this.repoData(ref);
    const raw = data.pullDetails[String(number)];
    if (!raw) throw new GitHubError('notfound', 404);
    return mapPullDetail(raw, data.reviews[String(number)] ?? [], this.noTitle);
  }

  async getCi(ref: RepoRef, sha: string): Promise<CiSummary> {
    const data = await this.repoData(ref);
    return summarizeCi(data.checkRuns[sha] ?? {check_runs: []}, data.statuses[sha] ?? {});
  }
}
