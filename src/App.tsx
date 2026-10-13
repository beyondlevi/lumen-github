import {App} from '@wearables-ui-toolkit/mrbd';
import {ReactRouterNavigationProvider, ReactRouterPageTransition} from '@wearables-ui-toolkit/mrbd/react-router';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {CommitPage} from './pages/CommitPage';
import {HomePager} from './pages/HomePager';
import {LoadingPage} from './pages/LoadingPage';
import {PullPage} from './pages/PullPage';
import {SetupPage} from './pages/SetupPage';
import {useGitHub} from './state/GitHubProvider';

// Back (Escape) is handled by ReactRouterNavigationProvider: a pull request or
// a commit goes back to the pager; on the pager, Commits or Repositories go to
// Pull requests, and Pull requests leaves it to the platform, which closes the app.
export default function GitHubApp() {
  const {phase} = useGitHub();
  return (
    <BrowserRouter>
      <ReactRouterNavigationProvider>
        <App>
          {phase.kind === 'loading' ? (
            <LoadingPage />
          ) : phase.kind === 'setup' ? (
            <SetupPage reason={phase.reason} missing={phase.missing} />
          ) : (
            <ReactRouterPageTransition>
              {({location}) => (
                <Routes location={location}>
                  <Route path="/" element={<HomePager />} />
                  <Route path="/:owner/:repo/pull/:number" element={<PullPage />} />
                  <Route path="/:owner/:repo/commit/:sha" element={<CommitPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              )}
            </ReactRouterPageTransition>
          )}
        </App>
      </ReactRouterNavigationProvider>
    </BrowserRouter>
  );
}
