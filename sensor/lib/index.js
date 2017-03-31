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
  serializerFails: 0,
  smartthingsFails: 0
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

      configureSmartthings();
      readData();
    });
  });
}
main();


function readData () {
  if (!internals.smartthings) {
    return readAgain();
  }

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
  if (!serializer && internals.serializerFails > 10) {
    internals.serializerFails = 0;
    Piloted.refresh();       // hit consul again and refresh our list
  }

  if (!serializer) {
    internals.serializerFails++;
    console.error('Serializer not found');
    return setTimeout(() => { writeData(data); }, 1000);
  }

  data = [].concat.apply([], data);
  Wreck.post(`http://${serializer.address}:${serializer.port}/write/${internals.type}`, { payload: data }, readAgain);
}

function readAgain () {
  setTimeout(readData, 5000);
};

function configureSmartthings() {
  const smartthings = Piloted.serviceHosts('smartthings');
  if (!smartthings && internals.smartthingsFails > 10) {
    internals.smartthingsFails = 0;
    Piloted.refresh();       // hit consul again and refresh our list
  }

  if (!smartthings) {
    internals.smartthingsFails++;
    console.error('Smartthings not found');
    return setTimeout(() => { configureSmartthings(); }, 1000);
  }

  const randomIndex = Math.floor(Math.random() * smartthings.length);
  const smartthingsServer = smartthings[randomIndex];
  internals.smartthings = Seneca();
  internals.smartthings.client({
    host: smartthingsServer.address,
    port: smartthingsServer.port
  });
}

Piloted.on('refresh', () => {
  configureSmartthings();
});
