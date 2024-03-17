#!/usr/bin/env node
const {stdin, stdout, exit, argv} = process;
let j, elems=[];

isHTMvalid = s =>{
 let
 ind='', i, R =/^\s*<!DOCTYPE\s\w+>\s*/g;
 R.test(s) || exit(1);
 const stack=[], r =/<\/?([a-z][-\w]*)[^<>]*>/g;
 i = R.lastIndex;
 for (;i < s.length;) {
  r.lastIndex = i;
  const h = r.exec(s);
  if( h && i+h[0].length == r.lastIndex) { //&&... is PCRE \G anchor emulation
   const
   head = h[0],
   tag  = h[1];
   /*Large atrribute is put as the first/last a number of char, so is such large*/
   eHead =
   head.length <410? head: head.slice(0,170)+'.....'+head.slice(-133);
   if (head[1] != '/') {
    let
    indtE = ind + eHead;
    if( !tag.search(/^(meta|link|input|img|hr|base)\b/)) {
     elems.push( indtE);
     i += head.length
    } else {
     let c, r =/<(script|style|title|path)\b[^<>]*>(.*?)(<\/\1>|$)/sg;
     r.lastIndex = i;
     c=r.exec(s);
     if( c && i+c[0].length == r.lastIndex) {
      if (c[3]) {
       elems.push( indtE
       + ( c[2].length <730? c[2]: c[2].slice(0,210) +'.....'+ c[2].slice(-170))
       + c[3] );
       i= r.lastIndex
      }
      else return [false, stack+','+tag]
     } else {
      let r =/((?:[^<>]+|<!--.*?-->)*)(?:<[a-z][-\w]*[^<>]*>|<\/([a-z][-\w]*)>)/sg;
      r.lastIndex = (i += head.length);
      c=r.exec(s);
      if( c && i+c[0].length == r.lastIndex) {
       if (c[2]) {
        if (tag != c[2]) return [false, stack+','+tag];
        elems.push( indtE + (c[1]? '\n  '+ind+c[1] :'') +'\n  '+ind+'</'+c[2]+'>');
        i += c[0].length
       } else {
        stack.push( tag);
        elems.push( indtE + (c[1]? '\n  '+ind+c[1] :''));
        i += c[1].length;
        ind += ' '
       }
       !j && tag=='div'? j=elems.length: null
      }
      else return [false, stack+','+tag]
     }
    }
   } else {
    if( !stack.length || stack.pop() != tag) return [false, stack+''];
    i += head.length;
    elems.push( (ind =ind.slice(1)) + eHead);
   }
  } else {
   let r =/(?:[^<>]+|<!--[^<>]*-->)+/sg, l, c;  // text, comment
   r.lastIndex = i,
   c = r.exec(s);
   i += (l = c[0].length);
   if( c && i==r.lastIndex) {
    elems.push( ind + ( l <570 ? c[0]: c[0].slice(0,190)+'.....'+c[0].slice(-170)))
   }
   else return [false, 'inner '+stack]
  }
 }
 return [!stack.length, 'the end; missing closing tag']
}

slctr = el =>{
 if( /^<\//.test( el.slice(-1)) ) el.splice(-1);
 const
 stack=[], selAtt=[], selAt=[];
 let chiLv=0, nthC = new Array(33).fill(0), t, t12, a,b,B,c,d;
 for (e of el) {
  if( t = e.match(/^\s*<(?:(meta|link|input|img|hr|base)\b|(script|style|title|path)\b|([a-z][-\w]*))(\s+[^<>]+)?>(?:.*?(<\/))?/s)) {
   a=b=B=c=d='';
   if( t[4]) {
    let at, tm, r =/\s+(([a-z][-\w]*)(=(["'])([^"']*)\4)?)/g;
    while( at = r.exec( t[4]) ){
     at[2] == 'id'? a = '#'+at[5] :
      at[2] == 'class'?
       b = '.'+at[5].replace(/\s+/g,'.') :
        c?
         d += '['+ ( at[1].length <min.length ?( tm=min,min=at[1],tm): at[1] ) +']':
          c = min=at[1]
    }
    c = '[' +min+ ']';
    B = b.split('.',1);
   }
   if( (t12 = t[1] || t[2]) || t[5] )
     ++nthC[ chiLv];
   else {
     ++nthC[ chiLv++];
     stack.push( t[3]);
     selAtt.push( a+b+c+( d? d.split(']',1)+']':''));
     selAt.push( a+ (a? B: (b? B + B.split('.',1) + c: c)) )
   }
  } else if( /^\s*<\//.test(e)) {
    stack.pop();
    selAtt.pop();
    selAt.pop();
    --chiLv;
    nthC = nthC.map( (_, i) => i>chiLv ? 0: _)
  }
 }
 if( t = t12 || (t[5] && t[3]) ) {
  stack.push( t);
  selAtt.push( a+b+c+ ( d? d.split(']',1)+']':'') );
  selAt.push( a+ (a? B: (b? B + B.split('.',1) + c: c)) )
 }
 let n, p=s='';
 for (i=0; i < stack.length; i++) {
  p += stack[i] + selAtt[i] + (n = nthC[i] >1 ? ':nth-child('+nthC[i]+')' :'') + ' > ';
  s += stack[i] + selAt[i] + n + ' > ' }
 return [p.slice( 0,-3), s.slice( 0,-3)]
}

let cli = argv.slice(2).join(' ');
if (!cli) {
 cli = ''; // URL/file default here
}
const fs = require('fs');

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
    console.log("Found: file '"+cli+"'")
    return d
   } catch (e){
    console.error('Error:',cli+':',(e.code=='ENOENT'? 'File not found': 'Error reading it'))
    exit(1)
   }
  }})();
 stdout.cursorTo(0);stdout.clearLine(); console.log('Validating its content as HTML...')

 let [ok,e] = await isHTMvalid( html);
 if( !ok) {
  console.log('Invalid HTML document, broken at',e.replace(/,/g,' > ')); exit(1)}

 const {Select} = await require('enquirer'), elmns = [...elems];
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
    ++j >= elems.length ? j -= elems.length : null
  });

  await select.run(); stdin.removeAllListeners('keypress');

  let [p,s] = await slctr( elmns.slice( 0,j+1));
  console.log( p+'\n\nA reduced one:\n\n'+s);
  
  stdout.write('\nDo on this again or quit with save? (Y/n/s) ');
  switch (
   await new Promise( r=>{
   stdin.setRawMode(true);
   stdin.resume();
   stdin.once('data', d =>{ r(d[0]) })
  })) {
   case 115: fs.writeFileSync('a.html', html); break lo; // s hit
   case 13:
   case 121: break; // Enter or y hit
   default: break lo;
  }
  elems = [...elmns];
  stdin.removeAllListeners('data')
 }

 exit()  
})()
