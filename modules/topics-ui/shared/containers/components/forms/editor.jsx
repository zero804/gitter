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
  },

  render(){

    const { className, name} = this.props;
    const compiledClass = classNames('editor', className);

    return (
      <textarea
        className={compiledClass}
        name={name}
        onChange={this.onChange}
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
