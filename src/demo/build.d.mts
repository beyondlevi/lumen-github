export type RawRepoData = {
  repo: unknown;
  commits: {sha: string}[];
  commitDetails: Record<string, unknown>;
  pulls: {number: number}[];
  pullDetails: Record<string, unknown>;
  reviews: Record<string, unknown[]>;
  checkRuns: Record<string, unknown>;
  statuses: Record<string, unknown>;
};
export function fakeSha(seed: string): string;
export function buildGitHub(fixtures: unknown, now?: Date): Record<string, RawRepoData>;
