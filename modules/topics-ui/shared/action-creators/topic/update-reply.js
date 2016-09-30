import { UPDATE_REPLY } from '../../constants/topic.js';

export default function updateReply(replyId, text){
  return {
    type: UPDATE_REPLY,
    replyId: replyId,
    text: text
  };
}
