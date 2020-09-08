#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { PDFDocument, PDFImage, PDFPage } from 'pdf-lib'
import FileType from 'file-type'
import yargsConstructor, { Argv } from "yargs";
global.Promise = require('bluebird');

enum imageFitModes {
    center = 'center',
    fitHeight = 'fit-height',
    fitWidth = 'fit-width',
    stretch = 'stretch',
}

interface ProgramArgs {
    imageFit: imageFitModes
    output?: string
    ignoreText?: boolean
    ascending?: boolean
    descending?: boolean
}

const yargs = (yargsConstructor as Argv<ProgramArgs>)
    .parserConfiguration({
        'dot-notation': false,
    })
    .option('o', {
        alias: 'output',
        description: 'Path to the output file. If not specified, result is printed to stdout',
        requiresArg: true,
        type: 'string',
        coerce: pathStr => path.resolve(pathStr.trim())
    })
    .option('image-fit', {
        description: `Controlls the alignment of an image on a page`,
        requiresArg: true,
        default: imageFitModes.fitHeight,
        choices: Object.values(imageFitModes),
    })
    .option('ignore-text', {
        description: 'Ignore text in file names while sorting',
        type: 'boolean'
    })
    .option('a', {
        alias: 'ascending',
        description: 'Sorts input files alphabetically in ascending order before processing. Conflicts with \'descending\'',
        type: 'boolean',
        conflicts: 'd'
    })
    .option('d', {
        alias: 'descending',
        description: 'Sorts input files alphabetically in descending order before processing. Conflicts with \'ascending\'',
        type: 'boolean',
        conflicts: 'a'
    })
    .usage('Usage: $0 [OPTIONS] [FILES...]')
    .help()
    .version()
    .alias('h', 'help')
    .alias('v', 'version')

const { argv } = yargs

if (argv._.length === 0) {
    console.error("No input files were specified!\n")
    yargs.showHelp();
    process.exit(2);
}

if ((argv.output === undefined || argv.output.trim().length === 0) && process.stdout.isTTY) {
    console.error('Cannot print raw pdf file to the terminal. Pipe the output somewhere or use --output option to specify output file');
    process.exit(2);
}

const xor = (a: boolean, b: boolean) => a ? !b : b;

const readFileToBuffer = (filename: string): Promise<Buffer> =>
    new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filename)

        let buffer = Buffer.alloc(0);
        stream
            .on('data', data => buffer = Buffer.concat([buffer, (data as Buffer)]))
            .on('end', () => resolve(buffer))
            .on('error', reject)
    });

const createDrawConfig = (image: PDFImage, page: PDFPage, fitMode: imageFitModes) => {
    switch (fitMode) {
        case imageFitModes.center:
            return {
                x: page.getWidth() / 2 - image.width / 2,
                y: page.getHeight() / 2 - image.height / 2,
                width: image.width,
                height: image.height,
            };
        case imageFitModes.stretch:
            return {
                x: 0,
                y: 0,
                width: page.getWidth(),
                height: page.getHeight()
            };
        case imageFitModes.fitHeight: {
            const rescaled = image.scale(page.getHeight() / image.height);
            return {
                x: page.getWidth() / 2 - rescaled.width / 2,
                y: 0,
                width: rescaled.width,
                height: rescaled.height
            };
        }
        case imageFitModes.fitWidth: {
            const rescaled = image.scale(page.getWidth() / image.width);
            return {
                x: 0,
                y: page.getHeight() / 2 - rescaled.height / 2,
                width: rescaled.width,
                height: rescaled.height
            };
        }
    }
}

const getNumbersFromFileName = (filePath: string) =>
    +path.parse(filePath).name.replace(/[^0-9.]/g, '');

const rangeArray = (start: number, end: number, step = 1) => new Array(end - start + 1).fill(0).map((x, i) => start + i * step);

(async () => {
    const {
        _: filePaths,
        descending = false,
        ascending = false,
        output,
        imageFit,
        ignoreText = false
    } = argv;

    const files = xor(ascending, descending) ?
        filePaths.sort((a, b) => {
            const result = !ignoreText ?
                a.localeCompare(b) :
                getNumbersFromFileName(a) - getNumbersFromFileName(b);

            return (descending ? -1 : 1) * result;
        }) :
        filePaths;

    const result = await PDFDocument.create();

    await Promise.map(files, async filePath => {
        const buffer = await readFileToBuffer(filePath)

        return {
            buffer,
            filePath,
        }
    })
        .map(async ({ filePath, buffer }) => {
            let type = await FileType.fromFile(filePath)

            if (!type) {
                console.error(`${filePath}: unknown file type. Skipping...`);
                return;
            }

            if (type.mime === 'image/jpeg')
                return await result.embedJpg(buffer)

            if (type.mime === 'image/png')
                return await result.embedPng(buffer)

            if (type.mime === 'application/pdf')
                return await PDFDocument.load(buffer);

            console.error(`${filePath}: unsupported file type (${type.mime}). Skipping...`)
        })
        .map(async imageOrDoc => {
            if (imageOrDoc instanceof PDFImage) {
                const page = result.addPage();

                page.drawImage(imageOrDoc, createDrawConfig(imageOrDoc, page, imageFit))
            }
            if (imageOrDoc instanceof PDFDocument) {
                const pages = await result.copyPages(imageOrDoc, rangeArray(0, imageOrDoc.getPageCount() - 1))
                pages.forEach(p => result.addPage(p))
            }
        })

    const rawResult = await result.save();

    if (output) {
        const out = fs.createWriteStream(output);
        out.write(rawResult);
    } else {
        process.stdout.write(rawResult);
    }
})()
    .catch(e => {
        console.error('An error ocurred while the files were being processed!\n' + e);
        process.exit(1)
    })
