import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import H1 from '../text/h-1.jsx';
import TopicReplyListHeaderButton from './topic-reply-list-header-button.jsx';

import {
  TOPIC_REPLIES_POPULAR_SORT_NAME,
  TOPIC_REPLIES_COMMENT_SORT_NAME,
  TOPIC_REPLIES_LIKED_SORT_NAME,
  TOPIC_REPLIES_RECENT_SORT_NAME
} from '../../../../shared/constants/topic';

export default React.createClass({

  displayName: 'TopicReplyListHeader',
  propTypes: {
    replies: PropTypes.array.isRequired,
    sortName: PropTypes.oneOf([
      TOPIC_REPLIES_POPULAR_SORT_NAME,
      TOPIC_REPLIES_COMMENT_SORT_NAME,
      TOPIC_REPLIES_LIKED_SORT_NAME,
      TOPIC_REPLIES_RECENT_SORT_NAME
    ]).isRequired,
    onSortByCommentClicked: PropTypes.func.isRequired,
    onSortByLikeClicked: PropTypes.func.isRequired,
    onSortByRecentClicked: PropTypes.func.isRequired,
  },

  render(){

    const {replies, sortName} = this.props;
    const numOfReplies = replies.length;

    //TODO Add the popular button back into the control list
    //<li><button className="topic-reply-list-header__filter-button--active">Popular</button></li>

    return (
      <Container>
        <Panel className="panel--reply-list-header">
          <H1 className="topic-reply-list-header__heading">{numOfReplies} Replies</H1>
          <ul className="topic-reply-list-header__filter-list">
            <li>
              <TopicReplyListHeaderButton
                active={(sortName === TOPIC_REPLIES_COMMENT_SORT_NAME)}
                onClick={this.onSortByCommentClicked}>
                Commented
              </TopicReplyListHeaderButton>
            </li>

            <li>
              <TopicReplyListHeaderButton
                active={(sortName === TOPIC_REPLIES_LIKED_SORT_NAME)}
                onClick={this.onSortByLikeClicked}>
                Liked
              </TopicReplyListHeaderButton>
            </li>

            <li>
              <TopicReplyListHeaderButton
                active={(sortName === TOPIC_REPLIES_RECENT_SORT_NAME)}
                onClick={this.onSortByRecentClicked}>
                Recent
              </TopicReplyListHeaderButton>
            </li>
          </ul>
        </Panel>
      </Container>
    );
  },

  onSortByCommentClicked(){
    this.props.onSortByCommentClicked();
  },

  onSortByLikeClicked(){
    this.props.onSortByLikeClicked();
  },

  onSortByRecentClicked(){
    this.props.onSortByRecentClicked();
  },

});
