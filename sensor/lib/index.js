'use strict';

// Load modules

const Brule = require('brule');
const Hapi = require('hapi');
const Items = require('items');
const Piloted = require('piloted');
const Seneca = require('seneca');
const Wreck = require('wreck');


const internals = {
  type: process.env.SENSOR_TYPE,
  failCount: 0
};


function main () {
  const hapi = new Hapi.Server();
  hapi.connection({ host: '127.0.0.1', port: process.env.PORT });
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

      internals.smartthings = Seneca();
      internals.smartthings.client({
        host: process.env.SMARTTHINGS_HOST,
        port: process.env.SMARTTHINGS_PORT
      });

      readData();
    });
  });
}
main();


function readData () {
  internals.smartthings.act({
    role: 'smartthings',
    cmd: 'read',
    type: internals.type,
    ago: 1
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
}

function writeData (data) {
  const serializer = Piloted.service('serializer');
  if (!serializer && internals.failCount > 10) {
    internals.failCount = 0;
    Piloted.refresh();       // hit consul again and refresh our list
  }

  if (!serializer) {
    internals.failCount++;
    console.error('Serializer not found');
    return setTimeout(() => { writeData(data); }, 1000);
  }

  data = [].concat.apply([], data);
  Wreck.post(`http://${serializer.address}:${serializer.port}/write/${internals.type}`, { payload: data }, readAgain);
}

function readAgain () {
  setTimeout(readData, 5000);
};
