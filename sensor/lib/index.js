'use strict';

// Load modules

const Nats = require('nats');
const Piloted = require('piloted');
const Wreck = require('wreck');


const internals = {
  type: process.env.SENSOR_TYPE
};

function setupNats() {
  const servers = Piloted.serviceHosts('nats');

  if (!servers || !servers.length) {
    console.error('NATS not found');
    return setTimeout(() => { setupNats(); }, 1000);
  }

  const natsServers = servers.map((server) => {
    return `nats://${process.env.NATS_USER}:${process.env.NATS_PASSWORD}@${server.address}:4222`;
  });

  const nats = Nats.connect({ servers: natsServers });
  nats.on('error', (err) => {
    console.log(err);
  });

  // Subscribe for messages related to the sensor type subject
  // and create a queue group so that multiple instances don't
  // handle the same message
  nats.subscribe(internals.type, { queue: 'sensor' }, writeData);
}

function writeData (data) {
  const serializer = Piloted.service('serializer');

  if (!serializer) {
    console.error('Serializer not found');
    return setTimeout(() => { writeData(data); }, 1000);
  }

  Wreck.post(`http://${serializer.address}:${serializer.port}/write/${internals.type}`, { payload: data }, (err) => {
    if (err) {
      console.error(err);
    }
  });
}

Piloted.on('refresh', () => {
  setupNats();
});

setupNats();
