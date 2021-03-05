#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { PDFDocument, PDFImage } from 'pdf-lib'
global.Promise = require('bluebird')

import yargs from "./config/argv"
import { readFileToBuffer, rangeArray } from './utils'
import { createDrawConfig } from './utils/draw'
import { FileDescriptor, preprocess } from './preprocessors'
import { getFileType } from './utils/fileType'
import { reorderFiles } from './sortFiles'

const { argv } = yargs

if (argv._.length === 0) {
    console.error("No input files were specified!\n")
    yargs.showHelp()
    process.exit(2)
}

if ((argv.output === undefined || argv.output.trim().length === 0) && process.stdout.isTTY) {
    console.error('Cannot print raw pdf file to the terminal. Pipe the output somewhere or use --output option to specify output file')
    process.exit(2)
}

const unlink = Promise.promisify(fs.unlink);/* (path: string) => console.log("unlinking " + path); */

(async () => {
    const {
        output,
        imageFit,
    } = argv

    const filePaths = argv._.map(val => val.toString())

    const files = await Promise.map(
        reorderFiles(filePaths, argv),
        async (fileName, index): Promise<FileDescriptor> => {
            const filePath = path.resolve(process.cwd(), fileName);

            return {
                path: filePath,
                orderNo: index,
                type: await getFileType(filePath),
            };
        }
    )

    const preprocessedFiles = await preprocess(argv)(files);

    // replace doc file paths with paths to converted pdf files
    for (const entry of preprocessedFiles.sort((a, b) => b.orderNo - a.orderNo))
        files[entry.orderNo] = entry

    const resultDocument = await PDFDocument.create();

    await Promise.map(files, async ({content, ...file}) => ({
            ...file,
            content: content ?? await readFileToBuffer(file.path)
        }))
        .map(async ({ path, content, type }) => {
            if (!type) {
                console.error(`${path}: unknown file type. Skipping...`)
                return
            }

            if (type.mime === 'image/jpeg')
                return resultDocument.embedJpg(content)

            if (type.mime === 'image/png')
                return resultDocument.embedPng(content)

            if (type.mime === 'application/pdf')
                return PDFDocument.load(content)

            console.error(`${path}: unsupported file type (${type.mime}). Skipping...`)
        })
        .map(async imageOrDoc => {
            if (imageOrDoc instanceof PDFImage) {
                const page = resultDocument.addPage()

                page.drawImage(imageOrDoc, createDrawConfig(imageOrDoc, page, imageFit))
            }
            if (imageOrDoc instanceof PDFDocument) {
                const pages = await resultDocument.copyPages(imageOrDoc, rangeArray(0, imageOrDoc.getPageCount() - 1))
                pages.forEach(p => resultDocument.addPage(p))
            }
        })

    const rawResult = await resultDocument.save()

    if (output) {
        const out = fs.createWriteStream(output)
        out.write(rawResult)
    } else {
        process.stdout.write(rawResult)
    }

    await Promise.all(preprocessedFiles.map(({ path }) => (path.length > 0) && unlink(path)))
})()
    .catch((e: any) => {
        console.error('An error ocurred while the files were being processed!\n', e)
        process.exit(1)
    })
