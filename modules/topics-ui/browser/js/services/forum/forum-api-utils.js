import urlJoin from 'url-join';

import router from '../../routers';
import {getCurrentUser} from '../../stores/current-user-store';
import {getForumId} from '../../stores/forum-store';


export const getForumIdParams = (data) => {
  let {
    forumId,
    topicId,
    replyId,
    commentId
  } = data;
  const { id: userId } = getCurrentUser();
  if(!forumId) {
    forumId = getForumId();
  }
  if(replyId && !topicId) {
    topicId = router.get('topicId');
  }

  return {
    userId,
    forumId,
    topicId,
    replyId,
    commentId
  };
}

export const generateForumApiEndpointUrl = ({ forumId, topicId, replyId, commentId }) => {
  // Figure out the API endpoint we should post/delete on
  var subscribersEndpoint = urlJoin('/v1/forums/', forumId);
  if(topicId) {
    subscribersEndpoint = urlJoin(subscribersEndpoint, '/topics/', topicId);
  }
  if(replyId) {
    subscribersEndpoint = urlJoin(subscribersEndpoint, '/replies/', replyId);
  }
  if(commentId) {
    subscribersEndpoint = urlJoin(subscribersEndpoint, '/comments/', commentId);
  }

  return subscribersEndpoint;
};
