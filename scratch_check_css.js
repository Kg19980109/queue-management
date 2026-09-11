const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const cookies = res.headers['set-cookie'];
    if (!cookies) {
      console.log('No cookies returned. Login failed?');
      return;
    }
    
    // Now fetch /platform with the cookie
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
    http.get({
      hostname: 'localhost',
      port: 3000,
      path: '/platform',
      headers: {
        'Cookie': cookieHeader
      }
    }, (res2) => {
      let data2 = '';
      res2.on('data', (chunk) => {
        data2 += chunk;
      });
      res2.on('end', () => {
        if (data2.includes('<link rel="stylesheet"')) {
          console.log('CSS link found in /platform HTML.');
        } else {
          console.log('CSS link MISSING in /platform HTML!');
        }
        
        // Find the actual CSS URL
        const match = data2.match(/href="(\/_next\/static\/css\/[^"]+\.css[^"]*)"/);
        if (match) {
          console.log('CSS URL:', match[1]);
        }
      });
    });
  });
});

req.write('1_$ACTION_ID_74ab0cf7919864a781b17b6a48d88e07246ec565='); // Just fake a payload
req.end();
