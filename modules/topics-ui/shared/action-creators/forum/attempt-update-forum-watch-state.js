import { ATTEMPT_UPDATE_FORUM_WATCH_STATE } from '../../constants/forum.js';

export default function attemptUpdateForumWatchState(forumId, isWatching) {
  return {
    type: ATTEMPT_UPDATE_FORUM_WATCH_STATE,
    forumId,
    isWatching: isWatching
  };
}
