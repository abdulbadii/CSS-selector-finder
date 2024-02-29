#!/usr/bin/env node

const {stdin, stdout, exit} = process;
let j, elems=[];
isElmBlncd = s =>{
 let i, sig = /^\s*<!DOCTYPE\s\w+>/.exec(s) ||exit(1);
 i= sig.index + sig[0].length;
 const stack=[];
 for (let elmn='', eHead, nextI; i < s.length;) {
  let c = s [i];
  if (c == '<') {
   nextI = s.indexOf( '>', ++i),
   eHead = s.substring( i, nextI++);
   if (!(/^(?:meta|link|input|img|hr|base)\b|^!--.*--$/.test(eHead))) {
    let str, tag,
    t = eHead.match(/^\/?[a-z]\w*\b/) ||exit(1);
    eHead = '<'+ eHead +'>';
    tag = t[0];
    if (tag[0] !== '/') {
     if (str = tag.match(/script|style|title|path/)) {
      i = s.indexOf('</'+str[0]+'>',nextI);
      if (i < 0) return [false, stack+','+str[0]];
      elmn = eHead + s.substring( nextI, i += 3+str[0].length)
     }
     else if (
     (str =(new RegExp('^[^<]*</' +tag+ '>')).exec( s.substring( nextI))) != null) {
      i = nextI + str[0].length;
      elmn = eHead + str[0]
     }
     else if( (str =/^[^<]+(?=<)(<\/[a-z]\w*>)?/.exec( s.substring( nextI))) != null){
      if (str[1]) {
       if (str[1] != '</'+tag+'>') return [false, stack+','+tag] }
      else stack.push( tag);
      i = nextI + str[0].length;
      elmn = eHead + str[0]
     }
     else {
      stack.push( tag);
      elmn = eHead;
      i = nextI
     }
     elems.push( elmn);
     !j && tag=='div'? j= elems.length+3: null;
    }else {
     if( !stack.length || '/'+(i=stack.pop()) !== tag) return [false, stack+','+i];
     elems.push( eHead);
     i = nextI
    }
   }
  }else {
   let txL, tx = s.substring( i, nextI=s.indexOf( '<',i));
   i = nextI;
   if( (txL=tx.length) > 999) //large text node is cut to first 330 and last 250 chars
    tx = tx.substring( 0,330)+'.........'+tx.substring( txL-250);
   elems.push( tx)
  }
 }
 return [!stack.length, 'the end; missing closing tag']
}

slctr = s =>{
 s = s.replace(/<\/\w+>$/,'');
 const stack=[], selAtt=[];
 let chiLv=0, nthCh = new Array(33).fill(0);
 for (let tx, nextI, i=0; i < s.length;) {
  c = s[i];
  if (c == '<') {
   nextI = s.indexOf( '>', ++i);
   let eHead = s.substring( i, nextI++);
   if (!(/^(?:meta|link|input|img|hr|base)\b|^!--.*--$/.test(eHead))) {
    let str,
    eHd = eHead.match(/^(\/?[a-z]\w*)(?:\s+(.+))?/),
    tag = eHd[1],
    atrbs = eHd[2];
    if (tag[0] !== '/') {
     if( (str = /script|style|title|path/.exec(tag)) != null) {
      i= s.indexOf( '</'+str[0]+'>', nextI);
      if (i>0) { i += 3+str[0].length; continue }
     }
     ++nthCh[ chiLv++];
     stack.push( tag);
     let a=b=c=d='';
     if (atrbs) {
      let att =[], atKVrx = /\b([a-z][-\w]*)=(["'])([^"']*)\2/g;
      while( (att = atKVrx.exec( atrbs)) != null) {
       att[1]=='id'? a = '#'+att[3]:
       att[1]=='class'? b = '.'+att[3].replace(/\s+/g,'.'):
        c? d += '[' +att[1]+ (att[3]? '='+att[3]+']': ']'):
        c = '[' +att[1]+ (att[3]? '='+att[3]+']': ']')
      }
     }
     selAtt.push( a+b+c);
    } else {
     stack.pop();
     selAtt.pop();
     --chiLv;
     nthCh = nthCh.map((_, i)=> i > chiLv? 0: _)
    }
   }
  }
  else tx = s.substring( i, nextI = s.indexOf( '<', i));
  i = nextI;
  if (i<0) break
 }
 let p='', i=0;
 for (;i < stack.length; i++)
  p += stack[i] + selAtt[i] + (nthCh[i] >1 ? ':nth-child('+nthCh[i]+')' :'') + ' > ';
 return p.slice( 0,-3)
}

(async ()=>{
 const
 cli = process.argv.slice(2).join(' '),
 uri = cli? cli:
 'https://translate.google.com/?sl=auto&tl=en&&op=translate',
 {Select} = require('enquirer'),
 {chromium} = await require('playwright'),
 chrom = await chromium.launch(),
 page = await chrom.newPage();
 stdout.write('Be patient.. Getting "'+uri+'"');
 //let rsp = await page.goto(uri, {waitUntil:'domcontentloaded'});
 if (rsp.status() < 200 || rsp.status() > 206) process.exit();
 const html = await page.content();
 stdout.cursorTo(0);stdout.clearLine();

 let [ok,e] = await isElmBlncd( html);
 if (!ok) {
  console.log('HTML document has inbalanced element at',e.replace(/,/g,' > ')); exit(1)}
 let elmns = [...elems];

 while(true) {
  const select = new Select({
   name: 'element',
   message: 'Use UP/DOWN keys to select an option',
   choices: elems,
   initial: j
  });

  stdin.on('keypress', (_,k) =>{
   if (k.name == 'up') --j < 0 ? j += elems.length : null;
   else if (k.name == 'down')
    ++j >= elems.length ? j -= elems.length : null; //select.render()
  });

  await select.run(); stdin.removeAllListeners('keypress');

  console.log('\n'+await slctr( elmns.slice( 0,j+1).join('')));

  elems = [...elmns];
  stdout.write('\nDo on this again? (Y/n) ');
  let no = await new Promise( r=>{
   stdin.setRawMode(true);
   stdin.resume();
   stdin.once('data', d =>{ if (d[0] == 13 || String(d) == 'y') r(false); else r(true)})
  });
  stdout.cursorTo(0);stdout.clearLine();
  stdin.removeAllListeners('data');
  if (no) break
 }

 exit()  
})()
