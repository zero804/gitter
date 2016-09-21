import urlJoin from 'url-join';
import {subscribe, dispatch} from '../../../shared/dispatcher';
import updateForumWatchState from '../../../shared/action-creators/forum/update-forum-watch-state';
import { ATTEMPT_UPDATE_FORUM_WATCH_STATE, FORUM_WATCH_STATE } from '../../../shared/constants/forum.js';
import apiClient from '../utils/api-client';

const ForumDao = function() {
  subscribe(ATTEMPT_UPDATE_FORUM_WATCH_STATE, this.onAttemptWatchStateUpdate, this);
};

ForumDao.prototype.onAttemptWatchStateUpdate = function(data) {
  var {userId, forumId, isWatching} = data;
  if(isWatching) {
    apiClient.post(urlJoin('/v1/forums/', forumId, '/subscribers'), {})
      .then(function() {
        dispatch(updateForumWatchState(forumId, FORUM_WATCH_STATE.WATCHING));
      })
      .catch(function() {
        // Return back to previous state
        dispatch(updateForumWatchState(forumId, isWatching ? FORUM_WATCH_STATE.NOT_WATCHING : FORUM_WATCH_STATE.WATCHING));
      });
  }
  else {
    apiClient.delete(urlJoin('/v1/forums/', forumId, '/subscribers/', userId), {})
      .then(function() {
        dispatch(updateForumWatchState(forumId, FORUM_WATCH_STATE.NOT_WATCHING));
      })
      .catch(function() {
        // Return back to previous state
        dispatch(updateForumWatchState(forumId, isWatching ? FORUM_WATCH_STATE.NOT_WATCHING : FORUM_WATCH_STATE.WATCHING));
      });
  }
};

export default ForumDao;
