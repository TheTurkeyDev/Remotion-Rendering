import path from 'path';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';

export const render = async (id: string, compId: string, entry: string, inputProps: object | null) => {
    console.log('Creating a Webpack bundle of the video');
    const bundleLocation = await bundle(path.resolve(entry), () => undefined, {
        // If you have a Webpack override, make sure to add it here
        webpackOverride: (config) => config,
    });

    // Extract all the compositions you have defined in your project
    // from the webpack bundle.
    const comps = await getCompositions(bundleLocation, {
        // You can pass custom input props that you can retrieve using getInputProps()
        // in the composition list. Use this if you want to dynamically set the duration or
        // dimensions of the video.
        inputProps,
    });

    // Select the composition you want to render.
    const composition = comps.find((c) => c.id === compId);

    // Ensure the composition exists
    if (!composition) {
        throw new Error(`No composition with the ID ${compId} found. Review "${entry}" for the correct ID.`);
    }

    const outputLocation = `${process.env.OUTPUT_FOLDER ?? ''}/${id}.mp4`;
    console.log('Attempting to render:', outputLocation);
    await renderMedia({
        composition,
        serveUrl: bundleLocation,
        outputLocation,
        inputProps,
        codec: 'h264',
        // codec: 'prores',
        // proResProfile: '4444',
        // imageFormat: 'png',
        // pixelFormat: 'yuva444p10le', These are for video with alpha
    });
    console.log('Render done!');
};