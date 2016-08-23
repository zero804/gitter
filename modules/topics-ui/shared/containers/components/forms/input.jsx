import React, { PropTypes } from 'react';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'Input',
  propTypes: {
    name: PropTypes.string.isRequired,
    placeholder: PropTypes.string.isRequired,
    className: PropTypes.string,
    onChange: PropTypes.func.isRequired,
  },

  render(){

    const { name, className, placeholder } = this.props;
    const compiledClass = classNames('input', className);

    return (
      <input
        className={compiledClass}
        name={name}
        placeholder={placeholder}
        onChange={this.onChange}/>
    );
  },

  onChange(e){
    e.preventDefault();
    this.props.onChange(e.target.value);
  }

});
