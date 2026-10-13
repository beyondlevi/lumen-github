import {ScrollView} from '@wearables-ui-toolkit/mrbd';
import {CommitRow} from '../components/Rows';
import {ErrorContent, LoadingContent, StateContent} from '../components/StateContent';
import {t} from '../i18n/strings';
import {useGitHub} from '../state/GitHubProvider';
import {ListHeading} from './ListHeading';

/** The latest commits on the repository's default branch. */
export function CommitsTab({active: _active}: {active: boolean}) {
  const {status, commits, selected, repo, current, retry} = useGitHub();
  if (status.kind === 'error') return <ErrorContent error={status.error} onRetry={retry} />;
  if (status.kind !== 'ready' || !selected) {
    return <LoadingContent label={status.kind === 'connecting' ? t('connecting') : t('loadingLabel')} />;
  }
  const name = repo?.fullName ?? selected.fullName;
  const branch = repo?.defaultBranch ?? 'main';
  if (commits.length === 0) {
    return <StateContent title={t('emptyCommitsTitle')} body={t('emptyCommitsBody', {repo: name, branch})} ariaLabel={t('emptyLabel')} />;
  }
  return (
    <ScrollView insetForHeader ariaLabel={t('commitsLabel', {repo: name})}>
      <div className="list-inset">
        <ListHeading text={t('pair', {first: name, second: t('onBranch', {branch})})} />
        {commits.map((commit, index) => (
          <CommitRow key={commit.sha} repo={selected} commit={commit} now={current} initialFocus={index === 0} />
        ))}
      </div>
    </ScrollView>
  );
}
