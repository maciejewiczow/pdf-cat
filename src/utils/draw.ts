import { PDFImage, PDFPage } from "pdf-lib";
import { imageFitModes } from "../config/constants";

export const createDrawConfig = (image: PDFImage, page: PDFPage, fitMode: imageFitModes) => {
    switch (fitMode) {
        case imageFitModes.center:
            return {
                x: page.getWidth() / 2 - image.width / 2,
                y: page.getHeight() / 2 - image.height / 2,
                width: image.width,
                height: image.height,
            };
        case imageFitModes.stretch:
            return {
                x: 0,
                y: 0,
                width: page.getWidth(),
                height: page.getHeight()
            };
        case imageFitModes.fitHeight: {
            const rescaled = image.scale(page.getHeight() / image.height);
            return {
                x: page.getWidth() / 2 - rescaled.width / 2,
                y: 0,
                width: rescaled.width,
                height: rescaled.height
            };
        }
        case imageFitModes.fitWidth: {
            const rescaled = image.scale(page.getWidth() / image.width);
            return {
                x: 0,
                y: page.getHeight() / 2 - rescaled.height / 2,
                width: rescaled.width,
                height: rescaled.height
            };
        }
    }
}
