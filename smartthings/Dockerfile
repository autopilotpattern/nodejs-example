FROM node:6-alpine

RUN apk update && \
    apk add curl && \
    rm -rf /var/cache/apk/*


# Install our application
RUN mkdir -p /opt/app/lib
COPY package.json /opt/app/
COPY lib/* /opt/app/lib/
RUN cd /opt/app && npm install

ENTRYPOINT ["node"]
CMD ["/opt/app/"]
