#!/usr/bin/env node

import fs from 'fs'
import { PDFDocument, PDFImage, PDFPage } from 'pdf-lib'
import FileType from 'file-type'
global.Promise = require('bluebird');

import yargs from "./config/argv";
import { xor, getNumbersFromFileName, readFileToBuffer, rangeArray } from './utils';
import { createDrawConfig } from './utils/draw';

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

(async () => {
    const {
        _: filePaths,
        descending = false,
        ascending = false,
        ignoreText = false,
        output,
        imageFit,
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
