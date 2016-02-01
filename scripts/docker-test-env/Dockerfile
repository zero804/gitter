FROM ubuntu:14.04

ENV MONGO_MAJOR 3.0
ENV MONGO_VERSION 3.0.9

ENV REDIS_VERSION 3.0.6
ENV REDIS_DOWNLOAD_URL http://download.redis.io/releases/redis-3.0.6.tar.gz
ENV REDIS_DOWNLOAD_SHA1 4b1c7b1201984bca8f7f9c6c58862f6928cf0a25

RUN apt-get install -y --no-install-recommends ca-certificates curl  apt-transport-https

RUN curl -s https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
RUN echo 'deb https://deb.nodesource.com/node_0.10 trusty main' > /etc/apt/sources.list.d/nodesource.list
RUN echo 'deb-src https://deb.nodesource.com/node_0.10 trusty main' >> /etc/apt/sources.list.d/nodesource.list

# gpg: key 7F0CEB10: public key "Richard Kreuter <richard@10gen.com>" imported
RUN apt-key adv --keyserver ha.pool.sks-keyservers.net --recv-keys 492EAFE8CD016A07919F1D2B9ECBEC467F0CEB10
RUN echo "deb http://repo.mongodb.org/apt/debian wheezy/mongodb-org/$MONGO_MAJOR main" > /etc/apt/sources.list.d/mongodb-org.list

RUN apt-get update
RUN apt-get install -y supervisor gcc libc6-dev make nodejs git build-essential \
	mongodb-org=$MONGO_VERSION \
	mongodb-org-server=$MONGO_VERSION \
	mongodb-org-shell=$MONGO_VERSION \
	mongodb-org-mongos=$MONGO_VERSION \
	mongodb-org-tools=$MONGO_VERSION


# for redis-sentinel see: http://redis.io/topics/sentinel
RUN mkdir -p /usr/src/redis \
	&& curl -sSL "$REDIS_DOWNLOAD_URL" -o redis.tar.gz \
	&& echo "$REDIS_DOWNLOAD_SHA1 *redis.tar.gz" | sha1sum -c - \
	&& tar -xzf redis.tar.gz -C /usr/src/redis --strip-components=1 \
	&& rm redis.tar.gz \
	&& make -C /usr/src/redis \
	&& make -C /usr/src/redis install \
	&& rm -r /usr/src/redis

RUN rm -rf /var/lib/apt/lists/*

COPY ./supervisord.conf /etc/supervisor/conf.d/supervisord.conf

RUN mkdir -p /data/db/1
RUN mkdir -p /data/db/2

COPY ./sentinel.conf /etc/sentinel.conf
COPY ./run-with-supervisor /usr/bin/run-with-supervisor
COPY ./setup-gitter-webapp-test-env /usr/bin/setup-gitter-webapp-test-env

ENTRYPOINT ["/usr/bin/run-with-supervisor"]
