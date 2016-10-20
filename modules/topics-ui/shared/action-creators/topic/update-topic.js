import { UPDATE_TOPIC } from '../../constants/topic.js';

export default function updateTopic(text){
  return {
    type: UPDATE_TOPIC,
    text
  };
}
