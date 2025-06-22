const { Duplex } = require('stream');

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function bufferToStream(buffer) {
  const stream = new Duplex();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

module.exports = {
  streamToBuffer,
  bufferToStream,
}; 