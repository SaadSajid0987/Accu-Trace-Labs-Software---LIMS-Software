import http from 'http';

const data = JSON.stringify({
    results: [],
    notes: "hi",
    remarks: "hello"
});

const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/samples/7/results',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', console.error);
req.write(data);
req.end();
