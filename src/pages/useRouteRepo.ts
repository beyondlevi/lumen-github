import {useParams} from 'react-router-dom';
import type {RepoRef} from '../github/types';
import {useGitHub} from '../state/GitHubProvider';

/** The repository of the address (`/:owner/:repo/...`), if it is one of the settings. */
export function useRouteRepo(): RepoRef | null {
  const {owner = '', repo = ''} = useParams();
  const {repos} = useGitHub();
  const fullName = `${owner}/${repo}`.toLowerCase();
  return repos.find(entry => entry.ref.fullName.toLowerCase() === fullName)?.ref ?? null;
}
