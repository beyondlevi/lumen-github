import {ScrollView} from '@wearables-ui-toolkit/mrbd';
import {PullRow} from '../components/Rows';
import {ErrorContent, LoadingContent, StateContent} from '../components/StateContent';
import {t} from '../i18n/strings';
import {REPOS_TAB, useGitHub} from '../state/GitHubProvider';
import {ListHeading} from './ListHeading';

/** The repository's latest pull requests, open and closed, the most recently updated first. */
export function PullsTab({active: _active}: {active: boolean}) {
  const {status, pulls, selected, repo, current, retry, setTab} = useGitHub();
  if (status.kind === 'error') return <ErrorContent error={status.error} onRetry={retry} />;
  if (status.kind !== 'ready' || !selected) {
    return <LoadingContent label={status.kind === 'connecting' ? t('connecting') : t('loadingLabel')} />;
  }
  const name = repo?.fullName ?? selected.fullName;
  if (pulls.length === 0) {
    return (
      <StateContent
        title={t('emptyPullsTitle')}
        body={t('emptyPullsBody', {repo: name})}
        action={{label: t('tabRepos'), onClick: () => setTab(REPOS_TAB)}}
        ariaLabel={t('emptyLabel')}
      />
    );
  }
  return (
    <ScrollView insetForHeader ariaLabel={t('pullsLabel', {repo: name})}>
      <div className="list-inset">
        <ListHeading text={name} />
        {pulls.map((pull, index) => (
          <PullRow key={pull.number} repo={selected} pull={pull} now={current} initialFocus={index === 0} />
        ))}
      </div>
    </ScrollView>
  );
}
