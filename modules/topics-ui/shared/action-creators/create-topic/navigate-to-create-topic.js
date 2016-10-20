import { NAVIGATE_TO_CREATE_TOPIC } from '../../constants/create-topic.js';

export default function navigateToCreateTopic(source = NAVIGATE_TO_CREATE_TOPIC) {
  return {
    type: NAVIGATE_TO_CREATE_TOPIC,
    source: source
  };
}
