// GitHub REST responses to the app's model. Only the fields the app shows are read.
import type {Check, CheckState, CiSummary, Commit, CommitDetail, FileChange, Pull, PullDetail, PullState, Repo, RepoRef, Review, ReviewState} from './types';

type Json = Record<string, unknown>;

const obj = (value: unknown): Json => (value != null && typeof value === 'object' ? (value as Json) : {});
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const date = (value: unknown): Date | null => {
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function mapRepo(ref: RepoRef, raw: unknown): Repo {
  const data = obj(raw);
  const fullName = str(data.full_name) || ref.fullName;
  const [owner = ref.owner, name = ref.name] = fullName.split('/');
  return {
    owner,
    name,
    fullName,
    description: str(data.description) || null,
    defaultBranch: str(data.default_branch) || 'main',
    private: data.private === true,
    stars: num(data.stargazers_count),
    pushedAt: date(data.pushed_at),
  };
}

/** Splits a commit message into its first line and the rest. */
export function splitMessage(message: string): {title: string; body: string} {
  const text = message.replace(/\r\n?/g, '\n');
  const newline = text.indexOf('\n');
  if (newline < 0) return {title: text.trim(), body: ''};
  return {title: text.slice(0, newline).trim(), body: text.slice(newline + 1).trim()};
}

/** A line that starts its own line even inside a paragraph: a list item or a trailer such as "Co-Authored-By:". */
const OWN_LINE = /^\s*(?:[-*+]\s|\d+[.)]\s|[A-Z][\w-]*(?:-[A-Za-z]+)*:\s)/;

/**
 * Commit bodies are hard-wrapped at about 72 columns for terminals; on the HUD
 * that breaks lines in the middle. Joins the lines of each paragraph again,
 * keeping list items, trailers and indented (code) lines on their own.
 */
export function unwrapMessage(body: string): string {
  return body
    .split(/\n{2,}/)
    .map(paragraph =>
      paragraph
        .split('\n')
        .reduce<string[]>((lines, line) => {
          const previous = lines[lines.length - 1];
          if (previous == null || OWN_LINE.test(line) || /^(?: {4,}|\t)\S/.test(line) || /^(?: {4,}|\t)\S/.test(previous)) lines.push(line);
          else lines[lines.length - 1] = `${previous.trimEnd()} ${line.trim()}`;
          return lines;
        }, [])
        .join('\n'),
    )
    .join('\n\n');
}

export function mapCommit(raw: unknown, noTitle: string): Commit {
  const data = obj(raw);
  const commit = obj(data.commit);
  const author = obj(commit.author);
  const committer = obj(commit.committer);
  const {title, body} = splitMessage(str(commit.message));
  return {
    sha: str(data.sha),
    title: title || noTitle,
    body: unwrapMessage(body),
    author: str(obj(data.author).login) || str(author.name) || str(committer.name),
    date: date(author.date) ?? date(committer.date) ?? new Date(0),
  };
}

const FILE_STATUS: Record<string, FileChange['status']> = {added: 'added', removed: 'removed', modified: 'modified', renamed: 'renamed'};

export function mapCommitDetail(raw: unknown, noTitle: string): CommitDetail {
  const data = obj(raw);
  const stats = obj(data.stats);
  const files = Array.isArray(data.files) ? data.files.map(obj) : [];
  return {
    ...mapCommit(raw, noTitle),
    additions: num(stats.additions),
    deletions: num(stats.deletions),
    files: files.map(file => ({
      path: str(file.filename),
      status: FILE_STATUS[str(file.status)] ?? 'other',
      additions: num(file.additions),
      deletions: num(file.deletions),
    })),
    // The API lists at most 300 files per page.
    filesTruncated: files.length >= 300,
  };
}

function pullState(data: Json): PullState {
  if (str(data.merged_at) || data.merged === true) return 'merged';
  if (str(data.state) === 'closed') return 'closed';
  return data.draft === true ? 'draft' : 'open';
}

export function mapPull(raw: unknown, noTitle: string): Pull {
  const data = obj(raw);
  const created = date(data.created_at) ?? new Date(0);
  return {
    number: num(data.number),
    title: str(data.title).trim() || noTitle,
    author: str(obj(data.user).login),
    state: pullState(data),
    headRef: str(obj(data.head).ref),
    baseRef: str(obj(data.base).ref),
    headSha: str(obj(data.head).sha),
    createdAt: created,
    updatedAt: date(data.updated_at) ?? created,
  };
}

const REVIEW_STATE: Record<string, ReviewState> = {APPROVED: 'approved', CHANGES_REQUESTED: 'changes', COMMENTED: 'commented'};

/**
 * The latest review of each reviewer, as GitHub counts it: an approval or a
 * change request stands until the same person approves or requests changes
 * again (or the review is dismissed); comments alone count only for reviewers
 * who never decided. The pull's author is left out.
 */
