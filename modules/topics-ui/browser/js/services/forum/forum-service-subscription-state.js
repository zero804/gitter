import urlJoin from 'url-join';
import Promise from 'bluebird';
import {subscribe, dispatch} from '../../../../shared/dispatcher';
import apiClient from '../../utils/api-client';

import { getForumIdParams, generateForumApiEndpointUrl } from './forum-api-utils';

import updateForumSubscriptionState from '../../../../shared/action-creators/forum/update-forum-subscription-state';
import updateTopicSubscriptionState from '../../../../shared/action-creators/forum/update-topic-subscription-state';
import updateReplySubscriptionState from '../../../../shared/action-creators/forum/update-reply-subscription-state';
import {
  SUBSCRIPTION_STATE_SUBSCRIBED,
  SUBSCRIPTION_STATE_UNSUBSCRIBED,
  REQUEST_UPDATE_FORUM_SUBSCRIPTION_STATE,
  REQUEST_UPDATE_TOPIC_SUBSCRIPTION_STATE,
  REQUEST_UPDATE_REPLY_SUBSCRIPTION_STATE
} from '../../../../shared/constants/forum.js';



const generateRequestSubscriptionUpdateCallback = function(action) {
  return (data = {}) => {
    const { isSubscribed } = data;

    // Figure out the API endpoint we should post/delete on
    const params = getForumIdParams(data);
    const subscribersEndpoint = urlJoin(generateForumApiEndpointUrl(params), 'subscribers');
    const {
      userId,
      forumId,
      topicId,
      replyId
    } = params;

    return Promise.try(() => {
      // Requested to subscribe to the entity
      if(isSubscribed) {
        return apiClient.post(subscribersEndpoint, {})
          .then(() => {
            // Let the stores know about the response data
            dispatch(action(forumId, topicId, replyId, SUBSCRIPTION_STATE_SUBSCRIBED));
          });
      }
      // Requested to unsubscribe from the entity
      else {
        return apiClient.delete(urlJoin(subscribersEndpoint, userId), {})
          .then(() => {
            // Let the stores know about the response data
            dispatch(action(forumId, topicId, replyId, SUBSCRIPTION_STATE_UNSUBSCRIBED));
          });
      }
    })
    .catch(function(err) {
      // Revert back to previous state if anything fails
      // Let the stores know about the response error
      dispatch(action(forumId, topicId, replyId, isSubscribed ? SUBSCRIPTION_STATE_UNSUBSCRIBED : SUBSCRIPTION_STATE_SUBSCRIBED));

      throw err;
    });
  };
}


// Curry the generic action creator into the forum action
const onRequestForumSubscriptionStateUpdate = generateRequestSubscriptionUpdateCallback((forumId, topicId, replyId, subscriptionState) => {
  return updateForumSubscriptionState(forumId, subscriptionState);
});

// Curry the generic action creator into the topic action
const onRequestTopicSubscriptionStateUpdate = generateRequestSubscriptionUpdateCallback((forumId, topicId, replyId, subscriptionState) => {
  return updateTopicSubscriptionState(topicId, subscriptionState);
});

// Curry the generic action creator into the reply action
const onRequestReplySubscriptionStateUpdate = generateRequestSubscriptionUpdateCallback((forumId, topicId, replyId, subscriptionState) => {
  return updateReplySubscriptionState(replyId, subscriptionState);
});


export default function install() {
  subscribe(REQUEST_UPDATE_FORUM_SUBSCRIPTION_STATE, onRequestForumSubscriptionStateUpdate, this);
  subscribe(REQUEST_UPDATE_TOPIC_SUBSCRIPTION_STATE, onRequestTopicSubscriptionStateUpdate, this);
  subscribe(REQUEST_UPDATE_REPLY_SUBSCRIPTION_STATE, onRequestReplySubscriptionStateUpdate, this);
}
