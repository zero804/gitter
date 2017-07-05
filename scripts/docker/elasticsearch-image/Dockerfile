FROM elasticsearch:1.4.2

COPY logging.yml /usr/share/elasticsearch/config/
COPY elasticsearch.yml /usr/share/elasticsearch/config/
COPY scripts /scripts/

RUN mkdir -p /data/es/logs /data/es/data /data/es/plugins

RUN /usr/share/elasticsearch/bin/elasticsearch -d -p /tmp/elasticsearch-pid \
    && sleep 2 \
    && /usr/share/elasticsearch/bin/plugin --install elasticsearch/elasticsearch-mapper-attachments/2.5.0 \
    && /usr/share/elasticsearch/bin/plugin --install com.github.richardwilly98.elasticsearch/elasticsearch-river-mongodb/2.0.9 \
    && /usr/share/elasticsearch/bin/plugin --install mobz/elasticsearch-head \
    && /usr/share/elasticsearch/bin/plugin --install royrusso/elasticsearch-HQ \
    && /scripts/setup-elasticsearch.sh \
    && kill -15 $(cat /tmp/elasticsearch-pid) \
    && sleep 5

# Make the new dir a VOLUME to persists it
VOLUME /data/es

EXPOSE 9200
EXPOSE 9300

CMD ["/usr/share/elasticsearch/bin/elasticsearch"]
