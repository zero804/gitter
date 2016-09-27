import React, {PropTypes, createClass} from 'react';
import {dispatch} from '../dispatcher';

import TopicHeader from './components/topic/topic-header.jsx';
import TopicBody from './components/topic/topic-body.jsx';
import SearchHeader from './components/search/search-header.jsx';
import TopicReplyEditor from './components/topic/topic-reply-editor.jsx';
import TopicReplyListHeader from './components/topic/topic-reply-list-header.jsx';
import TopicReplyList from './components/topic/topic-reply-list.jsx';

import updateReplyBody from '../action-creators/create-reply/body-update';
import submitNewReply from '../action-creators/create-reply/submit-new-reply';
import updateCommentBody from '../action-creators/create-comment/body-update';
import submitNewComment from '../action-creators/create-comment/submit-new-comment';
import showReplyComments from '../action-creators/topic/show-reply-comments';
import { SUBSCRIPTION_STATE_SUBSCRIBED } from '../constants/forum.js';
import requestUpdateTopicSubscriptionState from '../action-creators/forum/request-update-topic-subscription-state';
import requestUpdateReplySubscriptionState from '../action-creators/forum/request-update-reply-subscription-state';
import requestSignIn from '../action-creators/forum/request-sign-in';

const EDITOR_SUBMIT_LINK_SOURCE = 'topics-reply-editor-submit-button';
const EDITOR_CLICK_LINK_SOURCE = 'topics-reply-editor-click';


