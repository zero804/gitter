import React, { PropTypes } from 'react';
import classNames from 'classnames';
import {ENTER_KEY} from '../../../constants/keys';

export default React.createClass({

  displayName: 'Editor',
  propTypes: {
    //Props
    value: PropTypes.string,
    name: PropTypes.string,
    autoFocus: PropTypes.bool,
    className: PropTypes.string,
    children: PropTypes.node,
    valid: PropTypes.bool,
    placeholder: PropTypes.string,

    //Events
    onChange: PropTypes.func.isRequired,
    onEnter: PropTypes.func,
    onClick: PropTypes.func,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
  },

  getDefaultProps(){
    return { autoFocus: false }
  },

  render(){

    const { className, name, value, placeholder, autoFocus, valid } = this.props;
    const compiledClass = classNames({
      editor: true,
      valid: (valid === true),
      invalid: (valid === false),
    }, className);

    return (
      <textarea
        ref="editor"
        value={value}
        name={name}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={compiledClass}
        onChange={this.onChange}
        onClick={this.onClick}
        onKeyDown={this.onKeyPressed}
        onFocus={this.onFocus}
        onBlur={this.onBlur}>
        { this.props.children }
      </textarea>
    );
  },

  onChange(e){
    e.preventDefault();
    this.props.onChange(e.target.value);
  },

  onClick() {
    const { onClick } = this.props;
    if(onClick) {
      onClick(...arguments);
    }
  },

  onKeyPressed(e) {
    const {onEnter} = this.props;
    if(e.keyCode === ENTER_KEY && onEnter){
      e.preventDefault();
      e.stopPropagation();
      onEnter();
    }
  },

  onFocus() {
    const {onFocus} = this.props;
    if(!onFocus) { return; }
    onFocus();
  },

  onBlur(){
    const {onBlur} = this.props;
    if(!onBlur) { return; }
    onBlur();
  }

});
