'use strict';

const Brule = require('brule');
const FlattenDeep = require('lodash.flattendeep');
const Hapi = require('hapi');
const Influx = require('influx');
const Items = require('items');
const Piloted = require('piloted');
const Seneca = require('seneca');


const internals = {
  dbName: 'sensors'
};

Piloted.config({ consul: 'localhost:8500', backends: [ { name: 'influxdb' } ] }, (err) => {
  if (err) {
    console.error(err);
  }

  setupDb();
  setupSeneca();
});


function setupSeneca () {
  const seneca = Seneca();

  seneca.add({ role: 'serialize', cmd: 'read' }, (args, cb) => {
    let results = [];
    Items.serial(['motion', 'humidity', 'temperature'], (type, next) => {
      readPoints(type, args.ago, (err, result) => {
        results = results.concat(result);
        next();
      });
    }, () => {
      cb(null, FlattenDeep(results));
    });
  });

  seneca.add({ role: 'serialize', cmd: 'read', type: 'temperature' }, (args, cb) => {
    readPoints('temperature', args.ago, cb);
  });

  seneca.add({ role: 'serialize', cmd: 'read', type: 'humidity' }, (args, cb) => {
    readPoints('humidity', args.ago, cb);
  });

  seneca.add({ role: 'serialize', cmd: 'read', type: 'motion' }, (args, cb) => {
    readPoints('motion', args.ago, cb);
  });

  seneca.add({ role: 'serialize', cmd: 'write', type: 'temperature' }, (args, cb) => {
    writePoint('temperature', args.value, cb);
  });

  seneca.add({ role: 'serialize', cmd: 'write', type: 'humidity' }, (args, cb) => {
    writePoint('humidity', args.value, cb);
  });

  seneca.add({ role: 'serialize', cmd: 'write', type: 'motion' }, (args, cb) => {
    writePoint('motion', args.value, cb);
  });

  seneca.listen({ port: process.env.PORT });

  const hapi = new Hapi.Server();
  hapi.connection({ host: '127.0.0.1', port: 8080 });
  hapi.register(Brule, (err) => {
    if (err) {
      console.error(err);
    }

    hapi.start((err) => {
      if (err) {
        console.error(err);
      }

      console.log(`Hapi server started at http://127.0.0.1:${hapi.info.port}`);
    });
  });
}

function setupDb () {
  const influxServer = Piloted('influxdb');
  if (!influxServer) {
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

    bufferedDb.drain();
  });
}

process.on('SIGHUP', setupDb);


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
  ago = ago || 0;
  const query = `select * from ${type} where time > now() - ${ago}m`;
  internals.db.query(query, { database: internals.dbName })
  .then((results) => {
    if (results && results.length && results[0] && results[0].length) {
      for (let i = 0; i < results[0].length; ++i) {
        results[0][i].type = type;
      }
    }

    return cb(null, results);
  })
  .catch((err) => {
    return cb(err);
  });
};


const bufferedDb = {
  draining: false,
  data: [],
  writePoint: function (points) {
    bufferedDb.data = bufferedDb.data.concat(points);
    return new Promise((resolve) => {
      resolve();
    });
  },
  query: function(query) {
    return new Promise((resolve) => {
      resolve();
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
