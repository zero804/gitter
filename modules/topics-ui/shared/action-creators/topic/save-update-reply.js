import { SAVE_UPDATE_REPLY } from '../../constants/topic.js';

export default function saveUpdateReply(replyId){
  return {
    type: SAVE_UPDATE_REPLY,
    replyId: replyId
  };
}
