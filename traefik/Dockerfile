FROM traefik:1.2-alpine

RUN apk update && \
    apk add curl unzip tar && \
    rm -rf /var/cache/apk/*

# Install Consul Agent
RUN export CONSUL_VERSION=0.7.0 \
    && export CONSUL_CHECKSUM=b350591af10d7d23514ebaa0565638539900cdb3aaa048f077217c4c46653dd8 \
    && curl --retry 7 --fail -vo /tmp/consul.zip "https://releases.hashicorp.com/consul/${CONSUL_VERSION}/consul_${CONSUL_VERSION}_linux_amd64.zip" \
    && echo "${CONSUL_CHECKSUM}  /tmp/consul.zip" | sha256sum -c \
    && unzip /tmp/consul -d /usr/local/bin \
    && rm /tmp/consul.zip \
    && mkdir /config

# Install ContainerPilot
ENV CONTAINERPILOT_VERSION 3.0.0-dev.1
RUN export CP_SHA1=bbeb4ed54d2e192fdd42d195fb3a0aa5726837b5 \
    && curl -Lso /tmp/containerpilot.tar.gz \
         "https://github.com/joyent/containerpilot/releases/download/${CONTAINERPILOT_VERSION}/containerpilot-${CONTAINERPILOT_VERSION}.tar.gz" \
    && echo "${CP_SHA1}  /tmp/containerpilot.tar.gz" | sha1sum -c \
    && tar zxf /tmp/containerpilot.tar.gz -C /bin \
    && rm /tmp/containerpilot.tar.gz

# Copy the configurations
COPY traefik.toml /etc/traefik/traefik.toml
ENV CONTAINERPILOT_PATH=/etc/containerpilot.json
COPY containerpilot.json ${CONTAINERPILOT_PATH}
ENV CONTAINERPILOT=file://${CONTAINERPILOT_PATH}

ENTRYPOINT []
CMD ["/bin/containerpilot"]
