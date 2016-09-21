import { ATTEMPT_UPDATE_FORUM_WATCH_STATE } from '../../constants/forum.js';

export default function attemptUpdateForumWatchState(forumId, userId, isWatching) {
  return {
    type: ATTEMPT_UPDATE_FORUM_WATCH_STATE,
    forumId,
    userId,
    isWatching: isWatching
  };
}
