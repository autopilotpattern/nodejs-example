'use strict';

const Brule = require('brule');
const FlattenDeep = require('lodash.flattendeep');
const Hapi = require('hapi');
const Influx = require('influx');
const Items = require('items');
const Seneca = require('seneca');


const db = Influx({host: 'influx', username: process.env.INFLUXDB_USER, password: process.env.INFLUXDB_PWD, database: 'sensors'});

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


function writePoint (type, value, cb) {
  db.writePoint(type, { value }, {}, cb);
};

function readPoints (type, ago, cb) {
  ago = ago || 0;
  const query = `select * from ${type} where time > now() - ${ago}m`;
  db.query(query, (err, results) => {
    if (results && results.length && results[0] && results[0].length) {
      for (let i = 0; i < results[0].length; ++i) {
        results[0][i].type = type;
      }
    }

    return cb(null, results);
  });
};