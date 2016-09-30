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
    onTopicEditUpdate: PropTypes.func.isRequired,
    onTopicEditCancel: PropTypes.func.isRequired,
    onTopicEditSave: PropTypes.func.isRequired
  },

  getInitialState(){
    return { isEditing: false }
  },

  render() {

    const { topic, onSubscribeButtonClick } = this.props;
    const subscriptionState = topic.subscriptionState;

    return (
      <Container className="container--topic-body">
        <Panel className="panel--topic-body">
          {this.getContent()}
          <footer className="topic-body__footer">
            <ReactionButton
              key="reactions"
              className="topic-body__footer__reaction-action"
              reactionCountMap={topic.reactionCounts}
              ownReactionMap={topic.ownReactions}
              onReactionPick={this.onReactionPick}/>
            <button className="topic-body__footer__action">Share</button>
            {this.getEditButton()}
            <WatchButton
              subscriptionState={subscriptionState}
              className="topic-body__footer__subscribe-action"
              itemClassName="topic-body__footer__subscribe-action-text-item"
              onClick={onSubscribeButtonClick}/>
          </footer>
        </Panel>
      </Container>
    );
  },

  getEditButton(){
    //Don't show the button if we are editing
    const {isEditing} = this.state;
    if(isEditing) { return; }

    //Only show the edit button if the user has permission
    const {canEdit} = this.props.topic;
    if(!canEdit) { return; }

    return (
      <button
        onClick={this.onEditTopicClicked}
        className="topic-body__footer__action">Edit</button>
    );
  },

  getContent(){
    const {isEditing} = this.state;
    const {topic} = this.props;
    return (
      <EditableContent
        className="topic-body__content"
        editorClassName="topic-body__content--editor"
        content={topic}
        onChange={this.onTopicEditUpdate}
        onSave={this.onTopicEditSave}
        onCancel={this.onTopicEditCancel}
        isEditing={isEditing}/>
    );
  },

  onEditTopicClicked(e){
    e.preventDefault();
    this.setState({ isEditing: true });
  },

  onTopicEditUpdate(value){
    this.props.onTopicEditUpdate(value);
  },

  onTopicEditSave(){
    this.props.onTopicEditSave();
    this.setState({ isEditing: false });
  },

  onTopicEditCancel(){
    this.props.onTopicEditCancel();
    this.setState({ isEditing: false });
  },

  onReactionPick(reactionKey, isReacting) {
    const {topic, onReactionPick} = this.props;
    if(onReactionPick) {
      onReactionPick(topic.id, reactionKey, isReacting);
    }
  },


});
