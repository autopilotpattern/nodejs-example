'use strict';

// Load modules

const Path = require('path');
const Brule = require('brule');
const Hapi = require('hapi');
const Inert = require('inert');
const Piloted = require('piloted');
const Seneca = require('seneca');
const WebStream = require('./webStream');


Piloted.config({ consul: 'localhost:8500', backends: [ { name: 'serializer' } ] }, (err) => {
  if (err) {
    console.error(err);
  }

  const serverConfig = {
    connections: {
      routes: {
        files: {
          relativeTo: Path.join(__dirname, 'public')
        }
      }
    }
  };

  const server = new Hapi.Server(serverConfig);
  server.connection({ port: process.env.PORT });
  server.register([Inert, Brule], () => {
    server.route({
      method: 'GET',
      path: '/{param*}',
      handler: {
        directory: {
          path: '.',
          redirectToSlash: true,
          index: true
        }
      }
    });

    startReading(WebStream(server.listener));

    server.start(() => {
      console.log(`listening at http://localhost:${server.info.port}`);
    });
  });
});

const startReading = function (webStream) {
  let lastEmitted = 0;
  setInterval(() => {
    const serializer = Piloted('serializer');
    if (!serializer) {
      return;
    }

    const seneca = Seneca();
    seneca.client({
      host: serializer.address,
      port: serializer.port
    });

    seneca.act({
      role: 'serialize',
      cmd: 'read',
      ago: 5                // Minutes ago
    }, (err, points) => {
      if (err) {
        console.error(err);
      }

      if (!points || !points.length) {
        return;
      }

      let toEmit = [];
      points = [].concat.apply([], points);
      points.forEach((point) => {
        point.time = (new Date(point.time || Date.now())).getTime();

        if (point.time > lastEmitted) {
          lastEmitted = point.time;
          toEmit.push(point);
        }
      });

      if (toEmit.length) {
        webStream.emit([].concat.apply([], toEmit));
      }
    });
  }, 2000);
};
