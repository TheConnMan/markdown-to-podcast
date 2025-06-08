const fs = require('fs');

module.exports = jest.fn().mockImplementation((filePath, text, options) => {
  // Create mock audio file
  fs.writeFileSync(filePath, Buffer.from('mock audio data'));
  return Promise.resolve();
});