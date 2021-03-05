export enum imageFitModes {
    center = 'center',
    fitHeight = 'height',
    fitWidth = 'width',
    stretch = 'stretch',
}

export interface ProgramArgs {
    imageFit: imageFitModes
    output?: string
    interactive?: boolean
    ignoreText?: boolean
    ascending?: boolean
    descending?: boolean
}
