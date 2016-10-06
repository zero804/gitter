#!/usr/bin/env bash

set -euo pipefail

set -x

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

export NO_AUTO_INDEX=1

GITTER_USERNAME=$1
GROUP_URI=$2

node ${SCRIPT_DIR}/create-forum.js --username ${GITTER_USERNAME} --group ${GROUP_URI}
node ${SCRIPT_DIR}/create-forum-category.js --username ${GITTER_USERNAME} --group ${GROUP_URI} --name general
node ${SCRIPT_DIR}/create-forum-category.js --username ${GITTER_USERNAME} --group ${GROUP_URI} --name FAQs
node ${SCRIPT_DIR}/create-forum-category.js --username ${GITTER_USERNAME} --group ${GROUP_URI} --name announcements
node ${SCRIPT_DIR}/update-forum.js --username ${GITTER_USERNAME} --group ${GROUP_URI} --tags="feature request,bug,question,help,feedback,discussion"
