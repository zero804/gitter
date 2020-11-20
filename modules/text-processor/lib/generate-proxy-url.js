'use strict';

const crypto = require('crypto');
const urlJoin = require('url-join');
const env = require('gitter-web-env');
const config = env.config;

const camoUrl = config.get('camo:camoUrl');
const camoSecret = config.get('camo:camoSecret');

// If camo config is in place, generate proxied URL
//
// We should also keep the gitter-markdown-processor implementation in sync:
// https://gitlab.com/gitlab-org/gitter/gitter-markdown-processor/-/blob/9e40abf0bc4b0cc57a5d5e1994dbff5268ee9a2e/lib/process-chat.js#L169-183
function generateProxyUrl(url) {
  if (!camoUrl || !camoSecret) {
    return url;
  }

  const digest = crypto
    .createHmac('sha1', camoSecret)
    .update(url)
    .digest('hex');

  const encodedUrl = Buffer.from(url, 'utf8').toString('hex');

  return urlJoin(camoUrl, digest, encodedUrl);
}

module.exports = generateProxyUrl;
