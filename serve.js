'use strict';

const { parse } = require('url');
const chalk = require('chalk');
const child_process = require('child_process');
const denodeify = require('denodeify');
const http = require('http');
const https = require('https');
const fs = require('fs');
const pem = require('pem');
const send = require('send');
const tls = require('tls');

const createCSR = denodeify(pem.createCSR);
const createCertificate = denodeify(pem.createCertificate);

const panelsVersion = require('panels/package.json').version;
const panelsJs = require.resolve(`panels/bundle/panels-${panelsVersion}.js`);
const panelsJsonFile = `${__dirname}/panels.json`;
const playgroundFile = `${__dirname}/playground.html`;

const APPS = {};
const FILES = {
  // serve the panels runtime
  '/panels.js': panelsJs,
  // serve panels.json if it wasn't served from assets
  '/panels.json': panelsJsonFile,
  // serve the panels runtime source map
  [`/panels-${panelsVersion}.js.map`]: `${panelsJs}.map`
};
const HOST = '0.0.0.0';

function isFile(file) {
  try {
    const stat = fs.statSync(file);
    return stat.isFile();
  } catch(err) {
    return false;
  }
}

function secure(app) {
  try {
    child_process.execSync(`security delete-certificate -c ${app.domain}`, { silent: true });
  } catch (err) {
  }
  return createCSR({ commonName: app.domain })
    .then(sig =>
      createCertificate({
        clientKey: sig.clientKey,
        csr: sig.csr,
        days: 30,
        selfSigned: true
      })
    ).then(keys => {
      const tmp = `${process.cwd()}/.${app.domain}.crt.tmp`;
      fs.writeFileSync(tmp, keys.certificate);
      child_process.execSync(`security add-trusted-cert -d -r trustRoot -k "/Library/Keychains/System.keychain" ${tmp}`);
      fs.unlinkSync(tmp);

      APPS[app.domain] = {
        app,
        ctx: tls.createSecureContext({
          cert: keys.certificate,
          key: keys.serviceKey
        })
      };
    });
}

module.exports = function serve(apps) {
  Promise.all(apps.map(secure)).then(() => {
    const s = https.createServer({
      SNICallback(domain, cb) {
        cb(null, APPS[domain].ctx);
      }
    }, (req, res) => {
      const { app } = APPS[req.headers.host];

      app.handler(req, res, () => {
        try {
          const { pathname } = parse(req.url);
          const assetFile = `${app.assets}${pathname}`;
          let file;

          if (pathname === '/app.js') {
            // serve panels packaged app.js'
            file = app.tmp;
          } else if (isFile(assetFile)) {
            // serve static assets
            file = assetFile;
          } else if (FILES[pathname]) {
            file = FILES[pathname];
          } else if (app.serveAsIs.find(regex => regex.test(pathname))) {
            // serve files that the user defined they want them like that
            if (isFile(assetFile)) {
              file = assetFile;
            }
          } else {
            // catch all for index
            const customIndexFile = `${app.assets}/index.html`;

            file = fs.existsSync(customIndexFile) ? customIndexFile : playgroundFile;
          }

          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
          send(req, file).pipe(res);
        } catch(err) {
          res.writeHead(404);
          res.end();
        }
      })
    });

    s.listen(443, HOST);

    s.on('error', error => {
      if (error && error.code === 'EACCES') {
        console.error(`Pacpan uses port 80 and 443, it seems that you tried running it without enough permissions. Try "sudo pacpan" instead.`);
        process.exit();
      } else {
        console.error(error);
      }
    });

    s.on('listening', () => {
      console.log(chalk.green('pacpan is running at:'))
      console.log(apps.map(app => `https://${app.domain}`).join('\n'));
    });

    http.createServer((req, res) => {
      res.writeHead(301, { Location: `https://${req.headers.host}` })
      res.end();
    }).listen(80, HOST);
  });
}
