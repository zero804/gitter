FROM docker-registry.service.jenkins.gitter:5000/node/node:${NODE_VERSION}

ENV PKGLIST="git make gcc g++ python linux-headers paxctl gnupg"

RUN apk add --no-cache $PKGLIST libgcc libstdc++

ENV ENV="${ENVIRONMENT}"
ENV NODE_ENV="$ENV"
ENV GIT_TAG="${GIT_TAG}"
ENV GIT_COMMIT="${GIT_COMMIT}"
ENV HOME="/root"
ENV TMPDIR="/tmp/gitter"
ENV PORT=5000

LABEL selected-git-tag="${SELECTED_GIT_TAG}"
LABEL git-tag="${GIT_TAG}"
LABEL git-commit="${GIT_COMMIT}"
LABEL staged="${STAGED_ENVIRONMENT}"
LABEL node-version="${NODE_VERSION}"
LABEL env="${ENVIRONMENT}"

EXPOSE $PORT
ENTRYPOINT ["node"]

WORKDIR /app

COPY ./app/ /app
COPY ./ssh/ /root/.ssh

RUN rm -rf /app/node_modules
RUN npm install --production
RUN apk del $PKGLIST
RUN rm -rf /tmp/* /var/cache/apk/* /root/.npm /root/.node-gyp /root/.gnupg /root/.ssh 2>/dev/null
