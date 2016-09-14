import React, { PropTypes } from 'react';
import classNames from 'classnames';
import {ENTER_KEY} from '../../../constants/keys';

export default React.createClass({

  displayName: 'Editor',
  propTypes: {
    className: PropTypes.string,
    name: PropTypes.string,
    children: PropTypes.node,
    onChange: PropTypes.func,
    onEnter: PropTypes.func,
    value: PropTypes.string,
    placeholder: PropTypes.string,
  },

  onComponentDidMount(){

  },

  render(){

    const { className, name, value, placeholder } = this.props;
    const compiledClass = classNames('editor', className);

    return (
      <textarea
        ref="editor"
        className={compiledClass}
        name={name}
        value={value}
        onChange={this.onChange}
        placeholder={placeholder}
        onKeyDown={this.onKeyPressed}>
        { this.props.children }
      </textarea>
    );
  },

  onChange(e){
    e.preventDefault();
    this.props.onChange(e.target.value);
  },

  onKeyPressed(e) {
    const {onEnter} = this.props;
    if(e.keyCode === ENTER_KEY && onEnter){
      onEnter();
    }
  }

});
