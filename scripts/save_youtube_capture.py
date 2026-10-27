"""Save already-completed browser capture through CLI output, without a network upload."""
import base64
import json
from pathlib import Path
import subprocess
import sys

path = Path(sys.argv[1])
if path.exists():
    raise ValueError('Output exists')
code = "async page => await page.evaluate(async()=>{const b=new Blob(window.testChunks,{type:'audio/webm'});return await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split(',')[1]);f.readAsDataURL(b);});})"
result = subprocess.run(['cmd', '/c', 'playwright-cli', '--raw', 'run-code', code], capture_output=True, text=True, timeout=30)
if result.returncode:
    raise RuntimeError(result.stderr + result.stdout[:200])
text = result.stdout.strip()
if text.startswith('"'):
    text = json.loads(text)
else:
    text = json.loads(text.split('### Result\n', 1)[1].split('\n###', 1)[0].strip())
data = base64.b64decode(text, validate=True)
with path.open('xb') as output:
    output.write(data)
print('Saved', len(data), 'bytes')
