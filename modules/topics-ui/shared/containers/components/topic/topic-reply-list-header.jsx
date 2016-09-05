import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import H1 from '../text/h-1.jsx';

export default React.createClass({

  displayName: 'TopicReplyListHeader',
  propTypes: {
    replies: PropTypes.array.isRequired,
  },

  render(){

    const {replies} = this.props;
    const numOfReplies = replies.length;

    return (
      <Container>
        <Panel className="panel--reply-list-header">
          <H1 className="topic-reply-list-header__heading">{numOfReplies} Replies</H1>
          <ul className="topic-reply-list-header__filter-list">
            <li><button className="topic-reply-list-header__filter-button--active">Popular</button></li>
            <li><button className="topic-reply-list-header__filter-button">Commented</button></li>
            <li><button className="topic-reply-list-header__filter-button">Liked</button></li>
            <li><button className="topic-reply-list-header__filter-button">Recent</button></li>
          </ul>
        </Panel>
      </Container>
    );
  }

});
