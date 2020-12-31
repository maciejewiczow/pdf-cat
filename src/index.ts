#!/usr/bin/env node

import fs from 'fs'
import { PDFDocument, PDFImage } from 'pdf-lib'
import FileType from 'file-type'
global.Promise = require('bluebird')

import yargs from "./config/argv"
import { xor, getNumbersFromFileName, readFileToBuffer, rangeArray } from './utils'
import { createDrawConfig } from './utils/draw'
import { processDocFiles } from './utils/processDocFiles'
import path from 'path'

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

(async () => {
    const {
        descending = false,
        ascending = false,
        ignoreText = false,
        output,
        imageFit,
    } = argv

    const filePaths = argv._.map(val => val.toString())

    const files = (
            xor(ascending, descending) ? (
                    filePaths.sort((a, b) => {
                        const result = !ignoreText ?
                            a.localeCompare(b) :
                            getNumbersFromFileName(a) - getNumbersFromFileName(b)

                        return (descending ? -1 : 1) * result
                    })
                ) : (
                    filePaths
                )
        )
        .map(str => path.resolve(process.cwd(), str))

    const result = await PDFDocument.create()

    const processedDocFileNames = await processDocFiles(files)

    if (processedDocFileNames)
        // replace doc file paths with paths to converted pdf files
        for (const entry of processedDocFileNames.sort((a, b) => b.originalIndex - a.originalIndex))
            files[entry.originalIndex] = entry.filePath

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
                console.error(`${filePath}: unknown file type. Skipping...`)
                return
            }

            if (type.mime === 'image/jpeg')
                return result.embedJpg(buffer)

            if (type.mime === 'image/png')
                return result.embedPng(buffer)

            if (type.mime === 'application/pdf')
                return PDFDocument.load(buffer)

            console.error(`${filePath}: unsupported file type (${type.mime}). Skipping...`)
        })
        .map(async imageOrDoc => {
            if (imageOrDoc instanceof PDFImage) {
                const page = result.addPage()

                page.drawImage(imageOrDoc, createDrawConfig(imageOrDoc, page, imageFit))
            }
            if (imageOrDoc instanceof PDFDocument) {
                const pages = await result.copyPages(imageOrDoc, rangeArray(0, imageOrDoc.getPageCount() - 1))
                pages.forEach(p => result.addPage(p))
            }
        })

    const rawResult = await result.save()

    if (output) {
        const out = fs.createWriteStream(output)
        out.write(rawResult)
    } else {
        process.stdout.write(rawResult)
    }

    const unlink = Promise.promisify(fs.unlink)

    if (processedDocFileNames) {
        await Promise.map(
            processedDocFileNames,
            ({ filePath }) => unlink(filePath)
        )
    }
})()
    .catch((e: any) => {
        console.error('An error ocurred while the files were being processed!\n', e)
        process.exit(1)
    })
