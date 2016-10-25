const babel = require('rollup-plugin-babel')
const replace = require('rollup-plugin-replace')

const external = [
  'react',
  'react-dom',
  'panels',
  'panels/blocks',
  'panels/normalise-uri',
  'panels/snap',
  // legacy
  'panels-ui',
  'usepages-blocks',
  'react-flip-move'
]

module.exports = path => ({
  onwarn(str) {
    if (!/^Treating/.test(str)) {
      console.error(str)
    }
  },
  external: external.concat(Object.keys(
    require(`${path}/package.json`).dependencies || {}
  )),
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    }),
    babel({
      exclude: 'node_modules/**',
      presets: [require.resolve('babel-preset-react-app-rollup')]
    })
  ]
})
