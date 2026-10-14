// Every user-facing string lives in this file. English is the default and the
// fallback; Portuguese (pt-BR copy) is chosen for any `pt-*` language. Counted
// strings have `_one` and `_other` forms; dates and times go through Intl
// (src/time/format.ts).

const en = {
  appName: 'GitHub',

  tabPulls: 'Pull requests',
  tabCommits: 'Commits',
  tabRepos: 'Repositories',
  pullsLabel: 'Pull requests of {repo}',
  commitsLabel: 'Commits of {repo}',
  reposLabel: 'Your repositories',

  noTitle: '(No title)',
  pair: '{first} · {second}',
  justNow: 'just now',
  pullNumber: '#{number}',
  pullLabel: '#{number} {title}, {state}, {detail}',
  commitLabel: '{title}, {detail}',
  repoLabel: '{repo}, {detail}',
  repoLabelSelected: '{repo}, {detail}, shown',
  onBranch: 'on {branch}',

  stateOpen: 'Open',
  stateDraft: 'Draft',
  stateMerged: 'Merged',
  stateClosed: 'Closed',
  private: 'Private',
  public: 'Public',
  stars_one: '{count} star',
  stars_other: '{count} stars',
  pushedAgo: 'pushed {time}',
  repoUnavailable: "Can't open: {reason}",

  emptyPullsTitle: 'No pull requests',
  emptyPullsBody: '{repo} has no pull requests.',
  emptyCommitsTitle: 'No commits',
  emptyCommitsBody: '{repo} has no commits on {branch}.',
  emptyLabel: 'Nothing to show',

  loadingHeader: 'Loading…',
  loadingLabel: 'Loading',
  connecting: 'Connecting…',
  retry: 'Try again',
  errorLabel: 'Error',
  errNetworkTitle: "Can't reach GitHub",
  errNetworkBody: 'Check the internet connection and try again.',
  errServerTitle: 'GitHub is not answering',
  errServerBody: 'Try again in a moment.',
  errRateTitle: 'Too many requests',
  errRateBody: 'GitHub asked the app to slow down. Try again in a few minutes.',
  errRateUntil: 'GitHub asked the app to slow down until {time}.',
  errForbiddenTitle: 'Not allowed',
  errForbiddenBody: "The token can't read this repository. Give it access on GitHub, or pick another repository.",
  errNotFoundTitle: 'Not found',
  errNotFoundBody: "GitHub can't find this repository, or the token has no access to it. Check the name in the companion.",
  httpStatus: 'HTTP {status}',
  reasonNetwork: 'no connection',
  reasonAuth: 'token refused',
  reasonForbidden: 'no access',
  reasonNotFound: 'not found or no access',
  reasonRate: 'too many requests',
  reasonServer: 'GitHub error',

  pullDetailsLabel: 'Pull request details',
  commitDetailsLabel: 'Commit details',
  pullMissingTitle: 'Pull request not found',
  commitMissingTitle: 'Commit not found',
  missingBody: 'It may be in a repository that is no longer in your list.',
  openedBy: '{author} opened {time}',
  branches: '{head} into {base}',
  changeStats: '+{additions} −{deletions}',
  files_one: '{count} file',
  files_other: '{count} files',
  commitsCount_one: '{count} commit',
  commitsCount_other: '{count} commits',
  comments_one: '{count} comment',
  comments_other: '{count} comments',
  noDescription: 'No description.',
  committedBy: '{author} · {time}',
  filesHeading: 'Files',
  filesMore: 'GitHub lists the first {count} files only.',
  fileAdded: 'added',
  fileRemoved: 'removed',
  fileRenamed: 'renamed',

  reviewsHeading: 'Reviews',
  reviewApproved: 'Approved',
  reviewChanges: 'Changes requested',
  reviewCommented: 'Commented',
  reviewsNone: 'No reviews yet',
  reviewLine: '{author}: {state}',

  ciHeading: 'Checks',
  ciSuccess: 'All checks passed',
  ciFailure_one: '{count} check failed',
  ciFailure_other: '{count} checks failed',
  ciPending_one: '{count} check running',
  ciPending_other: '{count} checks running',
  ciNone: 'No checks',
  ciLoading: 'Loading checks…',
  ciUnavailable: "Couldn't load the checks",
  ciNoChecksPermission: "This token can't read check runs (fine-grained tokens may not); commit statuses only. A classic token with the repo scope reads both.",
  checkSuccess: 'passed',
  checkFailure: 'failed',
  checkPending: 'running',
  checkSkipped: 'skipped',
  checkLine: '{name}: {state}',

  setupLabel: 'Connect GitHub',
  setupTitle: 'Connect GitHub',
  setupStepsLabel: 'How to connect',
  setupStep1: 'On github.com, create a personal access token that can read your repositories.',
  setupStep2: 'On the phone, open Lumen > Apps > GitHub.',
  setupStep3: 'Paste the token and list the repositories, as owner/name.',
  setupNote: 'The steps are in the README of lumen-github.',
  setupRefused: 'GitHub refused the token: it may have expired or been revoked. Paste a new one on the phone.',
  setupMissingRepos: 'List at least one repository, as owner/name, separated by commas.',
  stillNotConnected: 'Still not connected',
  showingRepo: 'Showing {repo}',
};

