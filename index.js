#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { PDFDocument } = require('pdf-lib')

const yargs = require('yargs')
    .parserConfiguration({
        'dot-notation': false,
        'halt-at-non-option': false,
        'camel-case-expansion': false,
        'strip-aliased': true
    })
    .option('output', {
        alias: 'o',
        description: 'Path to the output file. If not specified, result is printed to stdout',
        requiresArg: true,
        demandOption: false,
        type: 'string',
        coerce: pathStr => path.resolve(pathStr.trim())
    })
    .usage('Usage: $0 [OPTIONS] [FILES...]')
    .help()
    .version()
    .alias('help', 'h')
    .alias('version', 'v')

const { argv } = yargs

if (argv._.length === 0) {
    console.error("No input files specified\n")
    yargs.showHelp();
    process.exit(2);
}

if ((argv.output === undefined || argv.output.trim().length === 0) && process.stdout.isTTY) {
    console.error('Cannot print raw pdf file to the terminal. Pipe the output somewhere or use --output option to specify output file');
    process.exit(2);
}

(async () => {
    const range = (start, end, step = 1) => new Array(end - start + 1).fill().map((x, i) => start + i * step)

    try {
        const result = await PDFDocument.create();
        const docs = await Promise.all(
            argv._.map(filePath =>
                new Promise(resolve => {
                    const stream = fs.createReadStream(filePath)

                    let buffer = Buffer.alloc(0);
                    stream
                        .on('data', data => buffer = Buffer.concat([buffer, data]))
                        .on('end', () => resolve(buffer))
                })
                    .then(buff => PDFDocument.load(buff))
            )
        )
        await Promise.all(
            docs.map(async document => {
                const pages = await result.copyPages(document, range(0, document.getPageCount() - 1))
                pages.forEach(p => result.addPage(p))
            })
        )

        const outStream = argv.output ? fs.createWriteStream(argv.output) : process.stdout

        outStream.write(await result.save())
        if (outStream.close)
            outStream.close()
    } catch (e) {
        console.error('An error ocurred while the files were being processed!\n' + e);
        process.exit(1);
    }
})().finally(() => process.exit(0))
