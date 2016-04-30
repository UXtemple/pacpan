'use strict';

const browserify = require('browserify');
const errorify = require('errorify');
const fs = require('fs');
const rollupify = require('rollupify');

function bundle(opts) {
  const exorcist = require('exorcist');
  const mkdirp = require('mkdirp');
  const uglifyJs = require('uglify-js');

  console.log(`PacPan is getting your Panels app "${opts.expose}" ready to go :)`);
  console.time('pacpan-bundle');

  const b = browserify({
    debug: true,
    plugin: [errorify]
  });

  // entry point of our app, panels needs this to require it
  b.require(opts.entry, {entry: true, expose: opts.expose});

  // rollupify the bundle
  b.transform(rollupify, {config: opts.rollupConfig});

  // declare our build's externals
  opts.externals.forEach(dep => b.external(dep));

  // make sure the bundle directory exists
  mkdirp.sync(opts.bundle);

  // determine the bundle's full path
  const out = `${opts.expose}-${opts.version}`;

  const outJs = `${out}.js`;
  const outJsMap = `${outJs}.map`;

  const outJsMin = `${out}.min.js`;
  const outJsMinMap = `${outJsMin}.map`;

  function minify() {
    const minified = uglifyJs.minify(`${opts.bundle}/${outJs}`, {
      compress: {
        screw_ie8: true
      },
      inSourceMap: `${opts.bundle}/${outJsMap}`,
      mangle: {
        screw_ie8: true
      },
      outSourceMap: outJsMinMap
    });

    // write the minified code
    const outMinStream = fs.createWriteStream(`${opts.bundle}/${outJsMin}`, 'utf8');
    outMinStream.write(minified.code);
    outMinStream.close();

    // write the minified map code
    const outMinMapStream = fs.createWriteStream(`${opts.bundle}/${outJsMinMap}`, 'utf8');
    outMinMapStream.write(minified.map);
    outMinMapStream.close();
  }

  function buildIndexHtml() {
    const out = fs.createWriteStream(`${opts.bundle}/index.html`, 'utf8');

    const html = fs.readFileSync(`${__dirname}/playground.html`).toString()
      .replace(
        '<script src=/panels.js></script>\n',
        `<script src=/${outJsMin}></script>\<script src=https://cdn.uxtemple.com/panels.js></script>\n`
      );

    out.write(html);
    out.end();
  }

  function buildPanelsJson() {
    const out = fs.createWriteStream(`${opts.bundle}/panels.json`, 'utf8');

    const json = fs.readFileSync(`${__dirname}/panels.json`).toString().replace('app.js', outJsMin);

    out.write(json);
    out.end();

  }

  b.bundle()
    .pipe(exorcist(`${opts.bundle}/${outJsMap}`, outJsMap))
    .pipe(fs.createWriteStream(`${opts.bundle}/${outJs}`), 'utf8')
    .on('finish', () => {
      minify();
      buildIndexHtml();
      buildPanelsJson();

      console.timeEnd('pacpan-bundle');
      console.log(`PacPan just finished. Your bundle is at ${opts.bundle}:`);
      console.log(fs.readdirSync(opts.bundle).join(', '));
    });
}

function watch(opts) {
  const watchify = require('watchify');

  const b = browserify({
    cache: {},
    debug: true,
    packageCache: {},
    plugin: [errorify, watchify]
  });

  // entry point of our app, panels needs this to require it
  b.require(opts.entry, {entry: true, expose: opts.expose});

  // rollupify the bundle
  b.transform(rollupify, {config: opts.rollupConfig});

  // declare our build's externals
  opts.externals.forEach(dep => b.external(dep));

  // run the bundle and output to the console
  function bundle() {
    b.bundle().pipe(fs.createWriteStream(opts.tmp));
  }
  bundle();

  b.on('update', bundle);
  b.on('bytes', bytes => console.log(`${bytes} bytes written`));

  return function cleanup() {
    try {
      fs.unlinkSync(opts.tmp);
    } catch(err) {
    }

    try {
      fs.unlinkSync(`${opts.entry}.tmp`);
    } catch(err) {
    }
    process.exit();
  };
}

module.exports = {
  bundle,
  watch
};
