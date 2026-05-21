const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Handle API proxy requests
    if (req.method === 'POST' && req.url === '/api/messages') {
        const chunks = [];

        req.on('data', chunk => {
            chunks.push(chunk);
        });

        req.on('end', () => {
            try {
                const body = Buffer.concat(chunks).toString('utf-8');
                console.log('Request body length:', body.length);
                console.log('Request body preview:', body.substring(0, 200));
                console.log('Request body end:', body.substring(Math.max(0, body.length - 200)));
                
                const requestBody = JSON.parse(body);

                console.log('Parsed request with', requestBody.messages.length, 'messages');

                // Forward request to Anthropic API
                const options = {
                    hostname: 'api.anthropic.com',
                    path: '/v1/messages',
                    method: 'POST',
                    headers: {
                        'x-api-key': API_KEY,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json',
                        'Content-Length': Buffer.byteLength(body, 'utf-8')
                    }
                };

                const proxyReq = https.request(options, (proxyRes) => {
                    let responseBody = '';

                    proxyRes.on('data', chunk => {
                        responseBody += chunk.toString();
                    });

                    proxyRes.on('end', () => {
                        console.log('Anthropic API Response:', proxyRes.statusCode);
                        console.log('Response body:', responseBody);
                        res.writeHead(proxyRes.statusCode, {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        });
                        res.end(responseBody);
                    });
                });

                proxyReq.on('error', (error) => {
                    console.error('Proxy request error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                });

                proxyReq.write(body);
                proxyReq.end();

            } catch (error) {
                console.error('Error parsing request:', error.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid request: ' + error.message }));
            }
        });

        return;
    }

    // Handle 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`Proxy server running at http://localhost:${PORT}`);
    console.log('Forwarding requests to Anthropic API...');
});
