/*
 * Injected into the article WebView by "Copy as Markdown".
 * Converts the rendered article DOM to markdown and returns it as a string,
 * or null when no article content can be found. Works on every mirror
 * (freedium and archive.is) since it reads the rendered page, not site internals.
 */
(function(){
var TITLE='';
function norm(s){return (s||'').replace(/\s+/g,' ').trim();}
function push(out,s){if(!s||!s.trim())return;if(out.length&&out[out.length-1]===s)return;out[out.length]=s;}
function abs(u){try{return new URL(u,document.baseURI).href;}catch(e){return u;}}
function tag(n){return String(n.tagName||'').toUpperCase();}
function skip(n){
var t=tag(n);
if(t==='SCRIPT'||t==='STYLE'||t==='NOSCRIPT'||t==='NAV'||t==='BUTTON'||t==='FORM'||t==='SVG'||t==='IFRAME'||t==='HEADER'||t==='FOOTER')return true;
if(n.getAttribute&&(n.getAttribute('data-nosnippet')!==null||n.getAttribute('aria-hidden')==='true'))return true;
return false;
}
function img(n){
var src=n.getAttribute('src')||n.getAttribute('data-src')||'';
if(!src)return '';
return '!['+(n.getAttribute('alt')||'').replace(/[\[\]]/g,'')+']('+abs(src)+')';
}
function inlineNode(n){
if(n.nodeType===3)return n.nodeValue.replace(/\s+/g,' ');
if(n.nodeType!==1||skip(n))return '';
var t=tag(n),inner=inline(n);
if(t==='BR')return '  \n';
if(t==='IMG')return img(n);
if(!inner.trim())return t==='CODE'?'':inner;
if(t==='CODE')return '`'+inner.replace(/`/g,'')+'`';
if(t==='STRONG'||t==='B')return '**'+inner+'**';
if(t==='EM'||t==='I')return '*'+inner+'*';
if(t==='DEL'||t==='S')return '~~'+inner+'~~';
if(t==='A'){var h=n.getAttribute('href')||'';return h?('['+inner.trim()+']('+abs(h)+')'):inner;}
return inner;
}
function inline(n){
var out='';
for(var c=n.firstChild;c;c=c.nextSibling)out+=inlineNode(c);
return out;
}
function list(n,ordered,indent){
var lines=[],i=1;
for(var li=n.firstChild;li;li=li.nextSibling){
if(li.nodeType!==1||skip(li)||tag(li)!=='LI')continue;
var text='',nested=[];
for(var c=li.firstChild;c;c=c.nextSibling){
if(c.nodeType===1&&(tag(c)==='UL'||tag(c)==='OL')){nested.push(list(c,tag(c)==='OL',indent+'  '));continue;}
text+=inlineNode(c);
}
text=text.replace(/\s+/g,' ').trim();
if(!text&&!nested.length)continue;
lines.push(indent+(ordered?(i+'. '):'- ')+text);
for(var k=0;k<nested.length;k++)if(nested[k])lines.push(nested[k]);
i++;
}
return lines.join('\n');
}
function codeBlock(n){
var lang='',code=n.querySelector?n.querySelector('code'):null;
if(code){var m=(code.getAttribute('class')||'').match(/language-([A-Za-z0-9+#-]+)/);if(m)lang=m[1];}
var text=(n.textContent||'').replace(/\s+$/,'');
return text.trim()?('```'+lang+'\n'+text+'\n```'):'';
}
function table(n){
var rows=[],trs=n.getElementsByTagName('tr');
for(var i=0;i<trs.length;i++){
var cells=[],kids=trs[i].children;
for(var j=0;j<kids.length;j++)cells.push(inline(kids[j]).replace(/\s+/g,' ').replace(/\|/g,'\\|').trim());
if(cells.length)rows.push('| '+cells.join(' | ')+' |');
if(i===0&&cells.length)rows.push('| '+cells.map(function(){return '---';}).join(' | ')+' |');
}
return rows.join('\n');
}
function block(n,out,seenTitle){
for(var c=n.firstChild;c;c=c.nextSibling){
if(c.nodeType===3){var t=c.nodeValue.replace(/\s+/g,' ').trim();if(t)push(out,t);continue;}
if(c.nodeType!==1||skip(c))continue;
var t2=tag(c),txt;
if(t2==='H1'||t2==='H2'||t2==='H3'||t2==='H4'||t2==='H5'||t2==='H6'){
txt=inline(c).replace(/\s+/g,' ').trim();
if(!txt)continue;
if(TITLE&&norm(txt)===TITLE&&!seenTitle.hit){seenTitle.hit=true;continue;}
push(out,new Array(parseInt(t2.charAt(1),10)+1).join('#')+' '+txt);
}
else if(t2==='P'||t2==='FIGCAPTION'){
txt=inline(c).replace(/[ \t]+/g,' ').trim();
if(txt)push(out,t2==='FIGCAPTION'?('*'+txt+'*'):txt);
}
else if(t2==='PRE'){txt=codeBlock(c);if(txt)push(out,txt);}
else if(t2==='UL'||t2==='OL'){txt=list(c,t2==='OL','');if(txt)push(out,txt);}
else if(t2==='TABLE'){txt=table(c);if(txt)push(out,txt);}
else if(t2==='BLOCKQUOTE'){
var q=[];block(c,q,seenTitle);
txt=q.join('\n\n').split('\n').map(function(l){return ('> '+l).replace(/\s+$/,'');}).join('\n');
if(txt.replace(/[>\s]/g,''))push(out,txt);
}
else if(t2==='HR'){push(out,'---');}
else if(t2==='IMG'){txt=img(c);if(txt)push(out,txt);}
else block(c,out,seenTitle);
}
}
function root(){
var best=null,nodes=document.querySelectorAll('.prose');
for(var i=0;i<nodes.length;i++){
if(!best||(nodes[i].textContent||'').length>(best.textContent||'').length)best=nodes[i];
}
return best||document.querySelector('article')||document.querySelector('main')||document.body;
}
function fromDom(){
var r=root();
if(!r)return null;
var out=[];
block(r,out,{hit:false});
var md=out.join('\n\n').replace(/\n{3,}/g,'\n\n').trim();
return md||null;
}
var h=document.querySelector('article h1')||document.querySelector('main h1')||document.querySelector('h1');
TITLE=h?norm(h.textContent):'';
var body=fromDom();
if(!body)return null;
return (TITLE?('# '+TITLE+'\n\n'):'')+body.trim();
})()
