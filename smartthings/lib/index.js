'use strict';

const Nats = require('nats');
const Piloted = require('piloted');
const Seneca = require('seneca');


const internals = {};

function setupSeneca() {
  const seneca = Seneca();
  const passcode = process.env.PASSCODE || 'secure';

  seneca.add({ role: 'smartthings', cmd: 'write', type: 'humidity', passcode }, (args, cb) => {
    if (!internals.nats) {
      return cb();
    }

    internals.nats.publish(type, JSON.stringify({
      type: 'humidity',
      time: Date.now(),
      value: args.value
    }));
    cb();
  });

  seneca.add({ role: 'smartthings', cmd: 'write', type: 'motion', passcode }, (args, cb) => {
    if (!internals.nats) {
      return cb();
    }

    internals.nats.publish(type, JSON.stringify({
      type: 'motion',
      time: Date.now(),
      value: args.value
    }));
    cb();
  });

  seneca.add({ role: 'smartthings', cmd: 'write', type: 'temperature', passcode }, (args, cb) => {
    if (!internals.nats) {
      return cb();
    }
    internals.nats.publish(type, JSON.stringify({
      type: 'temperature',
      time: Date.now(),
      value: args.value
    }));
    cb();
  });

  seneca.listen({ port: process.env.PORT });
}

function setupNats(cb) {
  cb = cb || function () {};
  const servers = Piloted.serviceHosts('nats');

  if (!servers || !servers.length) {
    console.error('NATS not found');
    return setTimeout(() => { setupNats(cb); }, 1000);
  }

  const natsServers = servers.map((server) => {
    return `nats://${process.env.NATS_USER}:${process.env.NATS_PASSWORD}@${server.address}:4222`;
  });

  internals.nats = Nats.connect({ servers: natsServers });
  internals.nats.on('error', (err) => {
    console.log(err);
  });
  cb();
}

function genPoint (type) {
  return JSON.stringify({
    type,
    time: Date.now(),
    value: (type === 'motion') ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 100)
  });
}

function genData () {
  internals.nats.publish('temperature', genPoint('temperature'));
  internals.nats.publish('humidity', genPoint('humidity'));
  internals.nats.publish('motion', genPoint('motion'));
}

Piloted.on('refresh', () => {
  setupNats();
});

setupSeneca();
setupNats(function () {
  if (process.env.FAKE_MODE) {
    setInterval(genData, 1000);
  }
});
