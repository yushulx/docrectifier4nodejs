/**
 * Type definitions for docrectifier4nodejs.
 *
 * The package is CommonJS: `module.exports = DocRectifier`.
 */

declare class DocRectifier {
    static initLicense(license: string): number;
    static getVersionNumber(): string;

    /** Legacy Document Normalizer templates (ICM_COLOUR / ICM_GRAYSCALE / ICM_BINARY). */
    static Template: {
        binary: string;
        color: string;
        grayscale: string;
    };

    /**
     * Legacy runtime settings JSON, or a full Capture Vision settings object.
     * Only `NormalizerParameterArray[0].ColourMode` is honoured for the legacy
     * shape; a settings object containing `CaptureVisionTemplates` is forwarded
     * to the SDK verbatim.
     */
    setParameters(params: string | object): number;

    /** Returns the runtime settings as a JSON string. */
    getParameters(): string;

    detectFileAsync(filePath: string): Promise<DocRectifier.QuadResult[]>;
    detectFileAsync(filePath: string, callback: DocRectifier.Callback<DocRectifier.QuadResult[]>): void;

    detectBufferAsync(buffer: Uint8Array | Buffer, width: number, height: number, stride: number): Promise<DocRectifier.QuadResult[]>;
    detectBufferAsync(buffer: Uint8Array | Buffer, width: number, height: number, stride: number, callback: DocRectifier.Callback<DocRectifier.QuadResult[]>): void;

    normalizeFileAsync(
        filePath: string,
        x1: number, y1: number,
        x2: number, y2: number,
        x3: number, y3: number,
        x4: number, y4: number
    ): Promise<DocRectifier.NormalizedImage>;

    normalizeBufferAsync(
        buffer: Uint8Array | Buffer,
        width: number, height: number, stride: number,
        x1: number, y1: number,
        x2: number, y2: number,
        x3: number, y3: number,
        x4: number, y4: number
    ): Promise<DocRectifier.NormalizedImage>;

    /** Writes the last rectified image as PNG. Returns 0 on success, -1 on failure. */
    save(filePath: string): number;
}

declare namespace DocRectifier {
    type Callback<T> = (err: Error | null, result?: T) => void;

    interface QuadResult {
        confidence: number;
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        x3: number;
        y3: number;
        x4: number;
        y4: number;
    }

    interface NormalizedImage {
        width: number;
        height: number;
        /** Always width * 4: `data` holds RGBA pixels. */
        stride: number;
        format: number;
        orientation: number;
        length: number;
        data: Buffer;
    }
}

export = DocRectifier;
