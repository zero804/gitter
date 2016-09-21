import { UPDATE_FORUM_WATCH_STATE } from '../../constants/forum.js';

export default function updateForumWatchState(forumId, state) {
  return {
    type: UPDATE_FORUM_WATCH_STATE,
    forumId,
    state
  };
}
