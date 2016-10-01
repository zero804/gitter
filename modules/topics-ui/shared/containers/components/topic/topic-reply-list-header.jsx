import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import H1 from '../text/h-1.jsx';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'TopicReplyListHeader',
  propTypes: {
    replies: PropTypes.array.isRequired,
    replyListEditorInFocus: PropTypes.bool,
  },

  render(){

    const {replies, replyListEditorInFocus} = this.props;
    const numOfReplies = replies.length;

    const compiledClass = classNames({
      'topic-reply-list-header-wrap--visually-hidden': replyListEditorInFocus
    }, 'topic-reply-list-header-wrap')

    return (
      <Container>
        <Panel className="panel--reply-list-header">
          <div className={compiledClass}>
            <H1 className="topic-reply-list-header__heading">{numOfReplies} Replies</H1>
            <ul className="topic-reply-list-header__filter-list">
              <li><button className="topic-reply-list-header__filter-button--active">Popular</button></li>
              <li><button className="topic-reply-list-header__filter-button">Commented</button></li>
              <li><button className="topic-reply-list-header__filter-button">Liked</button></li>
              <li><button className="topic-reply-list-header__filter-button">Recent</button></li>
            </ul>
          </div>
        </Panel>
      </Container>
    );
  }

});
