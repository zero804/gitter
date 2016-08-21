import * as forumtagConstants from '../../constants/forum-tags';

export default function navigateTotag(tag){
  if(!tag) {
    throw new Error('navigateToTag must be called with a valid tag');
  }

  return {
    type: forumtagConstants.NAVIGATE_TO_TAG,
    route: 'forum',
    tag: tag,
  };
}
