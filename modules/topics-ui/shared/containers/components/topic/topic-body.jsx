import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import EditableContent from '../forms/editable-content.jsx';
import WatchButton from '../forum/watch-button.jsx';
import ReactionButton from '../forum/reaction-button.jsx';

export default React.createClass({

  displayName: 'TopicBody',
  propTypes: {
    topic: PropTypes.shape({
      body: PropTypes.shape({
        html: PropTypes.string
      }).isRequired,
      canEdit: PropTypes.bool.isRequired,
    }).isRequired,
    onSubscribeButtonClick: PropTypes.func,
    onReactionPick: PropTypes.func,
    onEditTopicClick: PropTypes.func.isRequired,
    onTopicEditUpdate: PropTypes.func.isRequired,
    onTopicEditCancel: PropTypes.func.isRequired,
    onTopicEditSave: PropTypes.func.isRequired
  },

  render() {
    const {topic} = this.props;
    //Remove the share button for now as we have no current ability
    //to share content
    //<button className="topic-body__footer__action">Share</button>
    return (
      <Container className="container--topic-body">
        <Panel
          id={topic.id}
          className="panel--topic-body">
          {this.getContent()}
          <footer className="topic-body__footer">
            {this.getEditButton()}
            {this.getFooterButtons()}
          </footer>
        </Panel>
      </Container>
    );
  },

  getFooterButtons(){
    const {topic, onSubscribeButtonClick} = this.props;
    const subscriptionState = topic.subscriptionState;
    const {isEditing} = this.state;
    if(isEditing) { return; }

    return [

      <WatchButton
        subscriptionState={subscriptionState}
        className="topic-body__footer__subscribe-action"
        itemClassName="topic-body__footer__subscribe-action-text-item"
        onClick={onSubscribeButtonClick}/>,

        <ReactionButton
          key="reactions"
          className="topic-body__footer__reaction-action"
          reactionCountMap={topic.reactions}
          ownReactionMap={topic.ownReactions}
          onReactionPick={this.onReactionPick}/>
    ]
  },

  getEditButton() {
    //Don't show the button if we are editing
    const { topic } = this.props;
    const { isEditing } = topic;
    if(isEditing) { return; }

    //Only show the edit button if the user has permission
    const {canEdit} = this.props.topic;
    if(!canEdit) { return; }

    return (
      <button
        onClick={this.onEditTopicClick}
        className="topic-body__footer__action">Edit</button>
    );
  },

  getContent() {
    const { topic } = this.props;
    const { isEditing } = topic;
    return (
      <EditableContent
        className="topic-body__content"
        editorClassName="topic-body__content--editor"
        content={topic}
        onChange={this.onTopicEditUpdate}
        onSave={this.onTopicEditSave}
        onCancel={this.onTopicEditCancel}
        isEditing={isEditing} />
    );
  },

  onEditTopicClick() {
    this.props.onEditTopicClick();
  },

  onTopicEditUpdate(value){
    this.props.onTopicEditUpdate(value);
  },

  onTopicEditSave(){
    this.props.onTopicEditSave();
  },

  onTopicEditCancel(){
    this.props.onTopicEditCancel();
  },

  onReactionPick(reactionKey, isReacting) {
    const {topic, onReactionPick} = this.props;
    if(onReactionPick) {
      onReactionPick(topic.id, reactionKey, isReacting);
    }
  },


});
