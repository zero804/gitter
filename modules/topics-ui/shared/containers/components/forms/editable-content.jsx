import React, { PropTypes } from 'react';
import Editor from './editor.jsx';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'EditableContent',
  propTypes: {
    className: PropTypes.string,
    editorClassName: PropTypes.string,
    isEditing: PropTypes.bool,
    htmlContent: PropTypes.string,
    textContent: PropTypes.string,
    markdownContent: PropTypes.string,
    onChange: PropTypes.func.isRequired,
  },

  getDefaultProps(){
    return { isEditing: false, value: '' }
  },

  render(){
    const {isEditing, textContent, htmlContent, markdownContent, className, editorClassName} = this.props;
    const compiledClass = classNames('editable-content', className);
    const compiledEditorClass = classNames("editable-content__editor", editorClassName);
    if(!isEditing) {
      if(textContent) { //Unsafe User generated Content
        return (
          <section className={compiledClass}>
            {textContent}
          </section>
        );
      }
      //Safe from server markdown
      return (
        <div
          className={compiledClass}
          dangerouslySetInnerHTML={{ __html: htmlContent }} />
      );
    }
    //Editable Content
    return (
      <Editor
        value={markdownContent}
        className={compiledEditorClass}
        onChange={this.onContentUpdate} />
    );
  },

  onContentUpdate(val){
    this.props.onChange(val);
  }

});
