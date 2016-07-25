#! /usr/bin/env node
'use strict';

const getConfig = require('./get-config');
const packager = require('./packager');
const serve = require('./serve');

process.on('uncaughtException', err => console.error(`Uncaught exception: ${err.stack}`));

const command = process.argv[2];

// tell the mode we're working on
if (command === 'bundle') {
  const apps = (
    process.argv[3] ? process.argv.slice(3, process.argv.length) : [process.cwd()]
  ).map(getConfig);

  apps.forEach(packager.bundle);
} else if (command === 'help') {
  console.log(`
Pacpan helps you package and run panels apps with as little configuration as needed.

Development is the default mode of operation. It is what happens when you run "pacpan".

You can target multiple apps at once, just run: "pacpan . ../path/to/another/app".
Notice the first ".", it means that you want to target this directory as an app too.

"pacpan bundle" bundles the assets for you.`);
} else {
  const apps = (
    process.argv[2] ? process.argv.slice(2, process.argv.length) : [process.cwd()]
  ).map(getConfig);

  const watchers = apps.map(packager.watch);
  serve(apps);

  const cleanup = () => watchers.forEach(w => w());

  // clean up the temp file on exit and ctrl+c event
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
}
