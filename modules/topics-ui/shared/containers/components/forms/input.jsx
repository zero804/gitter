import React, { PropTypes } from 'react';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'Input',
  propTypes: {
    name: PropTypes.string.isRequired,
    placeholder: PropTypes.string.isRequired,
    className: PropTypes.string
  },

  render(){

    const { name, className, placeholder } = this.props;
    const compiledClass = classNames('input', className);

    return (
      <input className={compiledClass} name={name} placeholder={placeholder}/>
    );
  }

});
