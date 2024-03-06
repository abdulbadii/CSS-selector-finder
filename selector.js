#!/usr/bin/env node
const {stdin, stdout, exit} = process;
let j, elems=[];

isHTMvalid = s =>{
 let i, sig = s.match(/^\s*<!DOCTYPE\s\w+>[^<>]*/) ||exit(1);
 i= sig[0].length;
 let stack=[], ind='';
 for (;i < s.length;) {
  const stRE = s.slice(i),
  h = stRE.match(/^<\/?([a-z][-\w]*)[^<>]*>/);
  if( h) {
   const
   head = h[0],
   tag  = h[1];
   /*Large atrribute is put as the first/last a number of char, so is such large*/
   eHead =
   head.length <410? head: head.slice(0,170)+'.....'+head.slice(-133);
   if (head[1] != '/') {
    let
    indtE = ind + eHead,
    cRE; 
    if( !tag.search(/^(meta|link|input|img|hr|base)\b/)) {
     elems.push( indtE);
     i += head.length
    } else if( cRE=/^<(script|style|title|path)\b[^<>]*>(.*?)(<\/\1>|$)/s.exec(stRE) ) {
     if (cRE[3]) {
      let l;
      elems.push( indtE
      + ( (l=cRE[2].length) <730? cRE[2]: cRE[2].slice(0,210) +'.....'+ cRE[2].slice(-170))
      + cRE[3] );
      i += head.length + l + cRE[3].length
     }
     else return [false, stack+','+tag]
    } else if( cRE = stRE.slice( head.length).match(
      /^(<!--.*?-->|[^<>]*)+(<[a-z][-\w]*[^<>]*>|<\/([a-z][-\w]*)>)/)) {
      if (cRE[3]) {
       if (tag != cRE[3]) return [false, stack+','+tag];
       elems.push( indtE + (cRE[1]? '\n  '+ind+cRE[1] :'') +'\n  '+ind+'</'+cRE[3]+'>');
       i += head.length + cRE[0].length
      } else {
       stack.push( tag);
       elems.push( indtE + (cRE[1]? '\n  '+ind+cRE[1] :''));
       i += head.length + cRE[1].length;
       ind += ' '
      }
      !j && tag=='div'? j=elems.length: null
     }
    else return [false, stack+','+tag]
   } else {
    if( !stack.length || stack.pop() != tag) return [false, stack];
    i += head.length;
    elems.push( (ind= ind.slice(1)) + eHead);
   }
  } else if( cRE = stRE.match(/^(?:[^<>]+|<!--[^<>]*-->)+/s)) {
   let l;
   elems.push( ind +( (l=cRE[0].length) <730? cRE[0]: cRE[0].slice(0,190)+'.....'+cRE[0].slice(-170)))
   i += l
  }
  else return [false, 'inner '+stack];
 }
 return [!stack.length, 'the end; missing closing tag']
}

slctr = s =>{
 s = s.replace(/<\/\w+>$/,'');
 const stack=[], selAtt=[];
 let chiLv=0, nthCh = new Array(33).fill(0),
 tx, nexti, i=0;
 for (;i < s.length;) {
  c = s[i];
  if (c == '<') {
   nexti = s.indexOf( '>', ++i);
   let eHead = s.substring( i, nexti++);
   if (!(/^(?:meta|link|input|img|hr|base)\b|^!--.*--$/.test(eHead))) {
    let str,
    t = eHead.match(/^(\/?[a-z][-\w]*)(?:\s+(.+))?/),
    tag = t[1],
    atrbs = t[2];
    if (tag[0] != '/') {
     if( /script|style|title|path/.test(tag) ) {
      i = s.indexOf( '</'+tag+'>', nexti);
      if (i>=0) { i += 3+tag.length; continue }
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
  else tx = s.slice( i, nexti = s.indexOf( '<', i));
  i = nexti;
  if (i<0) break
 }
 let p='';
 for (i=0; i < stack.length; i++)
  p += stack[i] + selAtt[i] + (nthCh[i] >1 ? ':nth-child('+nthCh[i]+')' :'') + ' > ';
 return p.slice( 0,-3)
}

let cli = process.argv.slice(2).join(' ');
if (!cli) {
 cli = ''; // URL default here
}
fs = require('fs');

(async ()=>{
 const
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
   try {
    d = fs.readFileSync( cli, 'utf8');
    console.log("Found file '"+cli+"'")
    return d
   } catch (e){
    console.error('Error: '+cli+': ' +
     (e.code =='ENOENT'? 'File not found': 'Error reading it'))
   }
  }})();

 stdout.cursorTo(0);stdout.clearLine();console.log('Validating its content as HTML...')

 let [ok,e] = await isHTMvalid( html);
 if (!ok) {
  console.log('Broken HTML document, suspected at',e.replace(/,/g,' > ')); exit(1)}

 let {Select} = await require('enquirer'), elmns = [...elems];
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
  stdout.write('\nDo on this again or quit with save? (Y/n/s) ');
  switch (
   await new Promise( r=>{
   stdin.setRawMode(true);
   stdin.resume();
   stdin.once('data', d =>{ r(d[0]) })
  })) {
   case 115: fs.writeFileSync('a.html', html); break; // s hit //todo
   case 13:
   case 121: break; // Enter or y hit
   default: break lo;
  }
  elems = [...elmns];
  stdin.removeAllListeners('data')
 }

 exit()  
})()
