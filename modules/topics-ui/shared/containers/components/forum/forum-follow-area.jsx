import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import FollowButton from './follow-button.jsx';


import {
  SUBSCRIPTION_STATE_SUBSCRIBED,
  SUBSCRIPTION_STATE_UNSUBSCRIBED,
  SUBSCRIPTION_STATE_PENDING
} from '../../../constants/forum.js';

export default React.createClass({

  displayName: 'ForumFollowArea',
  propTypes: {
    groupName: PropTypes.string.isRequired,
    subscriptionState: PropTypes.oneOf([
      SUBSCRIPTION_STATE_SUBSCRIBED,
      SUBSCRIPTION_STATE_UNSUBSCRIBED,
      SUBSCRIPTION_STATE_PENDING
    ]).isRequired,
    onSubscriptionClicked: PropTypes.func.isRequired
  },

  render(){
    const {subscriptionState, onSubscriptionClicked, groupName } = this.props;
    return (
      <Container>
        <Panel className="panel--forum-follow-area">
          <FollowButton
            groupName={groupName}
            className="forum-follow-area-button"
            subscriptionState={subscriptionState}
            onClick={onSubscriptionClicked}/>
        </Panel>
      </Container>
    );
  }

});
