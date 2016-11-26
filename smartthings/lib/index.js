'use strict';

const Seneca = require('seneca');

const seneca = Seneca();

seneca.add({ role: 'smartthings', cmd: 'read', type: 'temperature' }, (args, cb) => {
  genPoints('temperature', cb); //readPoints('temperature', args.ago, cb);
});

seneca.add({ role: 'smartthings', cmd: 'read', type: 'humidity' }, (args, cb) => {
  genPoints('humidity', cb);
});

seneca.add({ role: 'smartthings', cmd: 'read', type: 'motion' }, (args, cb) => {
  genPoints('motion', cb);
});

seneca.listen({ port: process.env.PORT });


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