export type StringKey = keyof typeof en;
type Strings = Record<StringKey, string>;

const pt: Strings = {
  appName: 'GitHub',

  tabPulls: 'Pull requests',
  tabCommits: 'Commits',
  tabRepos: 'Repositórios',
  pullsLabel: 'Pull requests de {repo}',
  commitsLabel: 'Commits de {repo}',
  reposLabel: 'Seus repositórios',

  noTitle: '(Sem título)',
  pair: '{first} · {second}',
  justNow: 'agora',
  pullNumber: '#{number}',
  pullLabel: '#{number} {title}, {state}, {detail}',
  commitLabel: '{title}, {detail}',
  repoLabel: '{repo}, {detail}',
  repoLabelSelected: '{repo}, {detail}, exibido',
  onBranch: 'em {branch}',

  stateOpen: 'Aberto',
  stateDraft: 'Rascunho',
  stateMerged: 'Mesclado',
  stateClosed: 'Fechado',
  private: 'Privado',
  public: 'Público',
  stars_one: '{count} estrela',
  stars_other: '{count} estrelas',
  pushedAgo: 'push {time}',
  repoUnavailable: 'Não abriu: {reason}',

  emptyPullsTitle: 'Nenhum pull request',
  emptyPullsBody: '{repo} não tem pull requests.',
  emptyCommitsTitle: 'Nenhum commit',
  emptyCommitsBody: '{repo} não tem commits em {branch}.',
  emptyLabel: 'Nada para mostrar',

  loadingHeader: 'Carregando…',
  loadingLabel: 'Carregando',
  connecting: 'Conectando…',
  retry: 'Tentar de novo',
  errorLabel: 'Erro',
  errNetworkTitle: 'Sem acesso ao GitHub',
  errNetworkBody: 'Confira a conexão com a internet e tente de novo.',
  errServerTitle: 'O GitHub não está respondendo',
  errServerBody: 'Tente de novo daqui a pouco.',
  errRateTitle: 'Pedidos demais',
  errRateBody: 'O GitHub pediu para o app esperar. Tente de novo em alguns minutos.',
  errRateUntil: 'O GitHub pediu para o app esperar até {time}.',
  errForbiddenTitle: 'Sem permissão',
  errForbiddenBody: 'O token não pode ler este repositório. Dê acesso a ele no GitHub ou escolha outro repositório.',
  errNotFoundTitle: 'Não encontrado',
  errNotFoundBody: 'O GitHub não achou este repositório, ou o token não tem acesso a ele. Confira o nome no companion.',
  httpStatus: 'HTTP {status}',
  reasonNetwork: 'sem conexão',
  reasonAuth: 'token recusado',
  reasonForbidden: 'sem acesso',
  reasonNotFound: 'não encontrado ou sem acesso',
  reasonRate: 'pedidos demais',
  reasonServer: 'erro no GitHub',

  pullDetailsLabel: 'Detalhes do pull request',
  commitDetailsLabel: 'Detalhes do commit',
  pullMissingTitle: 'Pull request não encontrado',
  commitMissingTitle: 'Commit não encontrado',
  missingBody: 'Ele pode ser de um repositório que saiu da sua lista.',
  openedBy: '{author} abriu {time}',
  branches: '{head} em {base}',
  changeStats: '+{additions} −{deletions}',
  files_one: '{count} arquivo',
  files_other: '{count} arquivos',
  commitsCount_one: '{count} commit',
  commitsCount_other: '{count} commits',
  comments_one: '{count} comentário',
  comments_other: '{count} comentários',
  noDescription: 'Sem descrição.',
  committedBy: '{author} · {time}',
  filesHeading: 'Arquivos',
  filesMore: 'O GitHub lista só os primeiros {count} arquivos.',
  fileAdded: 'novo',
  fileRemoved: 'removido',
  fileRenamed: 'renomeado',

  reviewsHeading: 'Revisões',
  reviewApproved: 'Aprovou',
  reviewChanges: 'Pediu mudanças',
  reviewCommented: 'Comentou',
  reviewsNone: 'Nenhuma revisão ainda',
  reviewLine: '{author}: {state}',

  ciHeading: 'Checks',
  ciSuccess: 'Todos os checks passaram',
  ciFailure_one: '{count} check falhou',
  ciFailure_other: '{count} checks falharam',
  ciPending_one: '{count} check rodando',
  ciPending_other: '{count} checks rodando',
  ciNone: 'Sem checks',
  ciLoading: 'Carregando checks…',
  ciUnavailable: 'Não deu para carregar os checks',
  ciNoChecksPermission: 'Este token não lê check runs (tokens fine-grained podem não ler); só os status de commit. Um token clássico com o escopo repo lê os dois.',
  checkSuccess: 'passou',
  checkFailure: 'falhou',
  checkPending: 'rodando',
  checkSkipped: 'pulado',
  checkLine: '{name}: {state}',

  setupLabel: 'Conectar o GitHub',
  setupTitle: 'Conectar o GitHub',
  setupStepsLabel: 'Como conectar',
  setupStep1: 'No github.com, crie um token de acesso pessoal que leia seus repositórios.',
  setupStep2: 'No celular, abra Lumen > Apps > GitHub.',
  setupStep3: 'Cole o token e liste os repositórios, como dono/nome.',
  setupNote: 'O passo a passo está no README do lumen-github.',
  setupRefused: 'O GitHub recusou o token: ele pode ter vencido ou sido revogado. Cole um novo no celular.',
  setupMissingRepos: 'Liste pelo menos um repositório, como dono/nome, separados por vírgula.',
  stillNotConnected: 'Ainda não conectado',
  showingRepo: 'Mostrando {repo}',
};

