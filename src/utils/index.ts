import fs from 'fs';
import path from 'path';

export const xor = (a: boolean, b: boolean) => a ? !b : b;

export const readFileToBuffer = (filename: string): Promise<Buffer> => (
    new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filename)

        let buffer = Buffer.alloc(0);
        stream
            .on('data', data => buffer = Buffer.concat([buffer, (data as Buffer)]))
            .on('end', () => resolve(buffer))
            .on('error', reject)
    })
)

export const getNumbersFromFileName = (filePath: string) =>(
    +path.parse(filePath).name.replace(/[^0-9.]/g, '')
)

export const rangeArray = (start: number, end: number, step = 1) =>(
    new Array(end - start + 1).fill(0).map((x, i) => start + i * step)
)
