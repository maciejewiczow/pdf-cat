import yargsConstructor, { Argv } from "yargs";
import path from 'path';
import { ProgramArgs, imageFitModes } from "./constants";

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
    .option('i', {
        alias: 'interactive',
        description: 'Interactive mode. Allows for interactive file reordering.\nWill be ignored when no output file is specified (-o flag not used)',
        type: 'boolean',
    })
    .usage('Usage: $0 [OPTIONS] [FILES...]')
    .help()
    .version()
    .alias('h', 'help')
    .alias('v', 'version')

export default yargs;
