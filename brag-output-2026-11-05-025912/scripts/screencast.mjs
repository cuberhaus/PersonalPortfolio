// Records a real, running demo page as a clip: repeated CDP screenshots (jpeg) with their real timestamps,
// resampled to a constant 30 fps mp4. `clip` is in viewport CSS px (keep the region on screen; beyond-viewport capture
// re-lays-out the page and swallows clicks). (Headless Chrome's Page.startScreencast only emits on damage, so it stalls
// on canvas animations; captureScreenshot does not.)
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

export async function record(page, outFile, run, { fps = 30, quality = 90, clip = null } = {}) {
  const dir = outFile.replace(/\.mp4$/, '') + '-frames';
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const client = await page.context().newCDPSession(page);
  const frames = [];
  let running = true;
  const t0 = performance.now();
  const marks = {};
  const mark = (name) => { marks[name] = +((performance.now() - t0) / 1000).toFixed(3); };
  const done = run(mark).then(() => { running = false; });
  while (running) {
    const r = await client.send('Page.captureScreenshot', { format: 'jpeg', quality, optimizeForSpeed: true, ...(clip ? { clip } : {}) });
    const file = `${dir}/f${String(frames.length).padStart(5, '0')}.jpg`;
    writeFileSync(file, Buffer.from(r.data, 'base64'));
    frames.push({ t: (performance.now() - t0) / 1000, file });
  }
  await done;
  await client.detach();
  if (frames.length < 2) throw new Error('no frames captured');
  const list = [];
  for (let i = 0; i < frames.length; i++) {
    const dur = i + 1 < frames.length ? frames[i + 1].t - frames[i].t : 1 / fps;
    list.push(`file '${frames[i].file}'`, `duration ${Math.max(dur, 0.001).toFixed(4)}`);
  }
  list.push(`file '${frames[frames.length - 1].file}'`);
  writeFileSync(`${dir}/list.txt`, list.join('\n'));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', `${dir}/list.txt`, '-vf', `fps=${fps},scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p`, '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-g', '15', '-movflags', '+faststart', '-an', outFile]);
  rmSync(dir, { recursive: true, force: true });
  return { frames: frames.length, seconds: +frames[frames.length - 1].t.toFixed(3), marks };
}
