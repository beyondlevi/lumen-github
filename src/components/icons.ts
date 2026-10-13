import arrowBranchOutline from '@wearables-ui-toolkit/icons/svg/arrowbranch__outline.svg';
import bookClosedCodeFilled from '@wearables-ui-toolkit/icons/svg/bookclosedcode__filled.svg';
import circleCheckFilled from '@wearables-ui-toolkit/icons/svg/circlecheck__filled.svg';
import circleCheckOutline from '@wearables-ui-toolkit/icons/svg/circlecheck__outline.svg';
import circleDashOutline from '@wearables-ui-toolkit/icons/svg/circledash__outline.svg';
import circleMinusOutline from '@wearables-ui-toolkit/icons/svg/circleminus__outline.svg';
import circleSlashOutline from '@wearables-ui-toolkit/icons/svg/circleslash__outline.svg';
import circleXFilled from '@wearables-ui-toolkit/icons/svg/circlex__filled.svg';
import circleXOutline from '@wearables-ui-toolkit/icons/svg/circlex__outline.svg';
import clockOutline from '@wearables-ui-toolkit/icons/svg/clock__outline.svg';
import documentFormatCodeFilled from '@wearables-ui-toolkit/icons/svg/documentformatcode__filled.svg';
import documentStackOutline from '@wearables-ui-toolkit/icons/svg/documentstack__outline.svg';
import lockFilled from '@wearables-ui-toolkit/icons/svg/lock__filled.svg';
import node4BranchFilled from '@wearables-ui-toolkit/icons/svg/node4branch__filled.svg';
import speechBubbleCheckOutline from '@wearables-ui-toolkit/icons/svg/speechbubblecheck__outline.svg';
import starOutline from '@wearables-ui-toolkit/icons/svg/star__outline.svg';
import users2Outline from '@wearables-ui-toolkit/icons/svg/users2__outline.svg';
import type {CheckState, CiSummary, PullState} from '../github/types';

export const icons = {
  pulls: node4BranchFilled,
  commits: documentFormatCodeFilled,
  repos: bookClosedCodeFilled,
  branch: arrowBranchOutline,
  files: documentStackOutline,
  reviews: users2Outline,
  comments: speechBubbleCheckOutline,
  lock: lockFilled,
  star: starOutline,
  selected: circleCheckFilled,
  failure: circleXFilled,
};

/** Open and draft are outlines; merged a filled check; closed a slash. Shapes, since the HUD is one color. */
export const PULL_STATE_ICON: Record<PullState, string> = {
  open: arrowBranchOutline,
  draft: circleDashOutline,
  merged: circleCheckFilled,
  closed: circleSlashOutline,
};

export const CI_ICON: Record<CiSummary['state'], string> = {
  success: circleCheckOutline,
  failure: circleXFilled,
  pending: clockOutline,
  none: circleMinusOutline,
};

export const CHECK_ICON: Record<CheckState, string> = {
  success: circleCheckOutline,
  failure: circleXOutline,
  pending: clockOutline,
  skipped: circleMinusOutline,
};
