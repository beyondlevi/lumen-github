import {describe, expect, it} from 'vitest';
import {MAX_REPOS, parseConfig, parseRepoList, parseRepoRef} from '../../src/config/lumenConfig';

const full = {'github.token': ' github_pat_abc ', 'github.repos': 'lumen-labs/hud-kit, maria-souza/dotfiles'};

describe('parseRepoRef', () => {
  it('takes owner/name and github.com addresses', () => {
    expect(parseRepoRef('octo-org/hello.world')).toEqual({owner: 'octo-org', name: 'hello.world', fullName: 'octo-org/hello.world'});
    expect(parseRepoRef('https://github.com/a/b')?.fullName).toBe('a/b');
    expect(parseRepoRef('github.com/a/b.git')?.fullName).toBe('a/b');
    expect(parseRepoRef('https://github.com/a/b/pull/3?x=1')?.fullName).toBe('a/b');
    expect(parseRepoRef('git@github.com:a/b.git')?.fullName).toBe('a/b');
  });

  it('refuses what is not a repository', () => {
    expect(parseRepoRef('just-a-name')).toBeNull();
    expect(parseRepoRef('a/..')).toBeNull();
    expect(parseRepoRef('a b/c')).toBeNull();
    expect(parseRepoRef('')).toBeNull();
  });
});

describe('parseRepoList', () => {
  it('splits on commas, spaces and new lines, dropping duplicates and invalid entries', () => {
    expect(parseRepoList('a/b, c/d\nA/B;  nope ,e/f').map(repo => repo.fullName)).toEqual(['a/b', 'c/d', 'e/f']);
  });

  it(`keeps at most ${MAX_REPOS}`, () => {
    const many = Array.from({length: 20}, (_, index) => `o/r${index}`).join(',');
    expect(parseRepoList(many)).toHaveLength(MAX_REPOS);
  });
});

describe('parseConfig', () => {
  it('lists the missing settings', () => {
    expect(parseConfig({})).toEqual({status: 'missing', missing: ['github.token', 'github.repos']});
    expect(parseConfig({'github.token': 'x', 'github.repos': 'not a repo'})).toEqual({status: 'missing', missing: ['github.repos']});
  });

  it('uses api.github.com with the token trimmed', () => {
    expect(parseConfig(full)).toEqual({
      status: 'ready',
      config: {
        token: 'github_pat_abc',
        repos: [
          {owner: 'lumen-labs', name: 'hud-kit', fullName: 'lumen-labs/hud-kit'},
          {owner: 'maria-souza', name: 'dotfiles', fullName: 'maria-souza/dotfiles'},
        ],
        apiBase: 'https://api.github.com',
      },
    });
  });

  it('points at a mock only over https or on this device', () => {
    expect(parseConfig({...full, 'github.api': 'http://127.0.0.1:8091/'})).toMatchObject({config: {apiBase: 'http://127.0.0.1:8091'}});
    expect(parseConfig({...full, 'github.api': 'http://example.com'})).toMatchObject({config: {apiBase: 'https://api.github.com'}});
  });

  it('turns demo mode on with any value but off words', () => {
    expect(parseConfig({demo: '1'})).toEqual({status: 'demo'});
    expect(parseConfig({...full, demo: 'off'}).status).toBe('ready');
    expect(parseConfig({}, true)).toEqual({status: 'demo'});
  });
});
