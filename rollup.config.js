const babel = require('rollup-plugin-babel')
const replace = require('rollup-plugin-replace')

const external = Object.keys(
  require('panels/package.json').dependencies
).concat('redux-promise')

module.exports = path => ({
  onwarn(str) {
    if (!/^Treating/.test(str)) {
      console.error(str)
    }
  },
  external: external.concat(Object.keys(
    require(`${path}/package.json`).dependencies
  )),
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    }),
    babel({
      exclude: 'node_modules/**',
      plugins: [require('babel-plugin-external-helpers')],
      presets: [require('babel-preset-es-uxtemple')]
    })
  ]
})
