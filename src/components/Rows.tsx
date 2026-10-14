import {Container, IconImage, TextColor, TextStyle, TextView} from '@wearables-ui-toolkit/mrbd';
import {useNavigate} from 'react-router-dom';
import type {Commit, Pull, RepoRef} from '../github/types';
import {t} from '../i18n/strings';
import {commitPath, pullPath} from '../paths';
import {shortSha, timeAgo} from '../time/format';
import {PULL_STATE_ICON} from './icons';

export function pullStateText(state: Pull['state']): string {
  return t(state === 'open' ? 'stateOpen' : state === 'draft' ? 'stateDraft' : state === 'merged' ? 'stateMerged' : 'stateClosed');
}

/** "ana-lima · 12 minutes ago" */
export function pullDetail(pull: Pull, now: Date): string {
  return t('pair', {first: pull.author, second: timeAgo(pull.updatedAt, now)});
}

type RowProps = {initialFocus?: boolean};

/** One pull request: its state as an icon, "#216 Title", then the author and when it last changed. */
export function PullRow({repo, pull, now, initialFocus = false}: RowProps & {repo: RepoRef; pull: Pull; now: Date}) {
  const navigate = useNavigate();
  const closed = pull.state === 'merged' || pull.state === 'closed';
  const detail = pullDetail(pull, now);
  const state = pullStateText(pull.state);
  return (
    <Container
      width="100%"
      onClick={() => navigate(pullPath(repo, pull.number))}
      initialFocusEligible={initialFocus}
      aria-label={t('pullLabel', {number: pull.number, title: pull.title, state, detail})}
      data-pull={pull.number}
    >
      <div className="list-row" aria-hidden="true">
        <IconImage source={PULL_STATE_ICON[pull.state]} className="list-row-icon" />
        <div className="list-row-main">
          <div className="list-row-heading">
            <TextView textStyle={TextStyle.LABEL} textColor={TextColor.SECONDARY} className="list-row-number">
              {t('pullNumber', {number: pull.number})}
            </TextView>
            <TextView textStyle={TextStyle.BODY2} textColor={closed ? TextColor.SECONDARY : TextColor.PRIMARY} className="list-row-title">
              {pull.title}
            </TextView>
          </div>
          <TextView textStyle={TextStyle.LABEL} textColor={TextColor.SECONDARY} className="list-row-detail">
            {t('pair', {first: state, second: detail})}
          </TextView>
        </div>
      </div>
    </Container>
  );
}

/** "ana-lima · 18 minutes ago · 3f2a91c" */
export function commitDetail(commit: Commit, now: Date): string {
  return t('pair', {first: t('pair', {first: commit.author, second: timeAgo(commit.date, now)}), second: shortSha(commit.sha)});
}

/** One commit: the first line of its message, then the author, when and the short SHA. */
export function CommitRow({repo, commit, now, initialFocus = false}: RowProps & {repo: RepoRef; commit: Commit; now: Date}) {
  const navigate = useNavigate();
  const detail = commitDetail(commit, now);
  return (
    <Container
      width="100%"
      onClick={() => navigate(commitPath(repo, commit.sha))}
      initialFocusEligible={initialFocus}
      aria-label={t('commitLabel', {title: commit.title, detail})}
      data-commit={commit.sha}
    >
      <div className="list-row list-row--plain" aria-hidden="true">
        <div className="list-row-main">
          <TextView textStyle={TextStyle.BODY2} className="list-row-title list-row-title--wrap">
            {commit.title}
          </TextView>
          <TextView textStyle={TextStyle.LABEL} textColor={TextColor.SECONDARY} className="list-row-detail">
            {detail}
          </TextView>
        </div>
      </div>
    </Container>
  );
}
