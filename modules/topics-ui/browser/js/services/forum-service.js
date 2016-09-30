import handleSubscriptionState from './forum/forum-service-subscription-state';
import handleReactions from './forum/forum-service-reactions';

// Listens for actions that request info that comes through the forum API
// and dispatches new actions based on the response/error
const ForumService = function() {
  handleSubscriptionState();
  handleReactions();
};


export default ForumService;
