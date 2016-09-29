import React, { PropTypes } from 'react';
import classNames from 'classnames';
import {ENTER_KEY} from '../../../constants/keys';

export default React.createClass({

  displayName: 'Editor',
  propTypes: {
    className: PropTypes.string,
    name: PropTypes.string,
    children: PropTypes.node,
    onChange: PropTypes.func.isRequired,
    onEnter: PropTypes.func,
    onClick: PropTypes.func,
    value: PropTypes.string,
    placeholder: PropTypes.string,
    autoFocus: PropTypes.bool,
    valid: PropTypes.bool,
  },

  getDefaultProps(){
    return { autoFocus: false }
  },

  getInitialState(){
    return { value: this.props.value }
  },

  render(){

    const { className, name, placeholder, autoFocus, valid } = this.props;
    const { value } = this.state;
    const compiledClass = classNames({
      editor: true,
      valid: (valid === true),
      invalid: (valid === false),
    }, className);

    return (
      <textarea
        autoFocus={autoFocus}
        ref="editor"
        className={compiledClass}
        name={name}
        value={value}
        onChange={this.onChange}
        placeholder={placeholder}
        onClick={this.onClick}
        onKeyDown={this.onKeyPressed}>
        { this.props.children }
      </textarea>
    );
  },

  onChange(e){
    e.preventDefault();
    const { value } = e.target;
    this.setState({ value: value });
    this.props.onChange(value);
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
  }

});
