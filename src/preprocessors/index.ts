import { Argv } from "yargs";
import { ProgramArgs } from "../config/constants";
import { MimeType, FileTypeResult } from "../utils/fileType";
import { processDocFiles } from "./MSWrod/docToPdf";

export interface FileDescriptor {
    path: string,
    orderNo: number,
    content?: Buffer,
    type?: FileTypeResult
}

export interface Preprocessor {
    apply(files: FileDescriptor[]): Promise<FileDescriptor[]>
}

export type PreprocessorFactory = (args: Argv<ProgramArgs>['argv']) => Preprocessor;

export type PreprocessorMap = Partial<Record<MimeType, Preprocessor | PreprocessorFactory>>;

const preprocessorMap: PreprocessorMap = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': processDocFiles,
}

export const preprocess = (args: Argv<ProgramArgs>['argv']) =>  {
    const preprocessors =
        Object.entries(preprocessorMap)
            .map(([type, preprocessorOrFactory]) => ([
                type,
                preprocessorOrFactory instanceof Function ?
                    preprocessorOrFactory(args) :
                    preprocessorOrFactory as Preprocessor
            ])) as [MimeType, Preprocessor][]


    return async (files: FileDescriptor[]): Promise<FileDescriptor[]> => {
        const byType = files.reduce<Partial<Record<MimeType, FileDescriptor[]>>>((result, x) => {
            if (!x.type?.mime)
                return result;

            (result[x.type.mime] = result[x.type.mime] || []).push(x);

            return result;
        }, {});

        return (await Promise.all(
            preprocessors
                .flatMap(([type, preprocessor]) =>(
                    byType[type as MimeType] ? (
                        preprocessor!.apply(byType[type as MimeType] as FileDescriptor[])
                    ) :
                    []
                ))
        )).flatMap(x => x)
    }
}
