#!/usr/bin/env node

const {stdin, stdout, exit} = process;
let j, elems=[];
isElmBlncd = s =>{
 let i, sig = s.match(/^\s*<!DOCTYPE\s\w+>/) ||exit(1);
 i= sig.index + sig[0].length;
 const stack=[];
 for (;i < s.length;) {
  let c = s [i], elmn='', eHead, nextI, t;
  if (c == '<') {
   nextI = s.indexOf( '>', i),
   eHead = s.substring( i++, ++nextI);
   t = eHead.match(/^<(?:([a-z][-\w]*)[^<>]*|(\/[a-z][-\w]*)|!--.*--)>$/) ||exit(1);
   let str, tag;
   if (/^<(?:meta|link|input|img|hr|base)\b|^<!/.test(eHead)) {
    elems.push( eHead);
    i = nextI
   } else if (tag=t[1]) {
    if (str = tag.match(/script|style|title|path/)) {
     i = s.indexOf('</'+str[0]+'>',nextI) +3 +str[0].length;
     if (i < 0) return [false, stack];
     //large text node is put as the first and last a number of char
     if (i-nextI > 799)
      elmn = eHead + s.substring( nextI, nextI +270) +'.....'+ s.substring( i-240, i);
     else
      elmn = eHead + s.substring( nextI, i);
    }
    else if (str=(new RegExp('^[^<]*</'+tag+'>')).exec( s.substring( nextI))) {
     i = nextI + str[0].length;
     elmn = eHead + str[0]
    }
    else if (str = s.substring( nextI).match(
    /^([^><]+)(<\/([a-z][-\w]*)>|<([a-z][-\w]*)(?:\s+[^>]+)?)?/)) {
     if (!str[2]) return [false, stack];
     if (str[3]) {
      if (str[3] != tag) return [false, stack];
      elmn = eHead + str[0];
      i = nextI + str[0].length
     } else {
      stack.push( tag);
      stack.push( str[4]);
      elmn = eHead + str[1];
      i = nextI + str[0].length
     }
    }
    else {
     stack.push( tag);
     elmn = eHead;
     i = nextI
    }
    elems.push( elmn);
    !j && tag=='div'? j= elems.length+3: null;
   } else {
    if( t[2] && (!stack.length || '/'+(i=stack.pop()) !== t[2]) )
      return [false, stack];
    elems.push( eHead);
    i = nextI
   }
  } else {
   nextI = s.indexOf( '<',i);
   let txL= (tx = s.substring( i,nextI)).length;
   if (!txL || tx.indexOf( '>',i) >=0) return [false, stack]; 
   i = nextI;
   elems.push( txL >999 ? tx.substring( 0,270)+'.....'+tx.substring( txL-240) :tx)
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
    eHd = eHead.match(/^(\/?[a-z][-\w]*)(?:\s+(.+))?/),
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

let cli = process.argv.slice(2).join(' ');
if (!cli) cli=
; //<= put URL default

(async ()=>{
 const
 fs = require('fs'),
 html=
 await (async ()=>{
  if (/^https?:\/\//.test(cli)) {
   let rsp,
   {chromium} = await require('playwright'),
   chrom = await chromium.launch(),
   page = await chrom.newPage();
   stdout.write('Be patient.. Getting "'+cli+'"');
   rsp = await page.goto( cli, {waitUntil:'domcontentloaded'});
   if (rsp.status() < 200 || rsp.status() > 206) exit();
   return await page.content()
  } else {
   fs.readFileSync( cli, 'utf8', (er, ctn)=>{
   if (er) {
    console.error( er.code =='ENOENT'? 'File not found': 'Error reading', er)
    } else { console.log('Retrieving file',cli); return ctn }
   })
  }})();

stdout.cursorTo(0);stdout.clearLine();

 let [ok,e] = await isElmBlncd( html);
 if (!ok) {
  console.log('HTML document has inbalanced element at',e.replace(/,/g,' > ')); exit(1)}

 let {Select} = await require('enquirer'),
 elmns = [...elems];
lo:
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
  stdout.write('\nDo on this again or quit with save? (Y/n/s) ');
  switch (
   await new Promise( r=>{
   stdin.setRawMode(true);
   stdin.resume();
   stdin.once('data', d =>{ r(d[0]) })
  })) {
   case 115, 83:
    fs.writeFileSync('a.html', html); break; // s hit //todo
   case 13:
   case 121: break; // Enter or y hit
   default: break lo;
  }
  stdin.removeAllListeners('data');
 }

 exit()  
})()
