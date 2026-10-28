# Node.js Document Rectification

Detect the boundaries of a document in a photo and rectify (deskew / crop) it, for Node.js. It exposes the
familiar `docrectifier4nodejs` API on top of
[dynamsoft-capture-vision-for-node](https://www.npmjs.com/package/dynamsoft-capture-vision-for-node):

- **No native build step.** No `node-gyp`, no C++ compiler, no prebuilt `.node` binaries.
- **Same JavaScript API.** Existing code keeps working without modification.
- **Works with photo, scan or PDF input** - the SDK decodes the file, this package does the perspective
  correction of the quadrilateral you pass in.

```js
const DocRectifier = require('docrectifier4nodejs');

DocRectifier.initLicense('LICENSE-KEY');

const rectifier = new DocRectifier();
const quads = await rectifier.detectFileAsync('photo.png');
const quad = quads[0];

await rectifier.normalizeFileAsync('photo.png', quad.x1, quad.y1, quad.x2, quad.y2, quad.x3, quad.y3, quad.x4, quad.y4);
rectifier.save('document.png');
```

## License Key

Get a [30-day FREE trial license](https://www.dynamsoft.com/customer/license/trialLicense/?product=dcv&package=cross-platform)
to activate the SDK.

## Installation

```bash
npm install docrectifier4nodejs
```

Requirements:

- Node.js >= 16
- Windows, Linux or macOS. The platform specific native library is pulled in automatically as an optional
  dependency of `dynamsoft-capture-vision-for-node`.

## Quick Start

1. Set the license key.

    ```js
    DocRectifier.initLicense('LICENSE-KEY');
    ```

2. Create a rectifier and pick the output colour mode.

    ```js
    const rectifier = new DocRectifier();
    rectifier.setParameters(DocRectifier.Template.color);   // or .grayscale / .binary
    ```

3. Detect the document boundaries.

    ```js
    const results = await rectifier.detectFileAsync('photo.png');
    // [{ confidence: 92, x1: 125, y1: 29, x2: 737, y2: 67, x3: 716, y3: 989, x4: 15, y4: 933 }]
    ```

4. Rectify the document with the quadrilateral of your choice.

    ```js
    const image = await rectifier.normalizeFileAsync('photo.png',
        results[0].x1, results[0].y1, results[0].x2, results[0].y2,
        results[0].x3, results[0].y3, results[0].x4, results[0].y4);

    // image.width, image.height, image.data (RGBA)
    ```

5. Save the result.

    ```js
    rectifier.save('document.png');
    ```

## API

| Method | Description |
|---|---|
| `DocRectifier.initLicense(license: string): number` | Initialise the license, `0` means success. |
| `DocRectifier.getVersionNumber(): string` | Capture Vision version, e.g. `js:3.6.4002.20261019;cpp:3.6.40.9167`. |
| `DocRectifier.Template` | `binary` / `color` / `grayscale` legacy template strings. |
| `setParameters(template: string \| object): number` | Legacy runtime settings, or a Capture Vision settings object. |
| `getParameters(): string` | Current runtime settings as JSON. |
| `detectFileAsync(filePath, callback?)` | Detect document boundaries. |
| `detectBufferAsync(buffer, width, height, stride, callback?)` | Same, from raw pixels. |
| `normalizeFileAsync(filePath, x1, y1, ..., y4, callback?)` | Rectify using the given quadrilateral. |
| `normalizeBufferAsync(buffer, width, height, stride, x1, y1, ..., y4, callback?)` | Same, from raw pixels. |
| `save(filePath): number` | Write the last rectified image (PNG). |

All async methods return a Promise when no `callback` is given, and call `callback(err, result)` otherwise.

**QuadResult**

```ts
{ confidence: number, x1, y1, x2, y2, x3, y3, x4, y4: number }
```

**NormalizedImage**

```ts
{
  width: number,
  height: number,
  stride: number,   // always width * 4
  format: number,   // EnumImagePixelFormat.IPF_ARGB_8888
  orientation: number,
  length: number,
  data: Buffer      // RGBA, 4 bytes per pixel
}
```

## Raw Pixels

`detectBufferAsync()` and `normalizeBufferAsync()` take raw pixels. The format is inferred from the stride:

| stride | pixel format |
|---|---|
| `width` | grayscale |
| `width * 3` | RGB |
| `width * 4` | ARGB |

```js
const quads = await rectifier.detectBufferAsync(rgb, width, height, width * 3);
```

## How It Works

- **Detection** is done by Dynamsoft Capture Vision (`DetectDocumentBoundaries_Default`).
- **Rectification** of an explicit quadrilateral is done in JavaScript: the SDK returns the original pixels
  (`OutputOriginalImage`), and this package computes the homography from your quad to a rectangle and samples
  the image. That keeps `normalize*Async(file, x1..y4)` working with *any* quadrilateral, not just the one
  the detector found.
- **Colour mode** follows `NormalizerParameterArray[0].ColourMode`:
  `ICM_COLOUR` keeps the colours, `ICM_GRAYSCALE` converts to gray, `ICM_BINARY` binarises with an
  automatically computed (Otsu) threshold.
- **`save()` writes PNG.** The SDK's own `ImageIO.saveToFile()` throws on every input (still true in
  3.6.4003), so the PNG encoder is built in (Node's `zlib`, no dependency).

## Examples

- [Command line](./examples/command-line)

    ```bash
    node examples/command-line/test.js
    ```

- [Web](./examples/web)

    ```bash
    cd examples/web && npm install && node app.js
    ```

    Then open <http://localhost:2025>.

## Testing

```bash
npm test
DCV_LICENSE=YOUR-LICENSE-KEY npm test
```

## License

MIT
