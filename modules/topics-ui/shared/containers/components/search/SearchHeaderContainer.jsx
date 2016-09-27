import React, { PropTypes } from 'react';
import {dispatch} from '../../../dispatcher';
import Container from '../container.jsx';
import { SUBSCRIPTION_STATE_SUBSCRIBED, SUBSCRIPTION_STATE_UNSUBSCRIBED, SUBSCRIPTION_STATE_PENDING } from '../../../constants/forum.js';
import requestUpdateForumSubscriptionState from '../../../action-creators/forum/request-update-forum-subscription-state';

import SearchHeader from './search-header.jsx';

export default React.createClass({

  displayName: 'SearchHeaderContainer',
  propTypes: {
    userId: PropTypes.string.isRequired,
    forumId: PropTypes.string.isRequired,
    groupName: PropTypes.string.isRequired,
    subscriptionState: PropTypes.oneOf([
      SUBSCRIPTION_STATE_SUBSCRIBED,
      SUBSCRIPTION_STATE_UNSUBSCRIBED,
      SUBSCRIPTION_STATE_PENDING
    ]).isRequired
  },

  render(){
    const { userId, forumId, groupName, subscriptionState } = this.props;

    return (
      <Container>
        <SearchHeader
          userId={userId}
          forumId={forumId}
          groupName={groupName}
          subscriptionState={subscriptionState}
          onSubscribeButtonClick={this.onSubscribeButtonClick}/>
      </Container>
    );
  },


  onSubscribeButtonClick() {
    const {userId, forumId, subscriptionState} = this.props;

    var desiredIsSubscribed = (subscriptionState !== SUBSCRIPTION_STATE_SUBSCRIBED);
    dispatch(requestUpdateForumSubscriptionState(forumId, userId, desiredIsSubscribed));
  }

});
