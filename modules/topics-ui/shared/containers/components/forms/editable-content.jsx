import React, { PropTypes } from 'react';
import Editor from './editor.jsx';
import classNames from 'classnames';

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
  },

  getDefaultProps(){
    return { isEditing: false, value: '' }
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
    const {content, editorClassName} = this.props;
    const compiledEditorClass = classNames("editable-content__editor", editorClassName);

    //Assume we want the initial text content of the resource from the server
    let text = content.body.text;

    //If we have a property of text we can assume this is the updated content we require
    //we should account for a updated text content of '' if a user deleted everything
    if(content.text || content.text === '') {
      text = content.text;
    }

    return (
      <section
        className={compiledEditorClass}>
        <Editor
          value={text}
          onChange={this.onContentUpdate} />
        <footer className="editable-content__footer">
          <button
            className="editable-content__save"
            onClick={this.onSaveClicked}>
            Update
          </button>
          <button
            className="editable-content__cancel"
            onClick={this.onCancelClicked}>
            Cancel
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

  onSaveClicked(e){
    const {content} = this.props;
    e.preventDefault();
    this.props.onSave();
  }

});
