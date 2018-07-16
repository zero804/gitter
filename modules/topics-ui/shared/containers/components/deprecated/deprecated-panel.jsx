import React, { PropTypes } from 'react';

export default React.createClass({
  displayName: 'DeprecatedPanel',
  propTypes: {
    isAdmin: PropTypes.bool,
    downloadTopicsUri: PropTypes.string,
    deprecatedBlogUrl: PropTypes.string,
  },

  render(){
    const { isAdmin, downloadTopicsUri, deprecatedBlogUrl } = this.props;

    let adminControls = '';
    if(isAdmin) {
      adminControls = (
        <span>
          &nbsp;
          <a
            className="deprecated-panel__download-button"
            href={downloadTopicsUri}
            target="_blank"
          >
            Download topics
          </a>
          &nbsp;
          <span className="deprecated-panel__download-note">
            (rate-limited to once per hour)
          </span>
        </span>
      )
    }

    return (
      <div className="panel panel--deprecated">
        Topics is deprecated and will be removed on September 1st(2018-9-1), <a
          className="deprecated-panel__read-more-link"
          href={deprecatedBlogUrl}
          target="_blank"
        >
          read more
        </a>.
        {adminControls}
      </div>
    );
  }

});
