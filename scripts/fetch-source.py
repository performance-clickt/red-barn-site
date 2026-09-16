from urllib.request import urlopen,Request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import xml.etree.ElementTree as E
import json
out=Path(__file__).resolve().parents[1]/'migration'/'source'
out.mkdir(exist_ok=True)
urls=[x.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc').text for x in E.parse('/tmp/redbarn-sitemap.xml').getroot()]
urls.insert(0,'https://www.redbarninvestmentcounsel.ca/')
def fetch(url):
 slug=url.split('.ca/')[-1].strip('/') or 'index'
 try:
  response=urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=40)
  (out/(slug.replace('/','__')+'.html')).write_bytes(response.read())
  return {'url':url,'slug':slug,'status':response.status,'resolved':response.url}
 except Exception as e: return {'url':url,'slug':slug,'error':str(e)}
with ThreadPoolExecutor(max_workers=5) as pool: result=list(pool.map(fetch,urls))
(out.parent/'fetch-manifest.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
