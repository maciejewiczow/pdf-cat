import FileType, { MimeType as LibMimeType } from "file-type";
import path from "path";

export type MimeType = LibMimeType | "text/markdown";

export interface FileTypeResult {
    readonly ext: string,
    readonly mime: MimeType
}

export const getFileType = async (filePath: string): Promise<FileTypeResult | undefined> => {
    const type = await FileType.fromFile(filePath);

    if (type)
        return type;

    const { ext } = path.parse(filePath);

    if (ext === '.md') {
        return {
            ext: ext.substr(1),
            mime: 'text/markdown'
        }
    }

    return undefined;
}

