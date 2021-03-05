import { Argv } from "yargs";
import { prompt } from "enquirer";
import { ProgramArgs } from "./config/constants";
import { getNumbersFromFileName, xor } from "./utils";

export const reorderFiles = async (filePaths: string[], args: Argv<ProgramArgs>['argv']): Promise<string[]> => {
    const {
        descending = false,
        ascending = false,
        ignoreText = false,
        interactive = false,
        output
    } = args;

    const sorted = xor(ascending, descending) ? (
        filePaths.sort((a, b) => {
            const result = !ignoreText ?
                a.localeCompare(b) :
                getNumbersFromFileName(a) - getNumbersFromFileName(b)

            return (descending ? -1 : 1) * result
        })
    ) : (
        filePaths
    )

    if (interactive) {
        if (!output) {
            console.error('No output file specified - cannot use stdout interactively (because it would interfere with final pdf result)')
            return sorted;
        }

        const { reordered } = await prompt<{reordered: string[]}>({
            type: 'sort',
            name: 'reordered',
            message: 'Change order in with files will be concatenated',
            choices: sorted,
            numbered: true,
        })

        return reordered;
    }

    return sorted;
}