const dictionaries = {en, pt} satisfies Record<string, Strings>;
export type Locale = keyof typeof dictionaries;

/** Picks the dictionary from the base language (`pt-PT` and `pt-BR` both map to `pt`). */
export function resolveLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const base = language.toLowerCase().split('-')[0];
    if (base in dictionaries) {
      return base as Locale;
    }
  }
  return 'en';
}

function browserLanguage(): string {
  return typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
}

export const locale: Locale = resolveLocale([browserLanguage()]);

/**
 * The BCP 47 tag for Intl: the device's own tag when it is in the language the
 * app shows (so `en-GB` keeps its 24-hour clock), else that language's default.
 */
export function formatTag(target: Locale = locale, language: string = browserLanguage()): string {
  const [base, region] = language.toLowerCase().split('-');
  return base === target && region ? language : target === 'pt' ? 'pt-BR' : 'en-US';
}

type Params = Record<string, string | number>;

function fill(template: string, params?: Params): string {
  if (params == null) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

export function translate(target: Locale, key: StringKey, params?: Params): string {
  return fill(dictionaries[target][key], params);
}

export function t(key: StringKey, params?: Params): string {
  return translate(locale, key, params);
}

/** Keys that have `_one`/`_other` forms, without the suffix. */
export type PluralKey = {
  [K in StringKey]: K extends `${infer Base}_one` ? (`${Base}_other` extends StringKey ? Base : never) : never;
}[StringKey];

export function translatePlural(target: Locale, key: PluralKey, count: number, params?: Params): string {
  const form = new Intl.PluralRules(target).select(count) === 'one' ? 'one' : 'other';
  return translate(target, `${key}_${form}` as StringKey, {count, ...params});
}

/** A counted string: `tp('guests', 5)` → "5 guests". */
export function tp(key: PluralKey, count: number, params?: Params): string {
  return translatePlural(locale, key, count, params);
}

export function dictionaryKeys(target: Locale): string[] {
  return Object.keys(dictionaries[target]);
}
