'use strict';

// Load modules

const Path = require('path');
const Brule = require('brule');
const Hapi = require('hapi');
const Inert = require('inert');
const Piloted = require('piloted');
const WebStream = require('./webStream');
const Wreck = require('wreck');



function main () {
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

    server.start(() => {
      console.log(`listening at http://localhost:${server.info.port}`);
      startReading(WebStream(server.listener));
    });
  });
}
main();

function startReading (webStream) {
  let lastEmitted = 0;
  setInterval(() => {
    const serializer = Piloted.service('serializer');
    if (!serializer) {
      console.log('Serializer not found');
      return;
    }

    Wreck.get(`http://${serializer.address}:${serializer.port}/read`, { json: 'force' }, (err, res, points) => {
      if (err) {
        console.error('Error making request to serializer: ' + err);
        return;
      }

      if (!points || !points.length) {
        return;
      }

      let toEmit = [];
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
  }, 1000);
}
