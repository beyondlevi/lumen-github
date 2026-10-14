import {IconImage, Page, ScrollView, TextColor, TextStyle, TextView} from '@wearables-ui-toolkit/mrbd';
import {useRef} from 'react';
import {useParams} from 'react-router-dom';
import {CheckList, CiSummaryLine} from '../components/CiStatus';
import {icons} from '../components/icons';
import {ErrorContent, LoadingContent, StateContent} from '../components/StateContent';
import type {FileChange} from '../github/types';
import {t, tp, type StringKey} from '../i18n/strings';
import {useGitHub} from '../state/GitHubProvider';
import {useDetailScroll} from '../state/useDetailScroll';
import {useRemote} from '../state/useRemote';
import {dateTime, shortSha, timeAgo} from '../time/format';
import {useRouteRepo} from './useRouteRepo';

const FILE_STATUS: Partial<Record<FileChange['status'], StringKey>> = {added: 'fileAdded', removed: 'fileRemoved', renamed: 'fileRenamed'};

function fileDetail(file: FileChange): string {
  const change = t('changeStats', {additions: file.additions, deletions: file.deletions});
  const status = FILE_STATUS[file.status];
  return status ? t('pair', {first: t(status), second: change}) : change;
}

/** One commit: its whole message, author and time, size, checks and changed files. */
export function CommitPage() {
  const {sha = ''} = useParams();
  const {backend, current} = useGitHub();
  const ref = useRouteRepo();
  const valid = ref != null && /^[0-9a-f]{4,64}$/i.test(sha);
  const {state: commit, reload} = useRemote(valid ? `commit:${ref.fullName}@${sha}` : null, () => backend!.getCommit(ref!, sha));
  const {state: ci} = useRemote(valid ? `ci:${ref.fullName}@${sha}` : null, () => backend!.getCi(ref!, sha));
  const shellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useDetailScroll(contentRef, shellRef, null);

  const header = shortSha(sha);
  if (!valid || commit.kind !== 'ready') {
    return (
      <Page headerText={header} headerMetadata={ref?.fullName} headerIsLoading={valid && commit.kind === 'loading'} enableSystemBarInset={false}>
        {!valid ? (
          <StateContent title={t('commitMissingTitle')} body={t('missingBody')} role="alert" ariaLabel={t('commitMissingTitle')} />
        ) : commit.kind === 'error' ? (
          <ErrorContent error={commit.error} onRetry={reload} />
        ) : (
          <LoadingContent />
        )}
      </Page>
    );
  }

  const value = commit.value;
  return (
    <Page headerText={header} headerMetadata={ref.fullName} enableSystemBarInset={false}>
      <div className="detail-shell" ref={shellRef}>
        <ScrollView insetForHeader tabIndex={0} ariaLabel={t('commitDetailsLabel')}>
          <div className="content-inset" ref={contentRef}>
            <TextView as="h1" textStyle={TextStyle.BODY1_EMPHASIZED} className="detail-title">
              {value.title}
            </TextView>
            <div className="detail-when">
              <TextView as="p" textStyle={TextStyle.BODY2}>
                {t('committedBy', {author: value.author, time: timeAgo(value.date, current)})}
              </TextView>
              <TextView as="p" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
                {dateTime(value.date)}
              </TextView>
            </div>
            <div className="fact-row">
              <IconImage source={icons.files} className="fact-icon" />
              <TextView textStyle={TextStyle.LABEL}>
                {t('pair', {first: t('changeStats', {additions: value.additions, deletions: value.deletions}), second: tp('files', value.files.length)})}
              </TextView>
            </div>
            <CiSummaryLine ci={ci} />
            {value.body ? (
              <TextView as="p" textStyle={TextStyle.LABEL} textColor={TextColor.SECONDARY} className="detail-body">
                {value.body}
              </TextView>
            ) : null}
            {value.files.length > 0 ? (
              <section className="detail-section" aria-label={t('filesHeading')}>
                <TextView as="h2" textStyle={TextStyle.LABEL_EMPHASIZED} textColor={TextColor.SECONDARY}>
                  {t('filesHeading')}
                </TextView>
                <ul className="detail-list">
                  {value.files.map(file => (
                    <li key={file.path} className="file-row">
                      <TextView textStyle={TextStyle.LABEL} className="file-path">
                        {file.path}
                      </TextView>
                      <TextView textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
                        {fileDetail(file)}
                      </TextView>
                    </li>
                  ))}
                </ul>
                {value.filesTruncated ? (
                  <TextView as="p" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
                    {t('filesMore', {count: value.files.length})}
                  </TextView>
                ) : null}
              </section>
            ) : null}
            {ci.kind === 'ready' ? <CheckList ci={ci.value} /> : null}
          </div>
        </ScrollView>
      </div>
    </Page>
  );
}
