'use strict';

// Load modules

const Brule = require('brule');
const Hapi = require('hapi');
const Items = require('items');
const Piloted = require('piloted');
const Seneca = require('seneca');


const internals = {};


Piloted.config({ consul: 'localhost:8500', backends: [ { name: 'serializer' } ] }, (err) => {
  if (err) {
    console.error(err);
  }

  initSerializer();
  readData();

  const hapi = new Hapi.Server();
  hapi.connection({ port: process.env.PORT });
  hapi.register(Brule, (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    hapi.start((err) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }

      console.log(`Hapi server started at http://127.0.0.1:${hapi.info.port}`);
    });
  });
});

const ignore = () => {};

const smartthings = Seneca();
smartthings.client({
  host: process.env.SMARTTHINGS_HOST,
  port: process.env.SMARTTHINGS_PORT
});

const readData = function () {
  smartthings.act({
    role: 'smartthings',
    cmd: 'read',
    type: 'humidity',
    ago: 5
  }, (err, data) => {
    if (err) {
      console.error(err);
      return readAgain();
    }

    if (!data || !data.length) {
      return readAgain();
    }

    writeData(data);
  });
};

function writeData (data) {
  data = [].concat.apply([], data);

  internals.serializer.ready(() => {
    Items.serial(data, (point, next) => {
      internals.serializer.act({ role: 'serialize', cmd: 'write', type: 'humidity', value: point.value }, next);
    }, (err) => {
      readAgain();
    });
  });
}

function initSerializer () {
  const serializerServer = Piloted('serializer');
  if (!serializerServer) {
    console.error('Serializer not found');
    internals.serializer = internals.dummySerializer;
    return setTimeout(initSerializer, 1000);
  }

  internals.serializer = Seneca();
  internals.serializer.client({
    host: serializerServer.address,
    port: serializerServer.port
  });
}

process.on('SIGHUP', () => {
  initSerializer();
});

const readAgain = function () {
  setTimeout(readData, 5000);
};

internals.dummySerializer = {
  ready: function (cb) {
    cb();
  },
  act: function (pattern, cb) {
    cb();
  }
};
