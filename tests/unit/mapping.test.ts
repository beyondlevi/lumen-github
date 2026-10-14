import {describe, expect, it} from 'vitest';
import {latestReviews, mapCommit, mapCommitDetail, mapPull, markdownToText, splitMessage, summarizeCi} from '../../src/github/mapping';

describe('commits', () => {
  it('splits the message and prefers the GitHub login', () => {
    expect(splitMessage('Fix it\r\n\r\nBecause.\n')).toEqual({title: 'Fix it', body: 'Because.'});
    const commit = mapCommit(
      {sha: 'abc', commit: {message: 'Title\n\nBody', author: {name: 'Ana Lima', date: '2026-10-13T10:00:00Z'}}, author: {login: 'ana-lima'}},
      '(No title)',
    );
    expect(commit).toEqual({sha: 'abc', title: 'Title', body: 'Body', author: 'ana-lima', date: new Date('2026-10-13T10:00:00Z')});
  });

  it('falls back to the name in the commit and a placeholder title', () => {
    const commit = mapCommit({sha: 'abc', commit: {message: '', author: {name: 'Someone', date: 'x'}, committer: {date: '2026-10-13T10:00:00Z'}}, author: null}, '(No title)');
    expect(commit.author).toBe('Someone');
    expect(commit.title).toBe('(No title)');
    expect(commit.date).toEqual(new Date('2026-10-13T10:00:00Z'));
  });

  it('joins the hard-wrapped lines of the body, keeping lists and trailers', () => {
    const message = [
      'Title',
      '',
      'The ring was drawn outside the',
      'padding box.',
      '',
      '- first item that goes',
      '  on',
      '- second',
      '',
      'Fixes #212',
      'Co-Authored-By: Ana <ana@example.com>',
    ].join('\n');
    expect(mapCommit({sha: 'a', commit: {message}}, '').body).toBe(
      ['The ring was drawn outside the padding box.', '', '- first item that goes on', '- second', '', 'Fixes #212', 'Co-Authored-By: Ana <ana@example.com>'].join('\n'),
    );
  });

  it('reads the stats and files', () => {
    const detail = mapCommitDetail({sha: 'a', commit: {message: 'm'}, stats: {additions: 3, deletions: 1}, files: [{filename: 'a.ts', status: 'renamed', additions: 3, deletions: 1}, {filename: 'b', status: 'copied'}]}, '');
    expect(detail.additions).toBe(3);
    expect(detail.files.map(file => file.status)).toEqual(['renamed', 'other']);
    expect(detail.filesTruncated).toBe(false);
  });
});

describe('pull requests', () => {
  const base = {number: 7, title: ' T ', user: {login: 'ana'}, head: {ref: 'f', sha: 's'}, base: {ref: 'main'}, created_at: '2026-10-13T10:00:00Z', updated_at: '2026-10-13T11:00:00Z'};

  it('tells open, draft, merged and closed apart', () => {
    expect(mapPull({...base, state: 'open'}, '').state).toBe('open');
    expect(mapPull({...base, state: 'open', draft: true}, '').state).toBe('draft');
    expect(mapPull({...base, state: 'closed', merged_at: '2026-10-13T11:00:00Z'}, '').state).toBe('merged');
    expect(mapPull({...base, state: 'closed', merged_at: null}, '').state).toBe('closed');
    expect(mapPull({...base, state: 'open'}, '').title).toBe('T');
  });

  it("keeps each reviewer's standing decision, as GitHub does", () => {
    const review = (login: string, state: string) => ({user: {login}, state});
    expect(
      latestReviews(
        [
          review('bob', 'CHANGES_REQUESTED'),
          review('bob', 'COMMENTED'),
          review('cid', 'COMMENTED'),
          review('dee', 'APPROVED'),
          review('dee', 'DISMISSED'),
          review('ana', 'APPROVED'),
          review('eve', 'CHANGES_REQUESTED'),
          review('eve', 'APPROVED'),
        ],
        'ana',
      ),
    ).toEqual([
      {author: 'bob', state: 'changes'},
      {author: 'cid', state: 'commented'},
      {author: 'eve', state: 'approved'},
    ]);
  });
});

describe('checks', () => {
  const run = (name: string, status: string, conclusion: string | null) => ({name, status, conclusion});

  it('sums up check runs and commit statuses, failures first', () => {
    const ci = summarizeCi(
      {check_runs: [run('build', 'completed', 'success'), run('test', 'completed', 'failure'), run('build', 'completed', 'failure'), run('docs', 'completed', 'skipped')]},
      {statuses: [{context: 'coverage', state: 'pending'}]},
    );
    expect(ci.state).toBe('failure');
    expect(ci.checks).toEqual([
      {name: 'test', state: 'failure'},
      {name: 'coverage', state: 'pending'},
      {name: 'build', state: 'success'},
      {name: 'docs', state: 'skipped'},
    ]);
  });

  it('is pending while something runs, and none without checks', () => {
    expect(summarizeCi({check_runs: [run('a', 'in_progress', null), run('b', 'completed', 'success')]}, {}).state).toBe('pending');
    // GitHub's combined status says "pending" when there are no statuses at all.
    expect(summarizeCi({check_runs: []}, {state: 'pending', statuses: []}).state).toBe('none');
    expect(summarizeCi({check_runs: [run('a', 'completed', 'skipped')]}, {}).state).toBe('none');
  });

  it('notes a token that cannot read check runs', () => {
    const ci = summarizeCi(null, {statuses: [{context: 'ci', state: 'success'}]});
    expect(ci).toEqual({state: 'success', checks: [{name: 'ci', state: 'success'}], checksReadable: false});
  });
});

describe('markdownToText', () => {
  it('keeps the words and the paragraphs, drops the markup', () => {
    const markdown = [
      '## What',
      '',
      'Scroll **half a screen** with `Down`, see [the docs](https://x.dev) and https://y.dev.',
      '',
      '<!-- hidden -->',
      '![shot](https://x.dev/a.png)',
      '- [x] Tests',
      '* [ ] WebView',
      '> quoted',
      '',
      '```ts',
      'const a = 1;',
      '```',
    ].join('\n');
    expect(markdownToText(markdown)).toBe(
      ['What', '', 'Scroll half a screen with Down, see the docs and https://y.dev.', '', '[x] Tests', '[ ] WebView', 'quoted', '', 'const a = 1;'].join('\n'),
    );
  });

  it('leaves snake_case and multiplication alone', () => {
    expect(markdownToText('use some_long_name and 2 * 3 * 4')).toBe('use some_long_name and 2 * 3 * 4');
  });
});
