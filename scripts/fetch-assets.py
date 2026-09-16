from pathlib import Path
from urllib.request import Request,urlopen
from concurrent.futures import ThreadPoolExecutor
import json
root=Path(__file__).resolve().parents[1]
items=json.loads((root/'migration/asset-manifest.json').read_text())
items += [dict(source='https://file.squarespace-cdn.com/content/v2/namespaces/fonts/libraries/sqsp/assets/7743a6d0-33db-4b06-9569-79937b5d907b/latin.woff2',url='/fonts/droid-sans-latin-400.woff2'),dict(source='https://file.squarespace-cdn.com/content/v2/namespaces/fonts/libraries/sqsp/assets/304d2492-7554-46c9-9f36-55bfce920495/latin.woff2',url='/fonts/droid-sans-latin-700.woff2')]
def download(a):
 dest=root/'public'/a['url'].lstrip('/')
 if dest.exists():return None
 try:
  url=a['source']+('?format=1500w' if a.get('image') else '')
  r=urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=60)
  dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(r.read())
  return None
 except Exception as e:return dict(url=a['source'],error=str(e))
with ThreadPoolExecutor(max_workers=6) as pool: errors=[x for x in pool.map(download,items) if x]
(root/'migration/asset-errors.json').write_text(json.dumps(errors,indent=2))
print('Downloaded',len(items)-len(errors),'assets. Errors:',errors)
