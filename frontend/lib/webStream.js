'use strict';

const WebSocket = require('websocket-stream');
const Eos = require('end-of-stream');


module.exports = function (server) {
  let streamCounter = 0;
  const streams = {};


  const emit = (data) => {
    const ids = Object.keys(streams);
    ids.forEach((id) => {
      streams[id].write(JSON.stringify(data), () => {});
    });
  };


  const handleStream = (stream) => {
    stream.id = streamCounter++;
    streams[stream.id] = stream;

    Eos(stream, () => {
      delete streams[stream.id];
    });
  };


  WebSocket.createServer({ server }, handleStream);

  return { emit };
};
