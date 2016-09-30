import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import H1 from '../text/h-1.jsx';

export default React.createClass({

  displayName: 'TopicReplyListHeader',
  propTypes: {
    replies: PropTypes.array.isRequired,
    onSortByCommentClicked: PropTypes.func.isRequired,
    onSortByLikeClicked: PropTypes.func.isRequired,
    onSortByRecentClicked: PropTypes.func.isRequired,
  },

  render(){

    const {replies} = this.props;
    const numOfReplies = replies.length;

    //TODO Add the popular button back into the control list
    //<li><button className="topic-reply-list-header__filter-button--active">Popular</button></li>

    return (
      <Container>
        <Panel className="panel--reply-list-header">
          <H1 className="topic-reply-list-header__heading">{numOfReplies} Replies</H1>
          <ul className="topic-reply-list-header__filter-list">
            <li>
              <button
                className="topic-reply-list-header__filter-button"
                onClick={this.onSortByCommentClicked}>
                Commented
              </button>
            </li>

            <li>
              <button
                className="topic-reply-list-header__filter-button"
                onClick={this.onSortByLikeClicked}>
                Liked
              </button>
            </li>

            <li>
              <button
                className="topic-reply-list-header__filter-button"
                onClick={this.onSortByRecentClicked}>
                Recent
              </button>
            </li>
          </ul>
        </Panel>
      </Container>
    );
  },

  onSortByCommentClicked(e){
    e.preventDefault();
    this.props.onSortByCommentClicked();
  },

  onSortByLikeClicked(e){
    e.preventDefault();
    this.props.onSortByLikeClicked();
  },

  onSortByRecentClicked(e){
    e.preventDefault();
    this.props.onSortByRecentClicked();
  },

});
