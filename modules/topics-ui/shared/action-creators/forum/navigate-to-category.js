
import * as forumCatConstants from '../../constants/forum-categories';

export default function navigateToCategory(category) {

  if (!category) {
    throw new Error('navigateToCategory must be called with a category value');
  }

  return {
    type: forumCatConstants.NAVIGATE_TO_CATEGORY,
    route: 'forum',
    category: category
  };
}
