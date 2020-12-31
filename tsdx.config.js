const shebang = require('rollup-plugin-preserve-shebang')
const url = require('@rollup/plugin-url')
const path = require('path')

module.exports = {
    rollup: config => {
        config.plugins.unshift(
            url({
                include: ['**/*.ps1'],
                limit: 0
            })
        )
        config.plugins.unshift(
            shebang({
                entry: path.resolve(process.cwd(), 'src/index.ts')
            })
        );


        return config
    }
}
