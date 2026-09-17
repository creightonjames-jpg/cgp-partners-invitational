const fs=require("fs"), zlib=require("zlib");
const buf=fs.readFileSync(process.argv[2]);

const streams=[];let idx=0;
while(true){const s=buf.indexOf("stream",idx);if(s<0)break;let st=s+6;if(buf[st]===13)st++;if(buf[st]===10)st++;
  const e=buf.indexOf("endstream",st);if(e<0)break;
  const head=buf.slice(Math.max(0,s-800),s).toString("latin1");
  const om=[...head.matchAll(/(\d+)\s+0\s+obj/g)].pop();
  try{streams.push({obj:om?+om[1]:null,dict:head.slice(head.lastIndexOf("<<")),text:zlib.inflateSync(buf.slice(st,e)).toString("latin1")});}catch{}
  idx=e+9;}

const objects={};
for(const m of buf.toString("latin1").matchAll(/(\d+)\s+0\s+obj([\s\S]*?)endobj/g)) objects[+m[1]]=m[2];
for(const s of streams){if(!/\/Type\s*\/ObjStm/.test(s.dict))continue;
  const N=+(s.dict.match(/\/N\s+(\d+)/)||[])[1], First=+(s.dict.match(/\/First\s+(\d+)/)||[])[1];
  if(!N)continue;
  const h=s.text.slice(0,First).trim().split(/\s+/).map(Number);
  for(let i=0;i<N;i++){const num=h[i*2],off=h[i*2+1];const next=(i+1<N)?First+h[(i+1)*2+1]:s.text.length;objects[num]=s.text.slice(First+off,next);}}

function parseCMap(t){const map={};
  for(const blk of t.match(/beginbfchar([\s\S]*?)endbfchar/g)||[])
    for(const m of blk.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g))
      map[parseInt(m[1],16)]=String.fromCharCode(...(m[2].match(/.{4}/g)||[m[2]]).map(x=>parseInt(x,16)));
  for(const blk of t.match(/beginbfrange([\s\S]*?)endbfrange/g)||[])
    for(const m of blk.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)){
      const lo=parseInt(m[1],16),hi=parseInt(m[2],16),d=parseInt(m[3],16);
      for(let c=lo;c<=hi&&c-lo<1024;c++)map[c]=String.fromCharCode(d+(c-lo));}
  return map;}

const cmapByObj={};
for(const s of streams) if(/beginbfchar|beginbfrange/.test(s.text)&&s.obj!=null) cmapByObj[s.obj]=parseCMap(s.text);

/* per font: its cmap and whether codes are two bytes wide */
const fontInfo={};
for(const [num,body] of Object.entries(objects)){
  if(!body||!/\/Type\s*\/Font/.test(body)) continue;
  const tu=body.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
  fontInfo[+num]={ cmap: tu?cmapByObj[+tu[1]]:null, wide: /\/Subtype\s*\/Type0/.test(body) };
}

const unesc=s=>s.replace(/\\(\d{1,3})/g,(_,o)=>String.fromCharCode(parseInt(o,8)))
                .replace(/\\n/g,"\n").replace(/\\r/g,"").replace(/\\(.)/g,"$1");

const pages=[];
for(const s of streams){
  if(!/\bTJ\b|\bTj\b/.test(s.text)) continue;
  let f=null,out="";
  const dec=str=>{
    if(!f) return str;
    let r="";
    if(f.wide){
      for(let i=0;i+1<str.length;i+=2){
        const code=(str.charCodeAt(i)<<8)|str.charCodeAt(i+1);
        const u=f.cmap?f.cmap[code]:undefined;
        r += u!==undefined ? u : (code>=32&&code<127?String.fromCharCode(code):"");
      }
    } else {
      for(const ch of str){const u=f.cmap?f.cmap[ch.charCodeAt(0)]:undefined;r+=u!==undefined?u:ch;}
    }
    return r;
  };
  const re=/\/(R?\d+)\s+[-\d.]+\s+Tf|\[((?:[^\[\]\\]|\\.)*)\]\s*TJ|\(((?:[^()\\]|\\.)*)\)\s*Tj|T\*|\bTd\b|\bTD\b/g;
  let m;
  while((m=re.exec(s.text))){
    if(m[1]!==undefined){ f=fontInfo[+m[1].replace(/^R/,"")]||null; }
    else if(m[2]!==undefined){
      let line="";const inner=/\(((?:[^()\\]|\\.)*)\)|(-?[\d.]+)/g;let k;
      while((k=inner.exec(m[2]))){
        if(k[1]!==undefined) line+=dec(unesc(k[1]));
        else if(parseFloat(k[2])<-180) line+=" ";}
      out+=line;
    } else if(m[3]!==undefined) out+=dec(unesc(m[3]));
    else out+="\n";
  }
  out=out.replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
  if(out.replace(/\s/g,"").length>20) pages.push(out);
}
pages.forEach((p,i)=>console.log(`########## BLOCK ${i+1} ##########\n${p}\n`));
