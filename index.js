import bundle from './bundle'
import chalk from 'chalk'
import getConfig from './get-config'
import HELP from './help'
import isSudo from 'is-sudo'
import serve from './serve'
import watch from './watch'

process.on('uncaughtException', err => {
  console.error('Uncaught exception:', err.stack)
})

const getApps = () => (
  process.argv[3] ? process.argv.slice(3, process.argv.length) : [process.cwd()]
).map(getConfig)

switch(process.argv[2]) {
case 'bundle':
  getApps().forEach(bundle)
  break

case 'start':
  isSudo(is => {
    if (!is) {
      console.error(chalk.red(`Please run "sudo ${process.argv.join(' ')}" instead`))
      return
    }

    console.log(chalk.blue('PacPan is starting'))
    console.log(chalk.gray('To exit it, press ctrl+c'))
    const apps = getApps()
    serve(apps)
    const watchers = apps.map(watch)
    const cleanup = () => watchers.forEach(w => w())

    // clean up the temp file on exit and ctrl+c event
    process.on('exit', cleanup)
    process.on('SIGINT', cleanup)
  })
  break

case 'help':
default:
  console.log(HELP)
  break
}
