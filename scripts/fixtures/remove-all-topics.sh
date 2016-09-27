#!/usr/bin/env bash

set -euo pipefail

set -x

MONGO_CONNECTION=${MONGO_CONNECTION:-gitter-mongo-dev/gitter}

mongo gitter-mongo-dev/gitter --eval 'db.forums.remove({})'
mongo gitter-mongo-dev/gitter --eval 'db.groups.update({ forumId: { $exists: true }}, { $unset: { forumId: true } }, { multi: true })'
