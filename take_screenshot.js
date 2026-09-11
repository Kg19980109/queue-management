const { exec } = require('child_process');

exec('/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --headless --disable-gpu --screenshot=screenshot.png http://localhost:3000/login', (err, stdout, stderr) => {
  if (err) {
    console.error('Error capturing screenshot:', err);
    return;
  }
  console.log('Screenshot captured as screenshot.png');
});
