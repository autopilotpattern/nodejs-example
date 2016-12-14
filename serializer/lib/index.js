'use strict';

const Brule = require('brule');
const FlattenDeep = require('lodash.flattendeep');
const Hapi = require('hapi');
const Influx = require('influx');
const Items = require('items');
const Piloted = require('piloted');


const internals = {
  dbName: 'sensors',
  failCount: 0
};

const bufferedDb = {
  draining: false,
  data: [],
  writePoints: function (points) {
    console.log('Write in dummy db');
    bufferedDb.data = bufferedDb.data.concat(points);
    return new Promise((resolve) => {
      resolve();
    });
  },
  query: function(query) {
    return new Promise((resolve) => {
      resolve(bufferedDb.data);
    });
  },
  drain: function () {
    if (bufferedDb.draining) {
      return;
    }

    bufferedDb.draining = true;
    Items.serial(bufferedDb.data, (data, next) => {
      writePoint(data.measurement, data.fields.value, next);
    }, (err) => {
      bufferedDb.data = [];
      bufferedDb.draining = false;
    });
  }
};


function main () {
  setupDb();
  setupHapi();
}
main();


function setupHapi () {
  const server = new Hapi.Server();
  server.connection({ port: process.env.PORT });
  server.register(Brule, (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    server.route({
      method: 'POST',
      path: '/write/{type}',
      handler: writeHandler
    });

    server.route({
      method: 'GET',
      path: '/read',
      handler: readHandler
    });

    server.start((err) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }

      console.log(`Hapi server started at http://localhost:${server.info.port}`);
    });
  });
}

function writeHandler (request, reply) {
  Items.serial(request.payload, (point, next) => {
    writePoint(request.params.type, point.value, next);
  }, () => {
    reply({});
  })
}

function readHandler (request, reply) {
  let results = [];
  Items.parallel(['motion', 'humidity', 'temperature'], (type, next) => {
    readPoints(type, 1, (err, result) => {
      results = results.concat(result);
      next();
    });
  }, () => {
    reply(FlattenDeep(results));
  });
}

function setupDb () {
  const influxServer = Piloted.service('influxdb');
  if (!influxServer && internals.failCount > 10) {
    internals.failCount = 0;
    Piloted.refresh();
  }

  if (!influxServer) {
    internals.failCount++;
    internals.db = bufferedDb;
    return setTimeout(setupDb, 1000);
  }

  internals.db = new Influx.InfluxDB({
    host: influxServer.address,
    port: influxServer.port,
    username: process.env.INFLUXDB_USER,
    password: process.env.INFLUXDB_PWD
  });

  internals.db.createDatabase(internals.dbName)
  .then(() => {
    bufferedDb.drain();
  })
  .catch((err) => {
    console.error(`Error creating Influx database!`);
    console.error(err);

    // Influx may not be entirely ready
    setTimeout(setupDb, 1000);
  });
}

Piloted.on('refresh', () => {
  setupDb();
});


function writePoint (type, value, cb) {
  internals.db.writePoints([{ measurement: type, fields: { value } }], { database: internals.dbName })
  .then(() => {
    return cb();
  })
  .catch((err) => {
    return cb(err);
  });
};

function readPoints (type, ago, cb) {
  ago = ago || 1;
  const query = `select * from ${type} where time > now() - ${ago}m`;
  internals.db.query(query, { database: internals.dbName })
  .then((rows) => {
    if (rows && rows.length) {
      for (let i = 0; i < rows.length; ++i) {
        rows[i].type = type;
      }
    }
    cb(null, rows);
  })
  .catch((err) => {
    console.error('Error querying db: ' + err);
    return cb(err);
  });
};
