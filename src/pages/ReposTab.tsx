import {Container, IconImage, ScrollView, TextColor, TextStyle, TextView} from '@wearables-ui-toolkit/mrbd';
import {icons} from '../components/icons';
import {failureReason, useGitHub, type RepoEntry} from '../state/GitHubProvider';
import {t, tp} from '../i18n/strings';
import {formatCount, timeAgo} from '../time/format';

function repoDetail(entry: RepoEntry, now: Date): string {
  if (entry.error && !entry.repo) return t('repoUnavailable', {reason: failureReason(entry.error)});
  if (!entry.repo) return t('loadingLabel');
  const {repo} = entry;
  const parts = [repo.private ? t('private') : t('public'), tp('stars', repo.stars, {count: formatCount(repo.stars)})];
  if (repo.pushedAt) parts.push(t('pushedAgo', {time: timeAgo(repo.pushedAt, now)}));
  return parts.reduce((first, second) => t('pair', {first, second}));
}

/** The repositories of the settings; Enter shows one in the other tabs. */
export function ReposTab({active: _active}: {active: boolean}) {
  const {repos, selected, select, current} = useGitHub();
  return (
    <ScrollView insetForHeader ariaLabel={t('reposLabel')}>
      <div className="list-inset">
        {repos.map(entry => {
          const isSelected = selected?.fullName === entry.ref.fullName;
          const detail = repoDetail(entry, current);
          const description = entry.repo?.description;
          return (
            <Container
              key={entry.ref.fullName}
              width="100%"
              onClick={() => select(entry.ref)}
              initialFocusEligible={isSelected}
              aria-label={t(isSelected ? 'repoLabelSelected' : 'repoLabel', {repo: entry.ref.fullName, detail})}
              aria-current={isSelected ? 'true' : undefined}
              data-repo={entry.ref.fullName}
            >
              <div className="list-row" aria-hidden="true">
                <IconImage source={isSelected ? icons.selected : entry.repo?.private ? icons.lock : icons.repos} className="list-row-icon" />
                <div className="list-row-main">
                  <TextView textStyle={TextStyle.BODY2} className="list-row-title">
                    {entry.ref.fullName}
                  </TextView>
                  {description ? (
                    <TextView textStyle={TextStyle.LABEL} textColor={TextColor.SECONDARY} className="list-row-detail">
                      {description}
                    </TextView>
                  ) : null}
                  <TextView textStyle={TextStyle.META2} textColor={TextColor.SECONDARY} className="list-row-detail">
                    {detail}
                  </TextView>
                </div>
              </div>
            </Container>
          );
        })}
      </div>
    </ScrollView>
  );
}
