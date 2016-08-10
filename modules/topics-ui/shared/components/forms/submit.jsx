"use strict";

import React, { PropTypes } from 'react';

export default React.createClass({

  displayName: 'Submit',
  propTypes: {
    className: PropTypes.string
  },

  render(){

    const { className } = this.props;
    const compiledClass = !!className ? `submit-button ${className}` : 'submit-button';

    return (
      <button type="submit" className={compiledClass}>
        {this.props.children}
      </button>
    );
  }

});
