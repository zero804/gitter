import urlJoin from 'url-join';
import Promise from 'bluebird';
import {subscribe, dispatch} from '../../../shared/dispatcher';
import updateForumWatchState from '../../../shared/action-creators/forum/update-forum-watch-state';
import updateTopicWatchState from '../../../shared/action-creators/forum/update-topic-watch-state';
import updateReplyWatchState from '../../../shared/action-creators/forum/update-reply-watch-state';
import {
  SUBSCRIPTION_STATE_SUBSCRIBED,
  SUBSCRIPTION_STATE_UNSUBSCRIBED,
  REQUEST_UPDATE_FORUM_SUBSCRIPTION_STATE,
  REQUEST_UPDATE_TOPIC_SUBSCRIPTION_STATE,
  REQUEST_UPDATE_REPLY_SUBSCRIPTION_STATE
} from '../../../shared/constants/forum.js';
import apiClient from '../utils/api-client';

var generateRequestSubscriptionUpdateCb = function(action) {
  return function(data) {
    var {userId, forumId, topicId, replyId, isSubscribed} = data;

    var subscribersEndpoint = urlJoin('/v1/forums/', forumId);
    if(topicId) {
      subscribersEndpoint = urlJoin(subscribersEndpoint, '/topics/', topicId);
    }
    if(replyId) {
      subscribersEndpoint = urlJoin(subscribersEndpoint, '/replies/', replyId);
    }

    Promise.try(() => {
        if(isSubscribed) {
          return apiClient.post(urlJoin(subscribersEndpoint, '/subscribers'), {})
            .then(function() {
              dispatch(action(forumId, topicId, replyId, SUBSCRIPTION_STATE_SUBSCRIBED));
            });
        }
        else {
          return apiClient.delete(urlJoin(subscribersEndpoint, '/subscribers/', userId), {})
            .then(function() {
              dispatch(action(forumId, topicId, replyId, SUBSCRIPTION_STATE_UNSUBSCRIBED));
            });
        }
      })
      .catch(function() {
        // Return back to previous state
        dispatch(action(forumId, topicId, replyId, isSubscribed ? SUBSCRIPTION_STATE_UNSUBSCRIBED : SUBSCRIPTION_STATE_SUBSCRIBED));
      });
  };
}



const ForumClient = function() {
  subscribe(REQUEST_UPDATE_FORUM_SUBSCRIPTION_STATE, this.onRequestForumSubscriptionStateUpdate, this);
  subscribe(REQUEST_UPDATE_TOPIC_SUBSCRIPTION_STATE, this.onRequestTopicSubscriptionStateUpdate, this);
  subscribe(REQUEST_UPDATE_REPLY_SUBSCRIPTION_STATE, this.onRequestReplySubscriptionStateUpdate, this);
};

ForumClient.prototype.onRequestForumSubscriptionStateUpdate = generateRequestSubscriptionUpdateCb(function(forumId, topicId, replyId, subscriptionState) {
  return updateForumWatchState(forumId, subscriptionState);
});

ForumClient.prototype.onRequestTopicSubscriptionStateUpdate = generateRequestSubscriptionUpdateCb(function(forumId, topicId, replyId, subscriptionState) {
  return updateTopicWatchState(forumId, topicId, subscriptionState);
});

ForumClient.prototype.onRequestReplySubscriptionStateUpdate = generateRequestSubscriptionUpdateCb(function(forumId, topicId, replyId, subscriptionState) {
  return updateReplyWatchState(forumId, topicId, replyId, subscriptionState);
});

export default ForumClient;
