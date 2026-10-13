// Turns src/demo/fixtures.json into GitHub REST responses around a given time.
// Shared by the demo backend (src/demo/demoBackend.ts) and the mock server
// (mock/server.mjs), so both serve the same data in the same shape as GitHub.

/** A stable fake 40-character SHA from a fixture id. */
export function fakeSha(seed) {
  let hex = '';
  let state = 2166136261;
  for (let round = 0; hex.length < 40; round += 1) {
    for (const char of `${seed}:${round}`) {
      state ^= char.charCodeAt(0);
      state = Math.imul(state, 16777619) >>> 0;
    }
    hex += state.toString(16).padStart(8, '0');
  }
  return hex.slice(0, 40);
}

const user = login => ({login, type: login.endsWith('[bot]') ? 'Bot' : 'User'});

/** @returns {Record<string, object>} keyed by the lower-case `owner/name`. */
export function buildGitHub(fixtures, now = new Date()) {
  const at = minutesAgo => new Date(now.getTime() - minutesAgo * 60_000).toISOString();
  const result = {};
  for (const repo of fixtures.repos) {
    const shaOf = id => fakeSha(`${repo.full_name}/${id}`);
    const commits = repo.commits.map(commit => {
      const sha = shaOf(commit.id);
      const files = commit.files.map(([filename, status, additions, deletions]) => ({filename, status, additions, deletions, changes: additions + deletions}));
      const additions = files.reduce((sum, file) => sum + file.additions, 0);
      const deletions = files.reduce((sum, file) => sum + file.deletions, 0);
      const author = {name: commit.login.replace(/\[bot\]$/, ''), email: `${commit.login}@users.noreply.github.com`, date: at(commit.ago)};
      const summary = {sha, commit: {message: commit.message, author, committer: author}, author: user(commit.login), html_url: `https://github.com/${repo.full_name}/commit/${sha}`};
      return {summary, detail: {...summary, stats: {additions, deletions, total: additions + deletions}, files}, ci: commit.ci};
    });
    const checkRuns = {};
    const statuses = {};
    for (const {summary, ci} of commits) {
      const runs = ci == null ? [] : [{name: 'build', status: ci === 'pending' ? 'in_progress' : 'completed', conclusion: ci === 'pending' ? null : ci}];
      checkRuns[summary.sha] = {total_count: runs.length, check_runs: runs};
      statuses[summary.sha] = {state: 'pending', total_count: 0, statuses: []};
    }
    const pulls = repo.pulls.map(pull => {
      const sha = shaOf(`pull-${pull.number}`);
      const merged = pull.merged === true;
      const summary = {
        number: pull.number,
        title: pull.title,
        state: pull.state,
        draft: pull.draft === true,
        user: user(pull.login),
        head: {ref: pull.head, sha},
        base: {ref: pull.base},
        created_at: at(pull.created),
        updated_at: at(pull.updated),
        closed_at: pull.state === 'closed' ? at(pull.updated) : null,
        merged_at: merged ? at(pull.updated) : null,
        html_url: `https://github.com/${repo.full_name}/pull/${pull.number}`,
      };
      const detail = {
        ...summary,
        body: pull.body,
        merged,
        additions: pull.additions,
        deletions: pull.deletions,
        changed_files: pull.changed_files,
        commits: pull.commits,
        comments: pull.comments,
        review_comments: 0,
      };
      const reviews = pull.reviews.map(([login, state], index) => ({id: index + 1, user: user(login), state, submitted_at: at(pull.updated + 5)}));
      const runs = pull.checks.map(([name, status, conclusion]) => ({name, status, conclusion}));
      checkRuns[sha] = {total_count: runs.length, check_runs: runs};
      const list = pull.statuses.map(([context, state]) => ({context, state}));
      statuses[sha] = {state: list.some(entry => entry.state !== 'success') ? 'pending' : list.length ? 'success' : 'pending', total_count: list.length, statuses: list};
      return {summary, detail, reviews};
    });
    result[repo.full_name.toLowerCase()] = {
      repo: {
        full_name: repo.full_name,
        name: repo.full_name.split('/')[1],
        owner: {login: repo.full_name.split('/')[0]},
        description: repo.description,
        default_branch: repo.default_branch,
        private: repo.private,
        stargazers_count: repo.stars,
        pushed_at: at(repo.pushed),
      },
      commits: commits.map(commit => commit.summary),
      commitDetails: Object.fromEntries(commits.map(commit => [commit.summary.sha, commit.detail])),
      pulls: pulls.map(pull => pull.summary),
      pullDetails: Object.fromEntries(pulls.map(pull => [String(pull.summary.number), pull.detail])),
      reviews: Object.fromEntries(pulls.map(pull => [String(pull.summary.number), pull.reviews])),
      checkRuns,
      statuses,
    };
  }
  return result;
}
