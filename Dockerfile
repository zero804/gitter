FROM node:10.15.0

RUN mkdir -p /app
RUN mkdir -p /npm_cache

WORKDIR /app

RUN npm install npm@latest-5 -g

RUN npm config set cache /npm_cache
RUN npm config set prefer-offline true

COPY package.json package-lock.json scripts/filter-package-json-cli.js scripts/filter-package-lock-json-cli.js /app/
# Remove the local dependencies(`file:` entries) from package.json and package-lock.json
RUN cat package.json | node filter-package-json-cli.js > temp-package.json && cat temp-package.json > package.json && rm temp-package.json
RUN cat package-lock.json | node filter-package-lock-json-cli.js > temp-package-lock.json && cat temp-package-lock.json > package-lock.json && rm temp-package-lock.json
RUN npm install

RUN rm -rf /tmp/* /var/cache/apk/* /root/.npm /root/.node-gyp /root/.gnupg /root/.ssh 2>/dev/null
