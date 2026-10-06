import json, re, requests
from bs4 import BeautifulSoup
from pathlib import Path

EDITIONS={1994:8,1995:9,1996:10,1997:11,1998:12,1999:13,2025:39}

def norm(s):
    return re.sub(r'\s+',' ',s or '').strip()

def sections(url):
    html=requests.get(url,timeout=30).text
    soup=BeautifulSoup(html,'html.parser')
    hs=[h for h in soup.find_all(['h1']) if norm(h.get_text()).lower().startswith('mejor')]
    out=[]
    for h in hs:
        cat=norm(h.get_text())
        items=[]
        cur=h.find_next()
        seen=set()
        while cur and not (cur.name=='h1' and cur is not h and norm(cur.get_text()).lower().startswith('mejor')):
            if cur.name in ('h2','h3'):
                name=norm(cur.get_text())
                if name and name not in seen:
                    seen.add(name)
                    # gather nearby text until next h1/h2/h3
                    bits=[]
                    x=cur.find_next()
                    while x and not (x.name in ('h1','h2','h3')):
                        if getattr(x,'name',None) is None:
                            t=norm(str(x))
                            if t: bits.append(t)
                        x=x.next_element
                    text=norm(' '.join(bits))
                    m=re.search(r'\bPor\s+(.+?)(?:\s{2,}|$)',text)
                    film=norm(m.group(1)) if m else name
                    items.append({'name':name,'film':film,'context':text[:300]})
            cur=cur.find_next()
        out.append({'category':cat,'items':items})
    return out

result={}
for year,ed in EDITIONS.items():
    base=f'https://www.premiosgoya.com/{ed}-edicion'
    result[str(year)]={
      'nominations':sections(base+'/nominaciones/por-categoria/'),
      'awards':sections(base+'/premios/por-categoria/')
    }
Path('tmp-goya-official.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print({y:(len(v['nominations']),len(v['awards'])) for y,v in result.items()})
