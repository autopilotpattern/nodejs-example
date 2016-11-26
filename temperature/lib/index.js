'use strict';

// Load modules

const Brule = require('brule');
const Hapi = require('hapi');
const Items = require('items');
const Piloted = require('piloted');
const Seneca = require('seneca');


Piloted.config({ consul: 'localhost:8500', backends: [ { name: 'serializer' } ] }, (err) => {
  if (err) {
    console.error(err);
  }
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
    type: 'temperature',
    ago: 5
  }, (err, data) => {
    if (err) {
      console.error(err);
      return readAgain();
    }

    if (!data || !data.length) {
      return readAgain();
    }

    const serializer = Seneca();
    const serializerServer = Piloted('serializer');
    if (!serializerServer) {
      console.error('Serializer not found');
      return readAgain();
    }

    serializer.client({
      host: serializerServer.address,
      port: serializerServer.port
    });

    data = [].concat.apply([], data);

    serializer.ready(() => {
      Items.serial(data, (point, next) => {
        serializer.act({ role: 'serialize', cmd: 'write', type: 'temperature', value: point.value }, next);
      }, (err) => {
        readAgain();
      });
    });
  });
};

const readAgain = function () {
  setTimeout(readData, 5000);
};
