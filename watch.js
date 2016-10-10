import browserify from 'browserify'
import chalk from 'chalk'
import fs from 'fs'
import rollupify from 'rollupify'
import watchify from 'watchify'

let watchError
export default function watch(opts) {
  const b = browserify({
    cache: {},
    // debug: true,
    entries: [opts.entry],
    packageCache: {},
    plugin: [watchify]
  })

  const domain = chalk.dim(`[${opts.domain}${opts.root}]`)

  // entry point of our app, panels needs this to require it
  b.require(opts.entry, {expose: opts.expose})

  // expose the app dependencies
  b.require(opts.requires)

  // rollupify the bundle
  b.transform(rollupify, {config: opts.rollupConfig, sourceMaps: false})

  // declare our build's externals
  opts.externals.forEach(dep => b.external(dep))

  // run the bundle and output to the console
  function bundle() {
    b.bundle().pipe(fs.createWriteStream(opts.tmp))
  }
  bundle()

  b.on('update', bundle)
  b.on('log', msg => {
    console.log(domain, msg)
  })

  b.on('bundle', theBundle => {
    theBundle.on('error', error => {
      if (watchError !== error.stack) {
        if (error.codeFrame) {
          console.error(domain, chalk.red(`${error.constructor.name} at ${error.id}`))
          console.error(domain, error.codeFrame)
        } else {
          const match = error.stack.match(/Error: Could not resolve (.+?) from (.+?) while/)
          if (match) {
            console.error(domain, chalk.red(`ImportError at ${match[2]}`))
            console.error(domain, 'Does', chalk.blue(match[1]), 'exist? Check that import statement.')
          } else {
            console.error(domain, error.stack)
          }
        }
        watchError = error.stack
      }
      b.removeAllListeners()
      b.close()
      setTimeout(() => watch(opts), 1000)
    })
  })

  return function cleanup() {
    try {
      fs.unlinkSync(opts.tmp)
    } catch(err) {
    }

    try {
      fs.unlinkSync(`${opts.entry}.tmp`)
    } catch(err) {
    }
    process.exit()
  }
}
