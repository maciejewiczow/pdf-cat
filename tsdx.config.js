const shebang = require('rollup-plugin-preserve-shebang');
const path = require('path')

module.exports = {
    rollup: config => {
        config.plugins.unshift(shebang(
            {
                entry: path.resolve(process.cwd(), 'src/index.ts')
            }
        ));
        console.log(config)

        return config;
    }
}
