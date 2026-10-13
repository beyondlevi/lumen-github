import {describe, expect, it} from 'vitest';
import {GitHubClient} from '../../src/github/client';
import {GitHubError} from '../../src/github/errors';

type Call = {url: string; init: RequestInit};

function fakeFetch(routes: Record<string, {status?: number; body: unknown; headers?: Record<string, string>}>) {
  const calls: Call[] = [];
  const impl = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({url, init});
    const path = url.replace('https://api.test', '');
    const route = routes[path];
    if (!route) return new Response(JSON.stringify({message: 'Not Found'}), {status: 404});
    return new Response(JSON.stringify(route.body), {status: route.status ?? 200, headers: route.headers});
  }) as typeof fetch;
  return {calls, impl};
}

const ref = {owner: 'o', name: 'r', fullName: 'o/r'};

describe('GitHubClient', () => {
  it('sends only the token and Accept, and reads the default branch', async () => {
    const {calls, impl} = fakeFetch({
      '/repos/o/r': {body: {full_name: 'o/r', default_branch: 'trunk'}},
      '/repos/o/r/commits?sha=trunk&per_page=20': {body: [{sha: 'a', commit: {message: 'One'}}]},
    });
    const client = new GitHubClient('tkn', '(No title)', 'https://api.test', impl);
    const repo = await client.getRepo(ref);
    expect(repo.defaultBranch).toBe('trunk');
    const commits = await client.listCommits(repo);
    expect(commits.map(commit => commit.title)).toEqual(['One']);
    expect(calls[0].init.headers).toEqual({Authorization: 'Bearer tkn', Accept: 'application/vnd.github+json'});
  });

  it('maps a refused token, a rate limit and missing access', async () => {
    const reject = async (status: number, body: unknown, headers?: Record<string, string>): Promise<GitHubError> => {
      const {impl} = fakeFetch({'/repos/o/r': {status, body, headers}});
      return new GitHubClient('t', '', 'https://api.test', impl).getRepo(ref).then(
        () => {
          throw new Error('expected a failure');
        },
        (error: GitHubError) => error,
      );
    };
    expect((await reject(401, {message: 'Bad credentials'})).kind).toBe('auth');
    const limited = await reject(403, {message: 'API rate limit exceeded'}, {'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1791000000'});
    expect(limited.kind).toBe('ratelimit');
    expect(limited.resetAt).toEqual(new Date(1791000000 * 1000));
    expect((await reject(403, {message: 'Resource not accessible by personal access token'})).kind).toBe('forbidden');
    expect((await reject(404, {message: 'Not Found'})).kind).toBe('notfound');
    expect((await reject(502, 'bad gateway')).kind).toBe('server');
  });

  it('reports a network failure as such', async () => {
    const impl = (async () => {
      throw new TypeError('NetworkError when attempting to fetch resource.');
    }) as typeof fetch;
    const error = (await new GitHubClient('t', '', 'https://api.test', impl).getRepo(ref).catch((caught: unknown) => caught)) as GitHubError;
    expect(error.kind).toBe('network');
  });

  it('falls back to commit statuses when the token cannot read check runs', async () => {
    const {impl} = fakeFetch({
      '/repos/o/r/commits/abc/check-runs?per_page=100': {status: 403, body: {message: 'Resource not accessible by personal access token'}},
      '/repos/o/r/commits/abc/status': {body: {state: 'failure', statuses: [{context: 'ci', state: 'failure'}]}},
    });
    const ci = await new GitHubClient('t', '', 'https://api.test', impl).getCi(ref, 'abc');
    expect(ci).toEqual({state: 'failure', checks: [{name: 'ci', state: 'failure'}], checksReadable: false});
  });

  it('reads a pull request with its reviews', async () => {
    const {impl} = fakeFetch({
      '/repos/o/r/pulls/5': {body: {number: 5, title: 'P', state: 'open', user: {login: 'ana'}, head: {ref: 'f', sha: 's'}, base: {ref: 'main'}, body: 'B', additions: 2, deletions: 1, changed_files: 1, commits: 1, comments: 1, review_comments: 2}},
      '/repos/o/r/pulls/5/reviews?per_page=100': {body: [{user: {login: 'bob'}, state: 'APPROVED'}]},
    });
    const pull = await new GitHubClient('t', '', 'https://api.test', impl).getPull(ref, 5);
    expect(pull).toMatchObject({number: 5, body: 'B', comments: 3, reviews: [{author: 'bob', state: 'approved'}]});
  });
});
