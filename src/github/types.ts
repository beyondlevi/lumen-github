import type {RepoRef} from '../config/lumenConfig';

export type {RepoRef};

export type Repo = RepoRef & {
  description: string | null;
  defaultBranch: string;
  private: boolean;
  stars: number;
  pushedAt: Date | null;
};

export type Commit = {
  sha: string;
  /** The first line of the message. */
  title: string;
  /** The rest of the message, trimmed (empty when there is none). */
  body: string;
  /** The GitHub login when the e-mail belongs to an account, else the name in the commit. */
  author: string;
  date: Date;
};

export type FileChange = {
  path: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'other';
  additions: number;
  deletions: number;
};

export type CommitDetail = Commit & {
  additions: number;
  deletions: number;
  files: FileChange[];
  /** More files changed than the API listed. */
  filesTruncated: boolean;
};

export type PullState = 'open' | 'draft' | 'merged' | 'closed';

export type Pull = {
  number: number;
  title: string;
  author: string;
  state: PullState;
  headRef: string;
  baseRef: string;
  headSha: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ReviewState = 'approved' | 'changes' | 'commented';

export type Review = {author: string; state: ReviewState};

export type PullDetail = Pull & {
  body: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  commits: number;
  comments: number;
  /** The latest decisive review of each reviewer. */
  reviews: Review[];
};

export type CheckState = 'success' | 'failure' | 'pending' | 'skipped';

export type Check = {name: string; state: CheckState};

/** The checks and commit statuses of a commit, summed up. `none` when it has neither. */
export type CiSummary = {
  state: 'success' | 'failure' | 'pending' | 'none';
  checks: Check[];
  /** Whether the token could read check runs. */
  checksReadable: boolean;
};
