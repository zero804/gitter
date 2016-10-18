import React, { PropTypes } from 'react';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'Input',
  propTypes: {
    name: PropTypes.string,
    placeholder: PropTypes.string,
    className: PropTypes.string,
    autoComplete: PropTypes.string,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    valid: PropTypes.bool
  },

  getDefaultProps(){
    return {
      autoComplete: "on"
    };
  },

  render(){

    const {
      name,
      className,
      placeholder,
      value,
      autoComplete,
      onFocus,
      onBlur,
      valid
    } = this.props;

    const compiledClass = classNames({
      input: true,
      invalid: (valid === false),
    }, className);

    return (
      <input
        className={compiledClass}
        name={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
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
