const http = require('http');
const express = require('express');
const vhost = require('vhost');
const config = require('./config.json');

const app = express();

// redirection https and www
app.use((req, res, next) => {
   // https
   if(config.https.on && !req.secure) {
      return res.redirect(`https://${req.host}`);
   }

   // www
   if(!req.host.slice(0, req.host.indexOf(config.domain))) {
      return res.redirect(`https://www.${req.headers.host + req.url}`);
   }

   next();
});

let webs = [];
for(let i in config.webs) {
   if(!config.webs[i].on) continue;

   const webInfo = config.webs[i];
   const web = express();

   web.use(express.static(webInfo.dir));
   web.set('view engine', 'ejs');
   web.engine('html', require('ejs').renderFile);
   web.get('*', (req, res) => {
      web.use(express.static(webInfo.dir));
      web.set('views', webInfo.dir);
      res.render('index.html');
   });
   webs.push(web);
   app.use(vhost(webInfo.host, web));
}

if(webs.length < 1) return console.error('invalid web');

// run http server
http.createServer(app).listen(config.http.port);

// run https server
if(config.https.on) {
   const https = require('https');
   const fs = require('fs');
   const credentials = {
      key: fs.readFileSync(config.https.keys.key, 'utf8'),
      cert: fs.readFileSync(config.https.keys.cert, 'utf8'),
      ca: fs.readFileSync(config.https.keys.ca, 'utf8')
   }

   https.createServer(credentials, app).listen(config.https.port);
}

