import React, { PropTypes } from 'react';
import classNames from 'classnames';
import { DELETE_STATE_VOID, DELETE_STATE_FIRST_ENCOUNTER } from '../../../constants/topic';

import Tooltip from '../tooltip.jsx';
import Editor from './editor.jsx';


export default React.createClass({

  displayName: 'EditableContent',
  propTypes: {
    content: PropTypes.shape({
      text: PropTypes.string,
      body: PropTypes.shape({
        text: PropTypes.string,
        html: PropTypes.string,
      })
    }).isRequired,
    className: PropTypes.string,
    editorClassName: PropTypes.string,
    isEditing: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
  },

  getDefaultProps() {
    return {
      isEditing: false,
      value: ''
    };
  },

  getInitialState() {
    return {
      deleteState: DELETE_STATE_VOID
    };
  },

  render(){
    const {isEditing} = this.props;
    if(!isEditing) { return this.getDisplayContent(); }
    return this.getEditorContent();
  },

  getDisplayContent(){
    const {content, className} = this.props;
    const compiledClass = classNames('editable-content', className);
    //If we are not editing the content and the content
    //has a property of text we can assume it has only just been submitted
    //to the server so we treat it as dirty.

    if(content.text) {
      return (
        <section className={compiledClass}>
          {content.text}
        </section>
      );
    }

    //Once a request has returned from the server the text property will be deleted
    //and rendered markdown will be present so we can rendered a such.
    return (
      <div
        className={compiledClass}
        dangerouslySetInnerHTML={{ __html: content.body.html }} />
    );
  },

  getEditorContent(){
    const { content, editorClassName } = this.props;
    const { deleteState } = this.state;
    const compiledEditorClass = classNames('editable-content__editor', editorClassName);

    //Assume we want the initial text content of the resource from the server
    let text = content.body.text;

    //If we have a property of text we can assume this is the updated content we require
    //we should account for a updated text content of '' if a user deleted everything
    if(content.text || content.text === '') {
      text = content.text;
    }

    let tooltip = '';
    if(deleteState === DELETE_STATE_FIRST_ENCOUNTER) {
      tooltip = 'Are you sure?'
    }

    return (
      <section
        className={compiledEditorClass}>
        <Editor
          value={text}
          onChange={this.onContentUpdate} />
        <footer className="editable-content__footer">
          <button
            className="editable-content__cancel"
            onClick={this.onCancelClicked}>
            Cancel
          </button>
          <Tooltip
            tooltip={tooltip}
            elementType="button"
            className="editable-content__delete"
            onClick={this.onDeleteClick}
            onBlur={this.onDeleteBlur}>
            Delete
          </Tooltip>
          <button
            className="editable-content__save"
            onClick={this.onSaveClicked}>
            Update
          </button>
        </footer>
      </section>
    );
  },

  onContentUpdate(val){
    this.props.onChange(val);
  },

  onCancelClicked(e){
    e.preventDefault();
    this.props.onCancel();
  },

  onDeleteClick(e) {
    const { onDelete } = this.props;
    const { deleteState } = this.state;

    if(deleteState === DELETE_STATE_VOID) {
      this.setState({
        deleteState: DELETE_STATE_FIRST_ENCOUNTER
      });
    }
    else if(deleteState === DELETE_STATE_FIRST_ENCOUNTER) {
      onDelete();
      this.setState({
        deleteState: DELETE_STATE_VOID
      });
    }

    e.preventDefault();
  },

  onDeleteBlur() {
    this.setState({
      deleteState: DELETE_STATE_VOID
    });
  },

  onSaveClicked(e){
    e.preventDefault();
    this.props.onSave();
  }

});
