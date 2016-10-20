import { DELETE_TOPIC } from '../../constants/topic.js';

export default function deleteTopic() {
  return {
    type: DELETE_TOPIC
  };
}
