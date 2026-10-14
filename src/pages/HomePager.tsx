import {SubNavigationPager, type SubNavigationItem} from '@wearables-ui-toolkit/mrbd';
import {useMemo} from 'react';
import {icons} from '../components/icons';
import {t} from '../i18n/strings';
import {COMMITS_TAB, PULLS_TAB, REPOS_TAB, useGitHub} from '../state/GitHubProvider';
import {CommitsTab} from './CommitsTab';
import {PullsTab} from './PullsTab';
import {ReposTab} from './ReposTab';

/** The app's top level: Pull requests, Commits and Repositories as peer tabs. */
export function HomePager() {
  const {tab, setTab, status} = useGitHub();
  const loading = status.kind === 'loading' || status.kind === 'connecting';
  const items = useMemo<SubNavigationItem[]>(
    () => [
      {label: t('tabPulls'), icon: icons.pulls, isLoading: loading},
      {label: t('tabCommits'), icon: icons.commits, isLoading: loading},
      {label: t('tabRepos'), icon: icons.repos},
    ],
    [loading],
  );

  return (
    <SubNavigationPager items={items} currentPageIndex={tab} onPageChange={next => setTab(next)} useBackButtonForHome homeIndex={PULLS_TAB}>
      <PullsTab active={tab === PULLS_TAB} />
      <CommitsTab active={tab === COMMITS_TAB} />
      <ReposTab active={tab === REPOS_TAB} />
    </SubNavigationPager>
  );
}
