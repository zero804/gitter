import React, {PropTypes, createClass} from 'react';
import {dispatch} from '../dispatcher';
import canEdit from '../utils/can-edit';

import TopicHeader from './components/topic/topic-header.jsx';
import TopicBody from './components/topic/topic-body.jsx';
import SearchHeaderContainer from './components/search/SearchHeaderContainer.jsx';
import TopicReplyEditor from './components/topic/topic-reply-editor.jsx';
import TopicReplyListHeader from './components/topic/topic-reply-list-header.jsx';
import TopicReplyList from './components/topic/topic-reply-list.jsx';
import TopicReplyListItem from './components/topic/topic-reply-list-item.jsx';

import updateReplyBody from '../action-creators/create-reply/body-update';
import submitNewReply from '../action-creators/create-reply/submit-new-reply';
import updateCommentBody from '../action-creators/create-comment/body-update';
import submitNewComment from '../action-creators/create-comment/submit-new-comment';
import showReplyComments from '../action-creators/topic/show-reply-comments';
import updateReply from '../action-creators/topic/update-reply';
import cancelUpdateReply from '../action-creators/topic/cancel-update-reply';
import saveUpdatedReply from '../action-creators/topic/save-update-reply';
import updateComment from '../action-creators/topic/update-comment.js';
import updateCancelComment from '../action-creators/topic/update-cancel-comment.js';
import updateSaveComment from '../action-creators/topic/update-save-comment.js';
import updateTopic from '../action-creators/topic/update-topic';
import updateCancelTopic from '../action-creators/topic/update-cancel-topic';
import updateSaveTopic from '../action-creators/topic/update-save-topic';
import requestUpdateTopicSubscriptionState from '../action-creators/forum/request-update-topic-subscription-state';
import requestUpdateReplySubscriptionState from '../action-creators/forum/request-update-reply-subscription-state';
import requestSignIn from '../action-creators/forum/request-sign-in';
import topicReplySortByComments from '../action-creators/topic/topic-replies-sort-by-comments';
import topicReplySortByLike from '../action-creators/topic/topic-replies-sort-by-liked';
import topicReplySortByReplies from '../action-creators/topic/topic-replies-sort-by-recent';

import { SUBSCRIPTION_STATE_SUBSCRIBED } from '../constants/forum.js';
const EDITOR_SUBMIT_LINK_SOURCE = 'topics-reply-editor-submit-button';
const EDITOR_CLICK_LINK_SOURCE = 'topics-reply-editor-click';

