import React, { PropTypes } from 'react';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'Input',
  propTypes: {
    name: PropTypes.string.isRequired,
    placeholder: PropTypes.string,
    className: PropTypes.string,
    autoComplete: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
  },

  getDefaultProps(){
    return {
      autoComplete: "on",
    };
  },

  render(){

    const { name, className, placeholder, autoComplete, onFocus, onBlur } = this.props;
    const compiledClass = classNames('input', className);

    return (
      <input
        className={compiledClass}
        name={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={this.onChange}/>
    );
  },

  onChange(e){
    e.preventDefault();
    this.props.onChange(e.target.value);
  }

});
