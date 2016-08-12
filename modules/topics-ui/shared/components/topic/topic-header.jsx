"use strict";

import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import H1 from '../text/h-1.jsx';
import UserAvatar from '../user/user-avatar.jsx';

export default React.createClass({

  displayName: 'TopicHeader',
  propTypes: {

    topic: PropTypes.shape({
      title: PropTypes.string,
      user: PropTypes.shape({
        avatarUrl: PropTypes.string.isRequired,
        displayName: PropTypes.string.isRequired
      }).isRequired,
    }).isRequired
  },

  render(){

    const { title, user } = this.props.topic;

    return (
      <Container className="container--topic-header">
        <Panel>
          <header className="topic-header">
            <UserAvatar user={user} width={44} height={44}/>
            <H1 className="topic-header__title">{title}</H1>
          </header>
        </Panel>
      </Container>
    );
  }

});