const TopicContainer = createClass({

  displayName: 'TopicContainer',
  propTypes: {

    topicId: PropTypes.string.isRequired,
    groupUri: PropTypes.string.isRequired,

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
    commentsStore.onChange(this.updateComments, this);
    topicsStore.onChange(this.updateTopics, this);

    newCommentStore.onChange(this.updateNewComment, this);
    newReplyStore.onChange(this.updateNewReplyContent, this);
  },


  componentWillUnmount(){
    const {forumStore, topicsStore, repliesStore, newReplyStore, commentsStore, newCommentStore} = this.props;

    forumStore.removeListeners(this.onForumUpdate, this);
    topicsStore.removeListeners(this.onTopicsUpdate, this);
    repliesStore.removeListeners(this.updateReplies, this);
    commentsStore.removeListeners(this.updateComments, this);
    topicsStore.removeListeners(this.updateTopics, this);

    newCommentStore.removeListeners(this.updateNewComment, this);
    newReplyStore.removeListeners(this.updateNewReplyContent, this);
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

  getParsedTopic(){
    const { topicId, topicsStore, forumStore, currentUserStore } = this.props;
    const topic = topicsStore.getById(topicId);
    const forum = forumStore.getForum();
    const currentUser = currentUserStore.getCurrentUser();
    return Object.assign({}, topic, {
      canEdit: canEdit(forum, currentUser, topic),
    });
  },

  //TODO We need to cache this result somewhere
  //otherwise this is going to get very time consuming
  //https://github.com/troupe/gitter-webapp/issues/2186
  getParsedReplies(){
    const {repliesStore, commentsStore, forumStore, currentUserStore} = this.props;
    const forum = forumStore.getForum();
    const currentUser = currentUserStore.getCurrentUser();

    return repliesStore.getReplies().map((reply) => Object.assign({}, reply, {
      comments: this.getParsedCommentsForReply(reply.id),
      isCommenting: commentsStore.getActiveReplyId() === reply.id,
      canEdit: canEdit(forum, currentUser, reply)
    }));
  },

  //TODO need to cache here as well
  getParsedCommentsForReply(replyId) {
    const {commentsStore, forumStore, currentUserStore} = this.props;
    const forum = forumStore.getForum();
    const currentUser = currentUserStore.getCurrentUser();

    return commentsStore.getCommentsByReplyId(replyId)
    .map((comment) => Object.assign({}, comment, {
      canEdit: canEdit(forum, currentUser, comment)
    }));
  },


  render(){

    const { categoryStore, currentUserStore, tagStore, groupUri, newReplyStore} = this.props;
    const {forumId, forumSubscriptionState } = this.state;

    const newReplyContent = newReplyStore.getTextContent();
    const topic = this.getParsedTopic();
    const parsedReplies = this.getParsedReplies();

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

    return (
      <main>
        <SearchHeaderContainer
          userId={userId}
          forumId={forumId}
          groupUri={groupUri}
          subscriptionState={forumSubscriptionState}/>
        <article>
          <TopicHeader
            topic={topic}
            category={category}
            groupUri={groupUri}
            tags={tags}/>
          <TopicBody
            topic={topic}
            onTopicEditUpdate={this.onTopicEditUpdate}
            onTopicEditCancel={this.onTopicEditCancel}
            onTopicEditSave={this.onTopicEditSave}/>
        </article>
        <TopicReplyListHeader
          replies={parsedReplies}
          onSortByCommentClicked={this.onSortByCommentClicked}
          onSortByLikeClicked={this.onSortByLikeClicked}
          onSortByRecentClicked={this.onSortByRecentClicked}/>
        <TopicReplyList>
          {parsedReplies.map(this.getReplyListItem)}
        </TopicReplyList>
        <TopicReplyEditor
          user={currentUser}
          isSignedIn={isSignedIn}
          value={newReplyContent}
          onChange={this.onNewReplyEditorUpdate}
          onSubmit={this.onNewReplyEditorSubmit}
          onEditorClick={this.onReplyEditorClick}/>
      </main>
    );
  },


  getReplyListItem(reply, index){
    const {newCommentStore, currentUserStore } = this.props;
    const currentUser = currentUserStore.getCurrentUser();
    return (
      <TopicReplyListItem
        reply={reply}
        key={`topic-reply-list-item-${reply.id}-${index}`}
        user={currentUser}
        newCommentContent={newCommentStore.get('text')}
        onCommentsClicked={this.onReplyCommentsClicked}
        onNewCommentUpdate={this.onNewCommentUpdate}
        submitNewComment={this.submitNewComment}
        onReplyEditUpdate={this.onReplyEditUpdate}
        onReplyEditCancel={this.onReplyEditCancel}
        onReplyEditSaved={this.onReplyEditSaved}
        onCommentEditUpdate={this.onCommentEditUpdate}
        onCommentEditCancel={this.onCommentEditCancel}
        onCommentEditSave={this.onCommentEditSave}
        onSubscribeButtonClick={this.onTopicSubscribeButtonClick} />
    );
  },

  onNewReplyEditorUpdate(val){
    dispatch(updateReplyBody(val));
  },

  onNewReplyEditorSubmit(){
    const {newReplyStore, currentUserStore} = this.props;
    const isSignedIn = currentUserStore.getIsSignedIn();

    if(isSignedIn) {
      const text = newReplyStore.get('text');
      //Never submit blank content
      if(!text) { return; }
      dispatch(submitNewReply(text));
    }

    else {
      requestSignIn(EDITOR_SUBMIT_LINK_SOURCE);
    }
  },

  onReplyEditorClick() {
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

  updateNewReplyContent(){
    this.forceUpdate();
  },

  updateReplies(){
    const {repliesStore} = this.props;
    this.setState((state) => Object.assign(state, {
      replies: repliesStore.getReplies(),
      newReplyContent: '',
    }));
  },

  updateComments(){ this.forceUpdate(); },
  updateNewComment(){ this.forceUpdate(); },
  updateTopics() { this.forceUpdate(); },

  onTopicSubscribeButtonClick() {
    const { topicsStore, topicId } = this.props;
    const topic = topicsStore.getById(topicId);
    const subscriptionState = topic.subscriptionState;
    const desiredIsSubscribed = (subscriptionState !== SUBSCRIPTION_STATE_SUBSCRIBED);
    dispatch(requestUpdateTopicSubscriptionState(topicId, desiredIsSubscribed));
  },


  onReplySubscribeButtonClick(e, replyId) {
    const { repliesStore } = this.props;

    const reply = repliesStore.getById(replyId);
    const subscriptionState = reply.subscriptionState;
    const desiredIsSubscribed = (subscriptionState !== SUBSCRIPTION_STATE_SUBSCRIBED);

    dispatch(requestUpdateReplySubscriptionState(replyId, desiredIsSubscribed));
  },

  onReplyCommentsClicked(replyId){
    dispatch(showReplyComments(replyId));
  },


  onNewCommentUpdate(replyId, val) {
    dispatch(updateCommentBody(replyId, val));
  },

  submitNewComment(){
    const {newCommentStore} = this.props;
    const text = newCommentStore.get('text');
    //Dont submit blank content
    if(!text) { return; }
    dispatch(submitNewComment(newCommentStore.get('replyId'), text ));
  },


  onReplyEditUpdate(replyId, value){
    dispatch(updateReply(replyId, value));
  },

  onReplyEditCancel(replyId) {
    dispatch(cancelUpdateReply(replyId));
  },

  onReplyEditSaved(replyId){
    dispatch(saveUpdatedReply(replyId));
  },

  onCommentEditUpdate(commentId, value){
    dispatch(updateComment(commentId, value));
  },

  onCommentEditCancel(commentId) {
    dispatch(updateCancelComment(commentId));
  },

  onCommentEditSave(commentId, replyId){
    dispatch(updateSaveComment(commentId, replyId));
  },

  onTopicEditUpdate(value){
    dispatch(updateTopic(value));
  },

  onTopicEditCancel(){
    dispatch(updateCancelTopic());
  },

  onTopicEditSave(){
    dispatch(updateSaveTopic());
  },

  onSortByCommentClicked(){
    dispatch(topicReplySortByComments());
  },

  onSortByLikeClicked(){
    dispatch(topicReplySortByLike());
  },

  onSortByRecentClicked(){
    dispatch(topicReplySortByReplies());
  },

});

export default TopicContainer;
