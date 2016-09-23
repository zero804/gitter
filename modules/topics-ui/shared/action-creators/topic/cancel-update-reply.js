import { CANCEL_UPDATE_REPLY } from '../../constants/topic.js';

export default function cancelUpdateReply(replyId){
  return {
    type: CANCEL_UPDATE_REPLY,
    replyId: replyId
  };
}
