export enum imageFitModes {
    center = 'center',
    fitHeight = 'fit-height',
    fitWidth = 'fit-width',
    stretch = 'stretch',
}

export interface ProgramArgs {
    imageFit: imageFitModes
    output?: string
    ignoreText?: boolean
    ascending?: boolean
    descending?: boolean
}