const TopicContainer = createClass({

  displayName: 'TopicContainer',
  propTypes: {

    topicId: PropTypes.string.isRequired,
    groupName: PropTypes.string.isRequired,

    //Forum
    forumStore: React.PropTypes.shape({
      getForumId: React.PropTypes.func.isRequired,
      getSubscriptionState: React.PropTypes.func.isRequired
    }).isRequired,

    topicsStore: PropTypes.shape({
      getById: PropTypes.func.isRequired,
    }).isRequired,

    repliesStore: PropTypes.shape({
      getById: PropTypes.func.isRequired,
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
      getCurrentUser: PropTypes.func.isRequired,
      getIsSignedIn: PropTypes.func.isRequired,
    }).isRequired,

    newReplyStore: PropTypes.shape({
      get: PropTypes.func.isRequired,
    }),

    newCommentStore: PropTypes.shape({
      get: PropTypes.func.isRequired,
    }),

  },

  componentDidMount(){
    const {forumStore, topicsStore, repliesStore, newReplyStore, commentsStore, newCommentStore} = this.props;
    forumStore.onChange(this.onForumUpdate, this);
    topicsStore.onChange(this.onTopicsUpdate, this);

    repliesStore.onChange(this.updateReplies, this);
    newReplyStore.on('change:text', this.updateReplyContent, this);

    commentsStore.onChange(this.updateComments, this);
    newCommentStore.onChange(this.updateNewComment, this);
  },

  componentWillUnmount(){
    const {forumStore, topicsStore, repliesStore, newReplyStore, commentsStore, newCommentStore} = this.props;
    forumStore.removeListeners(this.onForumUpdate, this);
    topicsStore.removeListeners(this.onTopicsUpdate, this);

    repliesStore.removeListeners(this.updateReplies, this);
    newReplyStore.off('change:text', this.updateReplyContent, this);

    commentsStore.removeListeners(this.updateComments, this);
    newCommentStore.removeListeners(this.updateNewComment, this);
  },

  getInitialState() {
    const { forumStore, topicsStore, topicId } = this.props;
    return {
      forumId: forumStore.getForumId(),
      forumSubscriptionState: forumStore.getSubscriptionState(),
      topic: topicsStore.getById(topicId),
      newReplyContent: '',
    };
  },


  render(){
    const { topicId, topicsStore, groupName, categoryStore, currentUserStore, tagStore, newCommentStore } = this.props;
    const {forumId, forumSubscriptionState, newReplyContent} = this.state;

    const topic = topicsStore.getById(topicId);
    const currentUser = currentUserStore.getCurrentUser();
    const userId = currentUser.id;
    const isSignedIn = currentUserStore.getIsSignedIn();
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

    const parsedReplies = this.getParsedReplies();

    return (
      <main>
        <SearchHeader
          userId={userId}
          forumId={forumId}
          groupName={groupName}
          subscriptionState={forumSubscriptionState}/>
        <article>
          <TopicHeader
            topic={topic}
            category={category}
            groupName={groupName}
            tags={tags}/>
          <TopicBody
            topic={topic}
            onSubscribeButtonClick={this.onTopicSubscribeButtonClick} />
        </article>
        <TopicReplyListHeader replies={parsedReplies}/>
        <TopicReplyList
          userId={userId}
          user={currentUser}
          forumId={forumId}
          topicId={topic.id}
          newCommentContent={newCommentStore.get('text')}
          replies={parsedReplies}
          submitNewComment={this.submitNewComment}
          onNewCommentUpdate={this.onNewCommentUpdate}
          onReplyCommentsClicked={this.onReplyCommentsClicked}
          onItemSubscribeButtonClick={this.onReplySubscribeButtonClick}/>
        <TopicReplyEditor
          user={currentUser}
          isSignedIn={isSignedIn}
          value={newReplyContent}
          onChange={this.onEditorUpdate}
          onSubmit={this.onEditorSubmit}
          onEditorClick={this.onEditorClick}/>
      </main>
    );
  },

  onEditorUpdate(val){
    dispatch(updateReplyBody(val));
  },

  onEditorSubmit(){
    const {currentUserStore, newReplyStore} = this.props;
    const isSignedIn = currentUserStore.getIsSignedIn();


    if(isSignedIn) {
      dispatch(submitNewReply(newReplyStore.get('text')));
      //Clear input
      newReplyStore.clear();
      this.setState((state) => Object.assign(state, {
        newReplyContent: '',
      }));
    }
    else {
      requestSignIn(EDITOR_SUBMIT_LINK_SOURCE);
    }
  },

  onEditorClick() {
    const { currentUserStore } = this.props;
    const isSignedIn = currentUserStore.getIsSignedIn();

    if(!isSignedIn) {
      requestSignIn(EDITOR_CLICK_LINK_SOURCE);
    }
  },

  onForumUpdate() {
    const { forumStore } = this.props;
    this.setState((state) => Object.assign(state, {
      forumId: forumStore.getForumId(),
      forumSubscriptionState: forumStore.getSubscriptionState()
    }));
  },

  onTopicsUpdate() {
    const { topicsStore, topicId } = this.props;
    this.setState((state) => Object.assign(state, {
      topic: topicsStore.getById(topicId)
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
    this.forceUpdate();
  },

  updateNewComment(){ this.forceUpdate(); },

  getParsedReplies(){
    const {repliesStore, commentsStore} = this.props;
    return repliesStore.getReplies().map((reply) => Object.assign({}, reply, {
      comments: commentsStore.getCommentsByReplyId(reply.id),
      isCommenting: commentsStore.getActiveReplyId() === reply.id,
    }))
  },

  onTopicSubscribeButtonClick() {
    const { currentUserStore, topicsStore, topicId } = this.props;
    const { forumId } = this.state;

    const currentUser = currentUserStore.getCurrentUser();
    const userId = currentUser.id;
    const topic = topicsStore.getById(topicId);
    const subscriptionState = topic.subscriptionState;
    const desiredIsSubscribed = (subscriptionState !== SUBSCRIPTION_STATE_SUBSCRIBED);

    dispatch(requestUpdateTopicSubscriptionState(forumId, topicId, userId, desiredIsSubscribed));
  },


  onReplySubscribeButtonClick(e, replyId) {
    const {currentUserStore, repliesStore, topicId} = this.props;
    const { forumId } = this.state;

    const currentUser = currentUserStore.getCurrentUser();
    const userId = currentUser.id;
    const reply = repliesStore.getById(replyId);
    const subscriptionState = reply.subscriptionState;
    const desiredIsSubscribed = (subscriptionState !== SUBSCRIPTION_STATE_SUBSCRIBED);

    dispatch(requestUpdateReplySubscriptionState(forumId, topicId, replyId, userId, desiredIsSubscribed));
  },

  onReplyCommentsClicked(replyId){
    dispatch(showReplyComments(replyId));
  },


  onNewCommentUpdate(replyId, val) {
    dispatch(updateCommentBody(replyId, val));
  },

  submitNewComment(){
    const {newCommentStore} = this.props;
    dispatch(submitNewComment(
      newCommentStore.get('replyId'),
      newCommentStore.get('text')
    ));
  }

});

export default TopicContainer;
