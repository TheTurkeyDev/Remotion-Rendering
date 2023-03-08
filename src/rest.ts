import express from 'express';
import { execSync } from 'child_process';
import fs from 'fs';
import { render } from './render';
import cors from 'cors';
import Database from 'better-sqlite3';
import { RenderStatus } from './render-status';

const db = new Database('./data/videos.db');
db.pragma('journal_mode = WAL');
db.prepare('CREATE TABLE IF NOT EXISTS videos (id TEXT PRIMARY KEY, status INTEGER, progress INTEGER, error TEXT);').run();

export const getDB = () => db;

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
    db.prepare('INSERT INTO videos (id, status, progress, error) VALUES (?, ?, ?, ?);').run(id, RenderStatus.NOT_STARTED, 0, '');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send({ id, format: 'mp4' });
    await deleteTemp();
    try {
        console.log(execSync('whoami', { encoding: 'utf-8' }));
        execSync(`git clone ${body.git} temp`, { encoding: 'utf-8' });
        console.log('npm install...');
        execSync('npm i', { cwd: './temp', encoding: 'utf-8' });
        await render(id, body.compositionId, body.entry, { directives: body.directives });
    } catch (e) {
        db.prepare('UPDATE videos SET status=?, error=? WHERE id=?;').run(RenderStatus.ERRORED, JSON.stringify(e), id);
    }
    await deleteTemp();
});


async function deleteTemp() {
    const dir = './temp';
    console.log('Deleting temp directory...');
    if (fs.existsSync(dir))
        fs.rmSync(dir, { recursive: true });
    console.log(`${dir} is deleted!`);
}

app.get('/status/:id', async (req, res) => {
    const id = req.params.id;
    const vid = db.prepare('SELECT * FROM videos WHERE id=?;').get(id);
    if (!vid) {
        res.status(404).send();
        return;
    }
    res.status(200).json(vid);
});

app.get('/output/:id', async (req, res) => {
    res.download(`${process.env.OUTPUT_FOLDER}/${req.params.id}`, err => { if (!!err) res.sendStatus(404); });
});

app.listen(port, () => {
    console.log(`Remotion Rendering listening on port ${port}`);
});

const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

const randomUID = (length = 8) => {
    return Array.from<string>({ length }).reduce(prev => prev + characters[Math.floor(Math.random() * characters.length)], '');
};