'use strict';

const child_process = require('child_process');
const http = require('http');
const http2 = require('http2');
const fs = require('fs');
const pem = require('pem');
const send = require('send');

const panelsVersion = require('../panels/package.json').version;
const panelsFile = require.resolve(`../panels/bundle/panels-${panelsVersion}.js`);
// TODO abstract, bundle, etc. (in panels)
const panelsWorkerFile = require.resolve(`../panels/bundle/panels-worker.js`);
const panelsJsonFile = `${__dirname}/panels.json`;
const playgroundFile = `${__dirname}/playground.html`;

function isFile(file) {
  try {
    const stat = fs.statSync(file);
    return stat.isFile();
  } catch(err) {
    return false;
  }
}

const CRT = `${process.cwd()}/.crt.tmp`;

module.exports = function serve(opts) {
  try {
    child_process.execSync(`security delete-certificate -c ${opts.domain}`);
  } catch (err) {
  }

  pem.createCSR({ commonName: opts.domain }, (err, sig) => {
    pem.createCertificate({ clientKey: sig.clientKey, csr: sig.csr, days: 30, selfSigned: true }, (err, keys) => {
      fs.writeFileSync(CRT, keys.certificate);
      child_process.execSync(`security add-trusted-cert -d -r trustRoot -k "/Library/Keychains/System.keychain" ${CRT}`);
      fs.unlinkSync(CRT);

      const s = http2.createServer({key: keys.serviceKey, cert: keys.certificate}, (req, res) => {
        try {
          const assetFile = `${opts.assets}${req.url}`;
          let file;

          if (req.url === '/panels.js') {
            // serve the panels runtime
            file = panelsFile;

          } else if (req.url === '/panels-worker.js') {
            // serve the panels worker
            file = panelsWorkerFile;

          } else if (req.url === `/panels-${panelsVersion}.js.map`) {
            // serve the panels runtime source map
            file = `${panelsFile}.map`;

          } else if (req.url === '/app.js') {
            // serve panels packaged app.js'
            file = opts.tmp;

          } else if (isFile(assetFile)) {
            // serve static assets
            file = assetFile;

          } else if (req.url === '/panels.json') {
            // serve panels.json if it wasn't served from assets
            file = panelsJsonFile;
          } else if (opts.serveAsIs.find(regex => regex.test(req.url))) {
            // serve files that the user defined they want them like that
            if (isFile(assetFile)) {
              file = assetFile;
            }
          } else {
            // catch all for index
            const customIndexFile = `${opts.assets}/index.html`;

            file = fs.existsSync(customIndexFile) ? customIndexFile : playgroundFile;
          }

          send(req, file).pipe(res);
        } catch(err) {
          console.error('err', err)
        }
      });

      s.listen(443, opts.host);

      s.on('error', error => {
        if (error && error.code === 'EACCES') {
          console.error(`Can't use port ${opts.port} to run your app. Try running "sudo pacpan" instead`);
          process.exit();
        }
      });

      s.on('listening', () => {
        console.log(`pacpan is running at https://${opts.domain}`);
      });

      http.createServer((req, res) => {
        res.writeHead(301, { Location: `https://${opts.domain}` })
        res.end();
      }).listen(80, opts.host);
    });
  });
}
