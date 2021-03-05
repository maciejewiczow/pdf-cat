import mdToPdf from "md-to-pdf";
import { PdfConfig } from "md-to-pdf/dist/lib/config";
import path from "path";
import { PreprocessorFactory } from "..";
import stylePath from './style.css'

const config: Partial<PdfConfig> = {
    stylesheet: [ path.resolve(__dirname, stylePath) ],
    highlight_style: 'tomorrow',
    pdf_options: {
        // @ts-ignore - wrong typings (accets css-format margin strings)
        margin: "1.5cm 1cm 1cm"
    }
}

export const createMdPreprocessor: PreprocessorFactory = args => ({
    apply: async files => Promise.map(files, async ({ content, type, ...file}) => {
        const input = (
            content ?
                { content: content!.toString() } :
                { path: file.path }
        )

        return {
            ...file,
            path: '',
            type: {
                ext:'.pdf',
                mime: 'application/pdf'
            },
            content: (await mdToPdf(input, config)).content
        }
    })
})
