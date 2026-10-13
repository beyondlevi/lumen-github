import {IconImage, TextColor, TextStyle, TextView} from '@wearables-ui-toolkit/mrbd';
import type {CheckState, CiSummary} from '../github/types';
import {t, tp, type StringKey} from '../i18n/strings';
import type {Remote} from '../state/useRemote';
import {CHECK_ICON, CI_ICON} from './icons';

export function ciText(ci: CiSummary): string {
  const failed = ci.checks.filter(check => check.state === 'failure').length;
  const running = ci.checks.filter(check => check.state === 'pending').length;
  switch (ci.state) {
    case 'success':
      return t('ciSuccess');
    case 'failure':
      return tp('ciFailure', failed);
    case 'pending':
      return tp('ciPending', running);
    default:
      return t('ciNone');
  }
}

const CHECK_TEXT: Record<CheckState, StringKey> = {
  success: 'checkSuccess',
  failure: 'checkFailure',
  pending: 'checkPending',
  skipped: 'checkSkipped',
};

/** The one-line summary of a commit's checks, with its shape icon. */
export function CiSummaryLine({ci}: {ci: Remote<CiSummary>}) {
  const text = ci.kind === 'loading' ? t('ciLoading') : ci.kind === 'error' ? t('ciUnavailable') : ciText(ci.value);
  const icon = ci.kind === 'ready' ? CI_ICON[ci.value.state] : CI_ICON.none;
  return (
    <div className="fact-row" data-ci={ci.kind === 'ready' ? ci.value.state : ci.kind}>
      <IconImage source={icon} className="fact-icon" />
      <TextView textStyle={TextStyle.BODY2}>{text}</TextView>
    </div>
  );
}

/** Every check by name, failures first. */
export function CheckList({ci}: {ci: CiSummary}) {
  if (ci.checks.length === 0 && ci.checksReadable) return null;
  return (
    <section className="detail-section" aria-label={t('ciHeading')}>
      <TextView as="h2" textStyle={TextStyle.LABEL_EMPHASIZED} textColor={TextColor.SECONDARY}>
        {t('ciHeading')}
      </TextView>
      <ul className="detail-list">
        {ci.checks.map(check => (
          <li key={check.name} className="detail-list-row" aria-label={t('checkLine', {name: check.name, state: t(CHECK_TEXT[check.state])})}>
            <IconImage source={CHECK_ICON[check.state]} className="fact-icon" />
            <TextView textStyle={TextStyle.LABEL}>{check.name}</TextView>
          </li>
        ))}
      </ul>
      {!ci.checksReadable ? (
        <TextView as="p" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
          {t('ciNoChecksPermission')}
        </TextView>
      ) : null}
    </section>
  );
}
