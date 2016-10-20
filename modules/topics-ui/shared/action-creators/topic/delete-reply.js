import { DELETE_REPLY } from '../../constants/topic.js';

export default function deleteReply(replyId) {
  return {
    type: DELETE_REPLY,
    replyId
  };
}
