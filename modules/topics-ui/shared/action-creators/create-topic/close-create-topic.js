import { CLOSE_CREATE_TOPIC } from '../../constants/create-topic.js';

export default function closeCreateTopic(){
  return {
    type: CLOSE_CREATE_TOPIC
  };
}
