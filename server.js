const https = require('https');
const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const serverConfig = require('./config.json');

const port = serverConfig.http.port;
let count = 0;

const webs = [
    {
        indexDir: 'web1/build',
        subDomain: '172.16.15.19',
    },
    {
        indexDir: 'web2/build',
        subDomain: 'dev.chan.we',
    },
];

// https switching
const httpsServerOn = serverConfig.https.on;

// https redirection
if (httpsServerOn) {
    app.enable('trust proxy');
    app.use(function(req, res, next) {
        const subDomain = req.host.slice(0, req.host.indexOf('skyload.org'));
        console.log(subDomain);

        if (!subDomain) {
            if (req.secure && req.host.indexOf('www.') > -1) {
                return next();
            } else {
                res.redirect(
                    'https://' +
                        (req.host.indexOf('www.') == -1 ? 'www.' : '') +
                        req.headers.host +
                        req.url
                );
            }
        } else {
            if (req.secure) {
                return next();
            } else {
                res.redirect('https://' + req.headers.host + req.url);
            }
        }
    });
}

initDomains(app, webs);
app.get('*', function(req, res) {
    console.log(`connect [${count++}] - ${new Date()}`);

    console.log(req.host);

    if (bridge(app, webs, req.host) == false) return;
    res.render('index.html');
});

app.listen(port, function(req, socket, head) {
    console.log('listening on port ' + port + '!');
});

// https server
let httpsServer = null;
let httpsOption = {
    key: 'key',
    cert: 'cert',
    ca: 'ca',
};
if (httpsServerOn) {
    httpsOption.key = fs.readFileSync(serverConfig.https.keys.key, 'utf8');
    httpsOption.cert = fs.readFileSync(serverConfig.https.keys.cert, 'utf8');
    httpsOption.ca = fs.readFileSync(serverConfig.https.keys.ca, 'utf8');

    httpsServer = https.createServer(httpsOption, app);
    httpsServer.listen(serverConfig.https.port, () =>
        console.log(
            `https server is listening to the port ${serverConfig.https.port}`
        )
    );
}

function initDomains(expressApp, webs) {
    expressApp.set('view engine', 'ejs');
    expressApp.engine('html', require('ejs').renderFile);

    for (let i in webs) {
        expressApp.use(express.static(webs[i].indexDir));
    }
}

function bridge(expressApp, webs, reqHost) {
    const host = webs.find(item => item.subDomain == reqHost);
    if (host == null) return false;

    expressApp.use(express.static('webs/' + host.indexDir));
    expressApp.set('views', 'webs/' + host.indexDir);
}
