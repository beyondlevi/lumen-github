import type {RepoRef} from './github/types';

const repoPath = (repo: RepoRef) => `/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;

export function pullPath(repo: RepoRef, number: number): string {
  return `${repoPath(repo)}/pull/${number}`;
}

export function commitPath(repo: RepoRef, sha: string): string {
  return `${repoPath(repo)}/commit/${encodeURIComponent(sha)}`;
}
