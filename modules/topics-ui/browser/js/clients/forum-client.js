import urlJoin from 'url-join';
import Promise from 'bluebird';
import {subscribe, dispatch} from '../../../shared/dispatcher';

import router from '../routers';
import {getCurrentUser} from '../stores/current-user-store';
import {getForumId} from '../stores/forum-store';

import updateForumSubscriptionState from '../../../shared/action-creators/forum/update-forum-subscription-state';
import updateTopicSubscriptionState from '../../../shared/action-creators/forum/update-topic-subscription-state';
import updateReplySubscriptionState from '../../../shared/action-creators/forum/update-reply-subscription-state';
import {
  SUBSCRIPTION_STATE_SUBSCRIBED,
  SUBSCRIPTION_STATE_UNSUBSCRIBED,
  REQUEST_UPDATE_FORUM_SUBSCRIPTION_STATE,
  REQUEST_UPDATE_TOPIC_SUBSCRIPTION_STATE,
  REQUEST_UPDATE_REPLY_SUBSCRIPTION_STATE
} from '../../../shared/constants/forum.js';
import apiClient from '../utils/api-client';


// Generate a subscription callback that sends out the actual API requests
// and dispatches some new actions for the reponses
//
// Takes an action-creator to dispatch
const generateRequestSubscriptionUpdateCallback = function(action) {
  return function(data) {
    const {
      topicId = router.get('topicId'),
      replyId,
      isSubscribed
    } = data;
    const { id: userId } = getCurrentUser();
    const forumId = getForumId();

    // Figure out the API endpoint we should post/delete on
    var subscribersEndpoint = urlJoin('/v1/forums/', forumId);
    if(topicId) {
      subscribersEndpoint = urlJoin(subscribersEndpoint, '/topics/', topicId);
    }
    if(replyId) {
      subscribersEndpoint = urlJoin(subscribersEndpoint, '/replies/', replyId);
    }

    Promise.try(() => {
        // Requested to subscribe to the entity
        if(isSubscribed) {
          return apiClient.post(urlJoin(subscribersEndpoint, '/subscribers'), {})
            .then(function() {
              // Let the stores know about the response data
              dispatch(action(forumId, topicId, replyId, SUBSCRIPTION_STATE_SUBSCRIBED));
            });
        }
        // Requested to unsubscribe from the entity
        else {
          return apiClient.delete(urlJoin(subscribersEndpoint, '/subscribers/', userId), {})
            .then(function() {
              // Let the stores know about the response data
              dispatch(action(forumId, topicId, replyId, SUBSCRIPTION_STATE_UNSUBSCRIBED));
            });
        }
      })
      // Revert back to previous state if anything fails
      // Let the stores know about the response error
      .catch(() => {
        dispatch(action(forumId, topicId, replyId, isSubscribed ? SUBSCRIPTION_STATE_UNSUBSCRIBED : SUBSCRIPTION_STATE_SUBSCRIBED));
      });
  };
}


// Listens for actions that request info that comes through the forum API
// and dispatches new actions based on the response/error
const ForumClient = function() {
  subscribe(REQUEST_UPDATE_FORUM_SUBSCRIPTION_STATE, this.onRequestForumSubscriptionStateUpdate, this);
  subscribe(REQUEST_UPDATE_TOPIC_SUBSCRIPTION_STATE, this.onRequestTopicSubscriptionStateUpdate, this);
  subscribe(REQUEST_UPDATE_REPLY_SUBSCRIPTION_STATE, this.onRequestReplySubscriptionStateUpdate, this);
};

// Curry the generic action creator into the forum action
ForumClient.prototype.onRequestForumSubscriptionStateUpdate = generateRequestSubscriptionUpdateCallback((forumId, topicId, replyId, subscriptionState) => {
  return updateForumSubscriptionState(forumId, subscriptionState);
});

// Curry the generic action creator into the topic action
ForumClient.prototype.onRequestTopicSubscriptionStateUpdate = generateRequestSubscriptionUpdateCallback((forumId, topicId, replyId, subscriptionState) => {
  return updateTopicSubscriptionState(topicId, subscriptionState);
});

// Curry the generic action creator into the reply action
ForumClient.prototype.onRequestReplySubscriptionStateUpdate = generateRequestSubscriptionUpdateCallback((forumId, topicId, replyId, subscriptionState) => {
  return updateReplySubscriptionState(replyId, subscriptionState);
});

export default ForumClient;
