import { TOGGLE_FORUM_WATCH_STATE } from '../../constants/forum.js';

export default function toggleForumWatchState(forumId, desiredState) {
  return {
    type: TOGGLE_FORUM_WATCH_STATE,
    forumId,
    desiredState
  };
}
