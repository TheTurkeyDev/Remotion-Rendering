import path from 'path';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia } from '@remotion/renderer';
import { getDB } from './rest';
import { RenderStatus } from './render-status';

export const render = async (id: string, compId: string, entry: string, inputProps: object | null) => {
    const db = getDB();
    console.log('Creating a Webpack bundle of the video');
    const bundleLocation = await bundle(path.resolve(entry), () => undefined, {
        // If you have a Webpack override, make sure to add it here
        webpackOverride: config => config,
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
    const composition = comps.find(c => c.id === compId);

    // Ensure the composition exists
    if (!composition) {
        const error = `No composition with the ID ${compId} found. Review "${entry}" for the correct ID.`;
        db.prepare('UPDATE videos SET status=?, error=? WHERE id=?;').run(RenderStatus.ERRORED, error, id);
        return;
    }

    const outputLocation = `${process.env.OUTPUT_FOLDER ?? ''}/${id}.mp4`;
    db.prepare('UPDATE videos SET status=? WHERE id=?;').run(RenderStatus.RENDERING, id);
    console.log('Attempting to render:', outputLocation);

    await renderMedia({
        composition,
        serveUrl: bundleLocation,
        outputLocation,
        inputProps,
        codec: 'h264',
        onProgress: ({ progress }) => {
            db.prepare('UPDATE videos SET progress=? WHERE id=?;').run(progress, id);
            console.log(`Rendering is ${progress * 100}% complete`);
        },
        // codec: 'prores',
        // proResProfile: '4444',
        // imageFormat: 'png',
        // pixelFormat: 'yuva444p10le', These are for video with alpha
    });
    db.prepare('UPDATE videos SET status=? WHERE id=?;').run(RenderStatus.COMPLETE, id);
    console.log('Render done!');
};