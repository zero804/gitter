import React, {PropTypes} from 'react';
import Modal from '../modal.jsx';
import Input from '../forms/input.jsx';
import H1 from '../text/h-1.jsx';
import Editor from '../forms/editor.jsx';
import Submit from '../forms/submit.jsx';

export default React.createClass({

  displayName: 'CreateTopicModal',
  propTypes: {
    active: PropTypes.bool.isRequired,
    onSubmit: PropTypes.func.isRequired,
    onTitleChange: PropTypes.func.isRequired,
    onBodyChange: PropTypes.func.isRequired,
    //
  },

  render(){
    const { active } = this.props;
    return (
      <Modal active={active}>
        <form name="create-topic" onSubmit={this.onSubmit}>
          <H1 className="create-topic__heading">New Topic</H1>
          <Input className="create-topic__input--name" name="title" placeholder="Add title ..." onChange={this.onTitleChange}/>
          <Editor className="create-topic__editor--body" name="body" onChange={this.onBodyChange}/>
          <div className="create-topic__control-row">
            <Submit className="create-topic__submit">Create Topic</Submit>
          </div>
        </form>
      </Modal>
    );
  },

  onTitleChange(title){
    this.props.onTitleChange(title);
  },

  onBodyChange(body){
    this.props.onBodyChange(body);
  },

  onSubmit(e){
    e.preventDefault();
    this.props.onSubmit();
  }

});
