"""Drive the real Meeting UI against the two user-provided YouTube references."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]


def browser(code):
    script = ROOT / '.playwright-cli' / 'meeting-automation-step.js'
    script.write_text(code, encoding='utf-8')
    result = subprocess.run(['cmd', '/c', 'playwright-cli', '-s=meetingqa', 'run-code', '--filename=' + str(script)], cwd=ROOT,
                            capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=90)
    output = result.stdout
    if result.returncode or '### Error' in output:
        raise RuntimeError(output + result.stderr)
    match = re.search(r'### Result\s*\n(.*?)\n### ', output, re.S)
    if not match:
        raise RuntimeError('Missing browser result: ' + output)
    return json.loads(match.group(1))


def reference(path, start, end):
    lines = path.read_text(encoding='utf-8-sig').splitlines()
    stamp, texts = None, []
    for line in lines:
        match = re.fullmatch(r'(\d+):(\d{2})(?::(\d{2}))?', line.strip())
        if match:
            parts = [int(x) for x in match.groups() if x is not None]
            stamp = parts[0] * 60 + parts[1] if len(parts) == 2 else parts[0] * 3600 + parts[1] * 60 + parts[2]
        elif stamp is not None and start <= stamp < end and line.strip() and not line.startswith('Phân cảnh'):
            texts.append(line.strip())
    return ' '.join(texts)


def words(text):
    return re.findall(r'[^\W_]+', re.sub(r'\[[^]]*\]', '', text).casefold(), re.UNICODE)


def disagreement(ref, hypothesis):
    a, b = words(ref), words(hypothesis)
    row = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        new = [i]
        for j, y in enumerate(b, 1):
            new.append(min(new[-1] + 1, row[j] + 1, row[j - 1] + (x != y)))
        row = new
    return {'reference_tokens': len(a), 'hypothesis_tokens': len(b), 'edit_distance': row[-1],
            'reference_disagreement': row[-1] / len(a) if a else None}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('--seconds', type=int, default=120)
    parser.add_argument('--case', choices=['english-whisper', 'english-sherpa', 'vi-en-whisper', 'vi-en-sherpa'])
    args = parser.parse_args()
    if not 30 <= args.seconds <= 180:
        parser.error('seconds must be 30..180')
    args.output.mkdir(parents=True, exist_ok=False)
    cases = [('english', 'eG5RpppF-Xo', 'test-2-english-audio-youtube.txt', 63),
             ('vi-en', 'Kml4bT44fS4', 'test-3-vietnammes-english.txt', 0)]
    results = []
    for label, video, fixture, offset in cases:
        for engine in ['whisper', 'sherpa']:
            name = label + '-' + engine
            if args.case and args.case != name:
                continue
            print('START', name, flush=True)
            result = {'case': name, 'video': video, 'engine': engine, 'offset': offset, 'requested_seconds': args.seconds}
            session_id = None
            try:
                ready = browser("""async page => {
 const app=page.context().pages().find(p=>p.url().startsWith('http://localhost:3000'));
 const yt=page.context().pages().find(p=>p.url().includes('youtube.com'));
 await yt.goto('https://www.youtube.com/watch?v=""" + video + """');
 await yt.bringToFront();
 await yt.waitForFunction(()=>Number.isFinite(document.querySelector('video')?.duration)&&document.querySelector('video').duration>180);
 return await yt.evaluate(async () => {
   const v = document.querySelector('video');
   const p = document.getElementById('movie_player');
   const ts = p?.getAvailableAudioTracks?.() || [];
   const original = ts.find(t => (t.Ob || t.Mb)?.isAutoDubbed === false);
   if (original && p.getAudioTrack?.()?.id !== original.id) p.setAudioTrack(original);
   v.muted = true;
   await v.play();
   v.muted = false;
   v.volume = 0.6;
   v.pause();
   return { duration: v.duration, track: p?.getAudioTrack?.()?.id };
 });
} """)
                result['playback'] = ready
                # Wait for automatic after-stop note from the preceding test without cancelling it.
                if results and results[-1].get('session_id'):
                    previous = results[-1]['session_id']
                    for _ in range(60):
                        state = browser(api_code(previous, 'note'))
                        if state.get('status') not in ['pending', 'running']:
                            results[-1]['note'] = state
                            break
                        time.sleep(3)
                start = browser("""async page => {
 const app=page.context().pages().find(p=>p.url().startsWith('http://localhost:3000'));
 await app.bringToFront();
 if (!(await app.getByRole('heading',{name:'Local meeting transcription'}).count())) {
   await app.getByRole('button',{name:'Meeting',exact:true}).click();
   await app.getByRole('heading',{name:'Local meeting transcription'}).waitFor({timeout:10000});
 }
 await app.getByRole('combobox',{name:'Audio source',exact:true}).selectOption('system');
 await app.getByRole('combobox',{name:'Nhận dạng bản chốt',exact:true}).selectOption('""" + engine + """');
 await app.getByRole('checkbox',{name:'I have consent to record all participants.'}).check();
 const response=app.waitForResponse(r=>r.url().endsWith('/api/meeting/sessions')&&r.request().method()==='POST');
 await app.getByRole('button',{name:'Start transcription',exact:true}).click();
 const r=await response;return {http:r.status(),body:await r.json()};
}""")
                result['start'] = start
                session_id = start.get('body', {}).get('session', {}).get('id')
                if not session_id:
                    raise RuntimeError('Capture not accepted: ' + json.dumps(start))
                result['session_id'] = session_id
                for _ in range(30):
                    state = browser(api_code(session_id, ''))
                    if state['session']['status'] == 'recording':
                        break
                    if state['session']['status'] in ['error', 'stopped']:
                        raise RuntimeError('Worker stopped during startup: ' + json.dumps(state))
                    time.sleep(1)
                else:
                    raise RuntimeError('Worker never reached recording')
                result['play_start'] = browser("""async page => {
 const yt=page.context().pages().find(p=>p.url().includes('youtube.com'));
 await yt.bringToFront();
 return await yt.evaluate(async () => {
   const v = document.querySelector('video');
   v.playbackRate = 1;
   v.currentTime = """ + str(offset) + """;
   v.muted = true;
   await v.play();
   v.muted = false;
   v.volume = 0.6;
   return { time: v.currentTime, paused: v.paused, muted: v.muted };
 });
}""")
                time.sleep(args.seconds)
                result['play_end'] = browser("""async page => {const yt=page.context().pages().find(p=>p.url().includes('youtube.com'));return await yt.evaluate(()=>{const v=document.querySelector('video');v.pause();return {time:v.currentTime,paused:v.paused};});}""")
                result['stop'] = browser("""async page => {const app=page.context().pages().find(p=>p.url().startsWith('http://localhost:3000'));await app.getByRole('button',{name:'Stop',exact:true}).click();await app.getByRole('button',{name:'Start transcription',exact:true}).waitFor({timeout:60000});return {alerts:await app.getByRole('alert').allTextContents(),text:await app.getByRole('region',{name:'Transcript hoàn thiện',exact:true}).innerText()};}""")
                events = browser(api_code(session_id, 'events?after=0'))
                result['events'] = events['events']
                finals = [e['segment'] for e in events['events'] if e['type'] == 'transcript.final']
                result['final_count'] = len(finals)
                result['unique_final_ids'] = len({s['id'] for s in finals})
                result['transcript'] = ' '.join(s['text_raw'] for s in finals)
                result['reference'] = reference(ROOT / 'artifacts/meeting-m2' / fixture, offset, offset + args.seconds)
                progress = result['play_end']['time'] - result['play_start']['time']
                if progress < args.seconds * 0.9 or not finals:
                    result['error'] = f'Invalid audio sample: video advanced {progress:.1f}s; finals={len(finals)}'
                else:
                    result['comparison'] = disagreement(result['reference'], result['transcript'])
                result['note'] = browser(api_code(session_id, 'note'))
                result['reload'] = browser("""async page => {const app=page.context().pages().find(p=>p.url().startsWith('http://localhost:3000'));await app.reload();await app.getByRole('button',{name:'Meeting',exact:true}).click();return {heading:await app.getByRole('heading',{name:'Local meeting transcription',exact:true}).count()};}""")
                after = browser(api_code(session_id, 'events?after=0'))
                result['reload_events_unchanged'] = after['events'] == events['events']
                result['screenshot'] = name + '.png'
                browser("""async page => {const app=page.context().pages().find(p=>p.url().startsWith('http://localhost:3000'));const buttons=app.getByRole('region',{name:'Danh sách sessions',exact:true}).getByRole('button');await buttons.first().click();await app.screenshot({path:""" + json.dumps(str((args.output / (name + '.png')).resolve())) + """,fullPage:true});return {saved:true};}""")
            except Exception as exc:
                result['error'] = str(exc)
            finally:
                # Only stop the session created by this case; never touch a pre-existing recording.
                if session_id:
                    try:
                        result['cleanup'] = browser(api_code(session_id, 'stop', 'POST'))
                    except Exception as exc:
                        result['cleanup_error'] = str(exc)
                try:
                    browser("""async page=>{const yt=page.context().pages().find(p=>p.url().includes('youtube.com'));await yt?.evaluate(()=>document.querySelector('video')?.pause());return {paused:true};}""")
                except Exception:
                    pass
                results.append(result)
                (args.output / (name + '.json')).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
                (args.output / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
                print('END', name, 'finals', result.get('final_count'), 'error', result.get('error'), flush=True)
    if results[-1].get('session_id'):
        for _ in range(60):
            state = browser(api_code(results[-1]['session_id'], 'note'))
            results[-1]['note'] = state
            if state.get('status') not in ['pending', 'running']:
                break
            time.sleep(3)
    (args.output / 'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    if any(r.get('error') for r in results):
        raise SystemExit(1)


def api_code(session_id, suffix, method='GET'):
    path = '/api/meeting/sessions/' + session_id + ('/' + suffix if suffix else '')
    return """async page=>{const app=page.context().pages().find(p=>p.url().startsWith('http://localhost:3000'));return await app.evaluate(async({path,method})=>{const {token}=await(await fetch('/api/meeting/token')).json();const r=await fetch(path,{method,headers:{'X-Meeting-Token':token}});if(!r.ok)throw Error('HTTP '+r.status+' '+await r.text());return r.json();},""" + json.dumps({'path': path, 'method': method}) + ');}'


if __name__ == '__main__':
    assert words('Xin CHÀO [âm nhạc]') == ['xin', 'chào']
    assert disagreement('a b', 'a c')['edit_distance'] == 1
    main()
