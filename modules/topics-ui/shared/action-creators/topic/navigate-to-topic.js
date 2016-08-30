import { NAVIGATE_TO_TOPIC } from '../../constants/navigation.js';

export default function navigateToTopic(groupName, id, slug){
  return {
    type: NAVIGATE_TO_TOPIC,
    groupName,
    id: id,
    slug: slug
  };
}
