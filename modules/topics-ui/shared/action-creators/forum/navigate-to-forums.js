import { NAVIGATE_TO_FORUMS } from '../../constants/forum.js';

export default function navigateToForums() {
  return {
    type: NAVIGATE_TO_FORUMS,
    route: 'forum'
  };
}