export function latestReviews(raw: unknown, pullAuthor: string): Review[] {
  const list = Array.isArray(raw) ? raw.map(obj) : [];
  const byAuthor = new Map<string, ReviewState>();
  for (const review of list) {
    const author = str(obj(review.user).login);
    if (!author || author === pullAuthor) continue;
    const kind = str(review.state);
    if (kind === 'DISMISSED') {
      if (byAuthor.get(author) !== 'commented') byAuthor.delete(author);
      continue;
    }
    const state = REVIEW_STATE[kind];
    if (!state) continue;
    const previous = byAuthor.get(author);
    if (state === 'commented' && previous && previous !== 'commented') continue;
    byAuthor.set(author, state);
  }
  return [...byAuthor].map(([author, state]) => ({author, state}));
}

export function mapPullDetail(raw: unknown, reviews: unknown, noTitle: string): PullDetail {
  const data = obj(raw);
  const pull = mapPull(raw, noTitle);
  return {
    ...pull,
    body: str(data.body),
    additions: num(data.additions),
    deletions: num(data.deletions),
    changedFiles: num(data.changed_files),
    commits: num(data.commits),
    comments: num(data.comments) + num(data.review_comments),
    reviews: latestReviews(reviews, pull.author),
  };
}

function checkRunState(run: Json): CheckState {
  if (str(run.status) !== 'completed') return 'pending';
  switch (str(run.conclusion)) {
    case 'success':
    case 'neutral':
      return 'success';
    case 'skipped':
      return 'skipped';
    case 'action_required':
    case 'stale':
      return 'pending';
    default:
      // failure, cancelled, timed_out, startup_failure
      return 'failure';
  }
}

const STATUS_STATE: Record<string, CheckState> = {success: 'success', pending: 'pending', failure: 'failure', error: 'failure'};

/**
 * Sums up a commit's check runs and commit statuses (both are "checks" on
 * GitHub's page). Re-runs of a check keep only the newest. `checkRuns` is null
 * when the token can't read them.
 */
export function summarizeCi(checkRuns: unknown | null, status: unknown): CiSummary {
  const checks: Check[] = [];
  const seen = new Set<string>();
  const runs = checkRuns == null ? [] : Array.isArray(obj(checkRuns).check_runs) ? (obj(checkRuns).check_runs as unknown[]).map(obj) : [];
  // The API lists the newest run of a name first.
  for (const run of runs) {
    const name = str(run.name);
    if (seen.has(name)) continue;
    seen.add(name);
    checks.push({name, state: checkRunState(run)});
  }
  const statuses = Array.isArray(obj(status).statuses) ? (obj(status).statuses as unknown[]).map(obj) : [];
  for (const entry of statuses) {
    const name = str(entry.context);
    if (seen.has(name)) continue;
    seen.add(name);
    checks.push({name, state: STATUS_STATE[str(entry.state)] ?? 'pending'});
  }
  const order: Record<CheckState, number> = {failure: 0, pending: 1, success: 2, skipped: 3};
  checks.sort((a, b) => order[a.state] - order[b.state] || a.name.localeCompare(b.name));
  const counted = checks.filter(check => check.state !== 'skipped');
  const state =
    counted.length === 0
      ? 'none'
      : counted.some(check => check.state === 'failure')
        ? 'failure'
        : counted.some(check => check.state === 'pending')
          ? 'pending'
          : 'success';
  return {state, checks, checksReadable: checkRuns != null};
}

/**
 * GitHub-flavored Markdown as plain text for the HUD: no markup, links as their
 * text, images and HTML comments dropped, list items kept as lines.
 */
export function markdownToText(markdown: string): string {
  let text = markdown.replace(/\r\n?/g, '\n');
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  text = text.replace(/```[^\n]*\n([\s\S]*?)```/g, (_, code: string) => code.replace(/\n$/, ''));
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '');
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (_, label: string, url: string) => (label === url ? url : label));
  text = text.replace(/<(?:img|br|hr)\b[^>]*>/gi, '');
  text = text.replace(/<\/?(?:details|summary|sub|sup|p|div|span|b|i|em|strong|code|kbd|a)\b[^>]*>/gi, '');
  text = text.replace(/^[ \t]{0,3}#{1,6}[ \t]+(.*?)[ \t]*#*[ \t]*$/gm, '$1');
  text = text.replace(/^[ \t]{0,3}>[ \t]?/gm, '');
  text = text.replace(/^([ \t]*)[-*+][ \t]+\[( |x|X)\][ \t]+/gm, (_, indent: string, mark: string) => `${indent}${mark === ' ' ? '[ ]' : '[x]'} `);
  text = text.replace(/^([ \t]*)[*+][ \t]+/gm, '$1- ');
  text = text.replace(/^[ \t]{0,3}(?:[-*_][ \t]*){3,}$/gm, '');
  text = text.replace(/(\*\*|__)(.+?)\1/g, '$2');
  text = text.replace(/(^|[^\w*])\*(?!\s)([^*\n]+?)\*(?!\w)/g, '$1$2');
  text = text.replace(/(^|[^\w_])_(?!\s)([^_\n]+?)_(?!\w)/g, '$1$2');
  text = text.replace(/~~(.+?)~~/g, '$1');
  text = text.replace(/`([^`\n]+)`/g, '$1');
  text = text.replace(/^\|?[ \t]*:?-{3,}:?[ \t]*(\|[ \t]*:?-{3,}:?[ \t]*)*\|?[ \t]*$/gm, '');
  text = text.replace(/[ \t]+$/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}
