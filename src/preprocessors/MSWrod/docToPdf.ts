import path from "path"
import { spawn } from "child_process"

import scriptPath from "./docToPdf.ps1";
import { Preprocessor } from "..";
import { FileTypeResult } from "../../utils/fileType";

export const processDocFiles: Preprocessor = {
    async apply(files) {
        if (!files.length)
            return [];

        if (process.platform !== 'win32') {
            console.warn("Warning: doc to pdf conversion is currently supported only on Windows!")
            return [];
        }

        const tempFilePrefix = 'temp' + process.pid + '_'

        const args = [
            '-Noprofile',
            '-File', path.resolve(__dirname, scriptPath),
            '-prefix', tempFilePrefix,
            ...files.map(({path: filePath}) => filePath)
        ]

        const childProc = spawn(
            'powershell.exe',
            args,
            { stdio: 'pipe' }
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

        return  files
            .map(({ path: filePath, ...rest }) => ({
                ...rest,
                type: { ext: 'pdf', mime: 'application/pdf' } as FileTypeResult,
                path: path.parse(filePath)
            }))
            .map(({ path: {base, ...pathRest}, ...rest }) => ({
                ...rest,
                path: path.format({
                    ...pathRest,
                    name: tempFilePrefix + pathRest.name,
                    ext: '.pdf'
                })
            }))
    }
}
