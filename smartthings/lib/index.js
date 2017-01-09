'use strict';

const Seneca = require('seneca');

const seneca = Seneca();


const passcode = process.env.PASSCODE || 'secure';
const data = {
  humidity: [],
  motion: [],
  temperature: []
};

seneca.add({ role: 'smartthings', cmd: 'read', type: 'temperature' }, (args, cb) => {
  getPoints('temperature', cb);
});

seneca.add({ role: 'smartthings', cmd: 'read', type: 'humidity' }, (args, cb) => {
  getPoints('humidity', cb);
});

seneca.add({ role: 'smartthings', cmd: 'read', type: 'motion' }, (args, cb) => {
  getPoints('motion', cb);
});

seneca.add({ role: 'smartthings', cmd: 'write', type: 'humidity', passcode }, (args, cb) => {
  data.humidity.push({
    type: 'humidity',
    time: Date.now(),
    value: args.value
  });
});

seneca.add({ role: 'smartthings', cmd: 'write', type: 'motion', passcode }, (args, cb) => {
  data.motion.push({
    type: 'motion',
    time: Date.now(),
    value: args.value
  });
});

seneca.add({ role: 'smartthings', cmd: 'write', type: 'temperature', passcode }, (args, cb) => {
  data.temperature.push({
    type: 'temperature',
    time: Date.now(),
    value: args.value
  });
});


seneca.listen({ port: process.env.PORT });


function getPoints (type, cb) {
  if (!data.humidity.length && !data.motion.length && !data.temperature.length) {
    return genPoints(type, cb);
  }

  const results = data[type];
  data[type] = [];

  cb(null, results);
}

function genPoints (type, cb) {
  cb(null, [[
    {
      type,
      time: Date.now(),
      value: (type === 'motion') ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 100)
    },
    {
      type,
      time: Date.now(),
      value: (type === 'motion') ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 100)
    }
    ]]
  );
}
