import path from "path"
import { spawn } from "child_process"
import FileType from 'file-type'

import scriptPath from "./processDocFiles.ps1";

export const processDocFiles = async (fileNames: string[]) => {
    const files = await Promise.map(
        fileNames,
        (filePath, originalIndex) => ({filePath: filePath, originalIndex })
    ).filter(
        async ({ filePath }) => (
            (await FileType.fromFile(filePath))?.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    ).map(({filePath, ...file}) => ({
        ...file,
        filePath: path.resolve(process.cwd(), filePath)
    }))

    if (!files.length)
        return undefined;

    if (process.platform !== 'win32') {
        console.warn("Warning: doc to pdf conversion is currently supported only on Windows!")
        return undefined;
    }

    const tempFilePrefix = 'temp' + process.pid + '_'

    const args = [
        '-Noprofile',
        '-File', path.resolve(__dirname, scriptPath),
        '-prefix', tempFilePrefix,
        ...files.map(({filePath}) => filePath)
    ]

    const childProc = spawn(
        'powershell.exe',
        args
    )

    childProc.stderr.on('data', chunk => console.error(chunk.toString()))

    await new Promise((resolve, reject) => {
        childProc.once('exit', (code, sig) => {
            if (code === 0)
                resolve();

            reject({code, sig});
        })
        childProc.once('error', reject)
        childProc.once('close', code => {
            if (code === 0)
                resolve();

            reject(code);
        })
    })

    return files
        .map(({ filePath, ...rest }) => ({
            ...rest,
            filePath: path.parse(filePath)
        }))
        .map(({ filePath: {base, ...filePath}, ...rest }) => ({
            ...rest,
            filePath: path.format({
                ...filePath,
                name: tempFilePrefix + filePath.name,
                ext: '.pdf'
            })
        }))
}
