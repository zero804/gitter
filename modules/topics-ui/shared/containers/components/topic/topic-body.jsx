import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import EditableContent from '../forms/editable-content.jsx';

export default React.createClass({

  displayName: 'TopicBody',
  propTypes: {
    topic: PropTypes.shape({
      body: PropTypes.shape({
        html: PropTypes.string
      }).isRequired,
    }).isRequired,
    onTopicUpdate: PropTypes.func.isRequired,
  },

  getInitialState(){
    return { isEditing: false }
  },

  render(){
    //TODO need to add permissions into this
    return (
      <Container className="container--topic-body">
        <Panel className="panel--topic-body">
          {this.getContent()}
          <footer className="topic-body__footer">
            <button className="topic-body__footer__action">Share</button>
            <button className="topic-body__footer__action">Watch</button>
            {this.getEditButton()}
          </footer>
        </Panel>
      </Container>
    );
  },

  getEditButton(){
    const {isEditing} = this.state;
    if(isEditing) { return; }
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
        onChange={this.onTopicUpdate}
        isEditing={isEditing}/>
    );
  },

  onEditTopicClicked(e){
    e.preventDefault();
    this.setState((state) => Object.assign({}, state, {
      isEditing: true,
    }))
  },

  onTopicUpdate(value){
    this.props.onTopicUpdate(value);
  }

});
