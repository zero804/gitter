import * as forumFilterConstants from '../../constants/forum-filters';

export default function navigateToFilter(filter){
  if(!filter) {
    throw new Error('navigateToFilter must be called with a valid filter');
  }

  return {
    type: forumFilterConstants.NAVIGATE_TO_FILTER,
    route: 'forum',
    filter: filter,
  };
}
