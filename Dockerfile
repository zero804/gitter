FROM node:4

RUN mkdir -p /app /npm_cache

WORKDIR /app

RUN npm install -g npm@latest-5
RUN npm config set cache /npm_cache
RUN npm config set prefer-offline true
# TODO: add npm-shrinkwrap here too

COPY package.json /app/
RUN sed -i '/file:.*modules/d; /file:.*shared/d' package.json
RUN npm install

RUN rm -rf /tmp/* /var/cache/apk/* /root/.npm /root/.node-gyp /root/.gnupg /root/.ssh 2>/dev/null
