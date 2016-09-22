import React, {PropTypes, createClass} from 'react';
import TopicHeader from './components/topic/topic-header.jsx';
import TopicBody from './components/topic/topic-body.jsx';
import SearchHeader from './components/search/search-header.jsx';
import TopicReplyEditor from './components/topic/topic-reply-editor.jsx';
import TopicReplyListHeader from './components/topic/topic-reply-list-header.jsx';
import TopicReplyList from './components/topic/topic-reply-list.jsx';
import {dispatch} from '../dispatcher';
import updateReplyBody from '../action-creators/create-reply/body-update';
import submitNewReply from '../action-creators/create-reply/submit-new-reply';
import updateCommentBody from '../action-creators/create-comment/body-update';

import showReplyComments from '../action-creators/topic/show-reply-comments';
const TopicContainer = createClass({

  displayName: 'TopicContainer',
  propTypes: {

    topicId: PropTypes.string.isRequired,
    groupName: PropTypes.string.isRequired,

    topicsStore: PropTypes.shape({
      getById: PropTypes.func.isRequired,
    }).isRequired,

    repliesStore: PropTypes.shape({
      getReplies: PropTypes.func.isRequired
    }).isRequired,

    commentsStore: PropTypes.shape({
      getComments: PropTypes.func.isRequired,
    }),

    categoryStore: PropTypes.shape({
      getCategories: PropTypes.func.isRequired,
    }).isRequired,

    tagStore: PropTypes.shape({
      getTags: PropTypes.func.isRequired,
      getTagsByLabel: PropTypes.func.isRequired,
    }).isRequired,

    currentUserStore: PropTypes.shape({
      getCurrentUser: PropTypes.func.isRequired
    }).isRequired,

    newReplyStore: PropTypes.shape({
      get: PropTypes.func.isRequired,
    }),

    newCommentStore: PropTypes.shape({
      get: PropTypes.func.isRequired,
    }),

  },

  componentDidMount(){
    const {repliesStore, newReplyStore, commentsStore} = this.props;
    repliesStore.onChange(this.updateReplies, this);
    commentsStore.onChange(this.updateComments, this);
    newReplyStore.on('change:text', this.updateReplyContent, this);
  },

  componentWillUnmount(){
    const {repliesStore, newReplyStore} = this.props;
    repliesStore.removeListeners(this.updateReplies, this);
    newReplyStore.off('change:text', this.updateReplyContent, this);
  },

  getInitialState(){
    return {
      replies: this.getParsedReplies(),
      newReplyContent: '',
    };
  },


  render(){

    const { topicId, topicsStore, groupName, categoryStore, currentUserStore, tagStore } = this.props;
    const {replies, newReplyContent} = this.state;
    const topic = topicsStore.getById(topicId)
    const currentUser = currentUserStore.getCurrentUser();
    const topicCategory = topic.category;
    const category = categoryStore.getById(topicCategory.id);

    //TODO remove
    //This is here because sometimes you can get un-parsed tags
    //we need to hydrate the client stores with the raw SS data
    //not the parsed data which will avoid nesting and inconsistent data
    const tagValues = topic.tags.map(function(t){
      return t.label ? t.label : t;
    });
    const tags = tagStore.getTagsByLabel(tagValues);

    return (
      <main>
        <SearchHeader groupName={groupName}/>
        <article>
          <TopicHeader
            topic={topic}
            category={category}
            groupName={groupName}
            tags={tags}/>
          <TopicBody topic={topic} />
        </article>
        <TopicReplyListHeader replies={replies}/>
        <TopicReplyList
          replies={replies}
          submitNewComment={this.submitNewComment}
          onNewCommentUpdate={this.onNewCommentUpdate}
          onReplyCommentsClicked={this.onReplyCommentsClicked}/>
        <TopicReplyEditor
          user={currentUser}
          value={newReplyContent}
          onChange={this.onEditorUpdate}
          onSubmit={this.onEditorSubmit}/>
      </main>
    );
  },

  onEditorUpdate(val){
    dispatch(updateReplyBody(val));
  },

  onEditorSubmit(){
    const {newReplyStore} = this.props;
    dispatch(submitNewReply(newReplyStore.get('text')));
    //Clear input
    newReplyStore.clear();
    this.setState((state) => Object.assign(state, {
      newReplyContent: '',
    }));
  },

  updateReplyContent(){
    const {newReplyStore} = this.props;
    const newReplyContent = newReplyStore.get('text');
    this.setState((state) => Object.assign(state, {
      newReplyContent: newReplyContent,
    }));
  },

  updateReplies(){
    const {repliesStore} = this.props;
    this.setState((state) => Object.assign(state, {
      replies: repliesStore.getReplies(),
      newReplyContent: '',
    }));
  },

  updateComments(){
    this.setState((state) => Object.assign({}, state, {
      replies: this.getParsedReplies(),
    }));
  },

  getParsedReplies(){
    const {repliesStore, commentsStore} = this.props;
    return repliesStore.getReplies().map((reply) => Object.assign({}, reply, {
      comments: commentsStore.getCommentsByReplyId(reply.id),
      isCommenting: commentsStore.getActiveReplyId() === reply.id,
    }))
  },

  onReplyCommentsClicked(replyId){
    dispatch(showReplyComments(replyId));
  },

  onNewCommentUpdate(replyId, val) {
    dispatch(updateCommentBody(replyId, val));
  },

  submitNewComment(){
    //TODO
  }

});

export default TopicContainer;
