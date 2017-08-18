FROM williamyeh/ansible:alpine3

RUN apk add --no-cache bash git && pip install awscli boto --upgrade --user

RUN rm -rf /tmp/* /var/cache/apk/* /root/.npm /root/.node-gyp /root/.gnupg /root/.ssh 2>/dev/null
