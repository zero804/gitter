import { NAVIGATE_TO_TOPIC } from '../../constants/navigation.js';

export default function navigateToTopic(groupUri, id, slug){
  return {
    type: NAVIGATE_TO_TOPIC,
    groupUri,
    id: id,
    slug: slug
  };
}
