import urlJoin from 'url-join';
import Promise from 'bluebird';
import {subscribe, dispatch} from '../../../../shared/dispatcher';
import apiClient from '../../utils/api-client';

import { getForumIdParams, generateForumApiEndpointUrl } from './forum-api-utils';

import updateTopicReactions from '../../../../shared/action-creators/forum/update-topic-reactions';
import updateReplyReactions from '../../../../shared/action-creators/forum/update-reply-reactions';
import updateCommentReactions from '../../../../shared/action-creators/forum/update-comment-reactions';
import {
  REQUEST_UPDATE_TOPIC_REACTIONS,
  REQUEST_UPDATE_REPLY_REACTIONS,
  REQUEST_UPDATE_COMMENT_REACTIONS
} from '../../../../shared/constants/forum.js';



const generateRequestReactionUpdateCallback = function(action) {
  return (data = {}) => {
    const {
      isReacting,
      reactionKey
    } = data;

    // Figure out the API endpoint we should post/delete on
    const params = getForumIdParams(data);
    const subscribersEndpoint = urlJoin(generateForumApiEndpointUrl(params), 'reactions');
    const {
      userId,
      topicId,
      replyId,
      commentId
    } = params;

    const requestOptions = {
      reaction: reactionKey
    };

    return Promise.try(() => {
      // Requested to subscribe to the entity
      if(isReacting) {
        return apiClient.post(subscribersEndpoint, requestOptions)
          .then(() => {
            // Let the stores know about the response data
            dispatch(action(topicId, replyId, commentId, reactionKey, true));
          });
      }
      // Requested to unsubscribe from the entity
      else {
        return apiClient.delete(urlJoin(subscribersEndpoint, userId), requestOptions)
          .then(() => {
            // Let the stores know about the response data
            dispatch(action(topicId, replyId, commentId, reactionKey, false));
          });
      }
    })
    .catch(function(err) {
      // Revert back to previous state if anything fails
      // Let the stores know about the response error
      dispatch(action(topicId, replyId, commentId, reactionKey, !isReacting));

      throw err;
    });
  };
}

// Curry the generic action creator into the topic action
const onRequestTopicReactionUpdate = generateRequestReactionUpdateCallback((topicId, replyId, commentId, reactionKey, isReacting) => {
  return updateTopicReactions(topicId, reactionKey, isReacting);
});

// Curry the generic action creator into the reply action
const onRequestReplyReactionUpdate = generateRequestReactionUpdateCallback((topicId, replyId, commentId, reactionKey, isReacting) => {
  return updateReplyReactions(replyId, reactionKey, isReacting);
});

// Curry the generic action creator into the forum action
const onRequestCommentReactionUpdate = generateRequestReactionUpdateCallback((topicId, replyId, commentId, reactionKey, isReacting) => {
  return updateCommentReactions(commentId, reactionKey, isReacting);
});


export default function install() {
  subscribe(REQUEST_UPDATE_TOPIC_REACTIONS, onRequestTopicReactionUpdate, this);
  subscribe(REQUEST_UPDATE_REPLY_REACTIONS, onRequestReplyReactionUpdate, this);
  subscribe(REQUEST_UPDATE_COMMENT_REACTIONS, onRequestCommentReactionUpdate, this);
}
