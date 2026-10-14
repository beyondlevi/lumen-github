import {IconImage, Page, ScrollView, TextColor, TextStyle, TextView} from '@wearables-ui-toolkit/mrbd';
import {useRef} from 'react';
import {useParams} from 'react-router-dom';
import {CheckList, CiSummaryLine} from '../components/CiStatus';
import {PULL_STATE_ICON, icons} from '../components/icons';
import {pullStateText} from '../components/Rows';
import {ErrorContent, LoadingContent, StateContent} from '../components/StateContent';
import {markdownToText} from '../github/mapping';
import type {PullDetail, Review, ReviewState} from '../github/types';
import {t, tp, type StringKey} from '../i18n/strings';
import {useGitHub} from '../state/GitHubProvider';
import {useDetailScroll} from '../state/useDetailScroll';
import {useRemote} from '../state/useRemote';
import {timeAgo} from '../time/format';
import {useRouteRepo} from './useRouteRepo';

const REVIEW_TEXT: Record<ReviewState, StringKey> = {approved: 'reviewApproved', changes: 'reviewChanges', commented: 'reviewCommented'};

function who(pull: PullDetail, now: Date): string {
  if (pull.state === 'merged' || pull.state === 'closed') return t('pair', {first: pull.author, second: timeAgo(pull.updatedAt, now)});
  return t('openedBy', {author: pull.author, time: timeAgo(pull.createdAt, now)});
}

function stats(pull: PullDetail): string {
  return [t('changeStats', {additions: pull.additions, deletions: pull.deletions}), tp('files', pull.changedFiles), tp('commitsCount', pull.commits)].reduce(
    (first, second) => t('pair', {first, second}),
  );
}

function ReviewList({reviews}: {reviews: Review[]}) {
  return (
    <section className="detail-section" aria-label={t('reviewsHeading')}>
      <TextView as="h2" textStyle={TextStyle.LABEL_EMPHASIZED} textColor={TextColor.SECONDARY}>
        {t('reviewsHeading')}
      </TextView>
      {reviews.length === 0 ? (
        <TextView as="p" textStyle={TextStyle.LABEL} textColor={TextColor.SECONDARY}>
          {t('reviewsNone')}
        </TextView>
      ) : (
        <ul className="detail-list">
          {reviews.map(review => (
            <li key={review.author} className="detail-list-row">
              <IconImage source={review.state === 'approved' ? icons.selected : review.state === 'changes' ? icons.failure : icons.comments} className="fact-icon" />
              <TextView textStyle={TextStyle.LABEL}>{t('reviewLine', {author: review.author, state: t(REVIEW_TEXT[review.state])})}</TextView>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * One pull request: state, author, branches, size, the checks of its head
 * commit, the reviews and the description. Down scrolls it to the end.
 */
export function PullPage() {
  const {number: rawNumber = ''} = useParams();
  const number = Number(rawNumber);
  const {backend, current} = useGitHub();
  const ref = useRouteRepo();
  const valid = ref != null && Number.isInteger(number) && number > 0;
  const {state: pull, reload} = useRemote(valid ? `pull:${ref.fullName}#${number}` : null, () => backend!.getPull(ref!, number));
  const headSha = pull.kind === 'ready' ? pull.value.headSha : null;
  const {state: ci} = useRemote(valid && headSha ? `ci:${ref.fullName}@${headSha}` : null, () => backend!.getCi(ref!, headSha!));
  const shellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useDetailScroll(contentRef, shellRef, null);

  const header = t('pullNumber', {number: rawNumber});
  if (!valid || pull.kind !== 'ready') {
    return (
      <Page headerText={header} headerMetadata={ref?.fullName} headerIsLoading={valid && pull.kind === 'loading'} enableSystemBarInset={false}>
        {!valid ? (
          <StateContent title={t('pullMissingTitle')} body={t('missingBody')} role="alert" ariaLabel={t('pullMissingTitle')} />
        ) : pull.kind === 'error' ? (
          <ErrorContent error={pull.error} onRetry={reload} />
        ) : (
          <LoadingContent />
        )}
      </Page>
    );
  }

  const value = pull.value;
  const body = markdownToText(value.body);
  return (
    <Page headerText={header} headerMetadata={ref.fullName} enableSystemBarInset={false}>
      <div className="detail-shell" ref={shellRef}>
        <ScrollView insetForHeader tabIndex={0} ariaLabel={t('pullDetailsLabel')}>
          <div className="content-inset" ref={contentRef}>
            <TextView as="h1" textStyle={TextStyle.BODY1_EMPHASIZED} className="detail-title">
              {value.title}
            </TextView>
            <div className="fact-row" data-state={value.state}>
              <IconImage source={PULL_STATE_ICON[value.state]} className="fact-icon" />
              <TextView textStyle={TextStyle.BODY2}>{t('pair', {first: pullStateText(value.state), second: who(value, current)})}</TextView>
            </div>
            <div className="fact-row">
              <IconImage source={icons.branch} className="fact-icon" />
              <TextView textStyle={TextStyle.LABEL} className="detail-branches">
                {t('branches', {head: value.headRef, base: value.baseRef})}
              </TextView>
            </div>
            <div className="fact-row">
              <IconImage source={icons.files} className="fact-icon" />
              <TextView textStyle={TextStyle.LABEL}>{stats(value)}</TextView>
            </div>
            <CiSummaryLine ci={ci} />
            <ReviewList reviews={value.reviews} />
            <TextView as="p" textStyle={TextStyle.LABEL} textColor={TextColor.SECONDARY} className="detail-body">
              {body || t('noDescription')}
            </TextView>
            {value.comments > 0 ? (
              <TextView as="p" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
                {tp('comments', value.comments)}
              </TextView>
            ) : null}
            {ci.kind === 'ready' ? <CheckList ci={ci.value} /> : null}
          </div>
        </ScrollView>
      </div>
    </Page>
  );
}
