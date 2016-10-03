#!/usr/bin/env bash

set -euo pipefail

set -x

MONGO_CONNECTION=${MONGO_CONNECTION:-gitter-mongo-dev/gitter}

mongo ${MONGO_CONNECTION} --eval 'db.comments.remove({})'
mongo ${MONGO_CONNECTION} --eval 'db.replies.remove({})'
mongo ${MONGO_CONNECTION} --eval 'db.topics.remove({})'
mongo ${MONGO_CONNECTION} --eval 'db.forums.remove({})'
mongo ${MONGO_CONNECTION} --eval 'db.groups.update({ forumId: { $exists: true }}, { $unset: { forumId: true } }, { multi: true })'
