import express from 'express';
import { execSync } from 'child_process';
import fs from 'fs';
import { render } from './render';
import cors from 'cors';
const app = express();
app.use(express.json());
app.use(cors({ credentials: true, origin: true }));
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

type RenderBody = {
    readonly git: string
    readonly compositionId: string
    readonly entry: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly directives: readonly any[]
}

app.post('/render', async (req, res) => {
    const key = process.env.RR_KEY ?? '';
    if (!!key && (!req.query.key || key !== req.query.key)) {
        res.sendStatus(401);
        return;
    }
    const body = req.body as RenderBody;

    if (!body.git || !body.compositionId || !body.entry || (body.directives ?? []).length === 0) {
        res.sendStatus(400);
        return;
    }

    const id = randomUID();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send({ id, format: 'mp4' });
    await deleteTemp();
    execSync(`git clone ${body.git} temp`, { encoding: 'utf-8' });
    console.log('npm install...');
    execSync('npm i', { cwd: './temp', encoding: 'utf-8' });
    await render(id, body.compositionId, body.entry, { directives: body.directives });
    await deleteTemp();
});

async function deleteTemp() {
    const dir = './temp';
    console.log('Deleting temp directory...');
    if (fs.existsSync(dir))
        fs.rmSync(dir, { recursive: true });
    console.log(`${dir} is deleted!`);
}

app.get('/output/:id', async (req, res) => {
    res.download(`./output/${req.params.id}`, err => { if (!!err) res.sendStatus(404); });
});

app.listen(port, () => {
    console.log(`Remotion Rendering listening on port ${port}`);
});

const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

const randomUID = (length = 8) => {
    return Array.from<string>({ length }).reduce(prev => prev + characters[Math.floor(Math.random() * characters.length)], '');
};