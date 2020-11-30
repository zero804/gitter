'use strict';

const escapeStringRegexp = require('escape-string-regexp');
const userService = require('gitter-web-users');
const env = require('gitter-web-env');
const config = env.config;

const homeserverUrl = config.get('matrix:bridge:homeserverUrl');
const configuredServerName = config.get('matrix:bridge:serverName');

const PILL_REGEX = /<a href="https:\/\/matrix\.to\/#\/(#|@|\+)([^"]+)">([^<]+)<\/a>/g;

const GITTER_MXID_LOCALPART_REGEX = /@(.*?)-([a-f0-9]+)/;

// via https://github.com/matrix-org/matrix-appservice-slack/blob/47d5af9caad2f21983e429f9868c70d702707410/src/substitutions.ts#L213-L241
function getPillMapFromHtml(htmlBody) {
  const ret = {
    users: [],
    aliases: [],
    communities: []
  };
  const MAX_ITERATIONS = 15;
  let res = PILL_REGEX.exec(htmlBody);
  for (let i = 0; i < MAX_ITERATIONS && res != null; i++) {
    const sigil = res[1];
    const item = {
      id: res[1] + res[2],
      text: res[3]
    };
    if (sigil === '@') {
      ret.users.push(item);
    } else if (sigil === '#') {
      ret.aliases.push(item);
    } else if (sigil === '+') {
      ret.communities.push(item);
    }
    res = PILL_REGEX.exec(htmlBody);
  }
  return ret;
}

async function replacePills(content) {
  const pillMap = getPillMapFromHtml(content.formatted_body);
  let resultantBody = content.body;
  for (const user of pillMap.users) {
    // Only replace pill mentions for `*:gitter.im`
    const [localPart, serverName] = user.id.split(':');

    let replacementText;
    // If the MXID is from the Gitter homeserver, it's probably a bridged user from Gitter.
    // So we need to replace that MXID with their actual Gitter mention
    if (serverName === configuredServerName) {
      // We're matching against the MXID @madlittlemods-5f762e89986e461e663059c2:gitter.im
      // where the localPart is `@madlittlemods-5f762e89986e461e663059c2`
      const localPartMatches = localPart.match(GITTER_MXID_LOCALPART_REGEX);
      if (!localPartMatches) {
        continue;
      }
      const fallbackUsername = localPartMatches[1];
      const userId = localPartMatches[2];

      let username = fallbackUsername;
      try {
        // Lookup the user based on the userId included in the MXID
        const gitterUser = await userService.findById(userId);
        if (gitterUser) {
          username = gitterUser.username;
        }
      } catch (err) {
        // no-op, we can use the fallbackUsername
      }

      replacementText = `@${username}`;
    } else {
      replacementText = `[${user.text}](https://matrix.to/#/${user.id})`;
    }

    // Make sure we don't replace in the middle of some of other words
    // based on https://github.com/matrix-org/matrix-appservice-slack/blob/47d5af9caad2f21983e429f9868c70d702707410/src/substitutions.ts#L153
    const userRegex = new RegExp(
      `(?<=^|\\s)${escapeStringRegexp(user.text)}(?=$|\\s|\\b|\\.|!|,|: )`,
      'g'
    );
    resultantBody = resultantBody.replace(userRegex, replacementText);
  }

  // TODO: Replace aliases and communities with matrix.to links as well

  return resultantBody;
}

// Based off of https://github.com/matrix-org/matrix-bifrost/blob/c7161dd998c4fe968dba4d5da668dc914248f260/src/MessageFormatter.ts#L45-L60
function mxcUrlToHttp(mxcUrl) {
  const uriBits = mxcUrl.substr('mxc://'.length).split('/');
  const url = homeserverUrl.replace(/\/$/, '');
  return `${url}/_matrix/media/v1/download/${uriBits[0]}/${uriBits[1]}`;
}

function handleFileUpload(content) {
  const mediaUrl = mxcUrlToHttp(content.url);
  let thumbnailMarkdown = '';
  if (content.info && content.info.thumbnail_url) {
    const thumbnailUrl = mxcUrlToHttp(content.info.thumbnail_url);
    thumbnailMarkdown = `\n[![${content.body}](${thumbnailUrl})](${mediaUrl})`;
  }

  const resultantBody = `[${content.body}](${mediaUrl})${thumbnailMarkdown}`;
  return resultantBody;
}

// Transform Matrix message event into text we can use on Gitter
async function transformMatrixEventContentIntoGitterMessage(content) {
  // Handile file uploads
  if (['m.file', 'm.image', 'm.video', 'm.audio'].includes(content.msgtype) && content.url) {
    return handleFileUpload(content);
  }

  // If it's not an HTML text message, we probably don't know how to parse the format
  // and won't do any transformations
  if (content.format !== 'org.matrix.custom.html') {
    return content.body;
  }

  // Handle normal messages
  let resultantBody = content.body;
  if (content.body && content.formatted_body) {
    resultantBody = await replacePills(content);
  }

  return resultantBody;
}

module.exports = transformMatrixEventContentIntoGitterMessage;
