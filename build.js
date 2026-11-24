/*
 * Assembles index.html from parts/ with the 3D engine and both fonts inlined,
 * so the finished page has no external references and runs with no internet.
 *
 *   node build.js            rebuild index.html from parts/ + vendor/
 *
 * Same shape as Top Shelf's build, deliberately - one file, nothing fetched,
 * works off a memory stick or a Pi with the network unplugged.
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const PARTS = [
  '00-head.html',
  '05-padnav.js',
  '06-arcade-save.js',
  '10-core.js',
  '20-track.js',
  '30-cars.js',
  '40-drive.js',
  '45-garage.js',
  '46-garage-ui.js',
  '50-loop.js',
  '55-pad-menus.js'
];
const THREE_FILE = path.join(DIR, 'vendor', 'three.r128.min.js');
const FONT_INLINE = path.join(DIR, 'vendor', 'fonts-inline.css');

const LINK_BLOCK =
`<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;600;800&display=swap" rel="stylesheet">`;
const SCRIPT_TAG = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>';

function assemble(){
  const three = fs.readFileSync(THREE_FILE, 'utf8');
  const fonts = fs.readFileSync(FONT_INLINE, 'utf8');
  if(three.indexOf('</script') !== -1) throw new Error('engine source contains a closing script tag');

  let head = fs.readFileSync(path.join(DIR, 'parts', PARTS[0]), 'utf8');
  if(head.indexOf(LINK_BLOCK) === -1) throw new Error('font link block not found in head');
  head = head.replace(LINK_BLOCK, '<style>\n' + fonts + '\n</style>');
  if(head.indexOf(SCRIPT_TAG) === -1) throw new Error('engine script tag not found in head');
  head = head.replace(SCRIPT_TAG,
    '<script>\n/* three.js r128 - MIT - https://threejs.org */\n' + three + '\n</script>');

  const body = PARTS.slice(1).map(function(p){
    const file = path.join(DIR, 'parts', p);
    if(!fs.existsSync(file)) throw new Error('missing part: ' + p);
    return fs.readFileSync(file, 'utf8');
  }).join('');

  /* Parse the assembled script before writing it. The tests lift individual
     functions out of the parts, so a syntax error in a file they never pull
     from - the garage UI, say - sails past every one of them and shows up
     only as a blank page in a browser. One stray apostrophe did exactly
     that, so the build now refuses to write a file it cannot parse. */
  try {
    new (require('vm').Script)(body);
  } catch(e){
    console.error('SYNTAX ERROR in the assembled script, nothing written:');
    console.error('  ' + e.message);
    process.exit(1);
  }

  const html = head + body + '</script>\n</body>\n</html>\n';
  fs.writeFileSync(path.join(DIR, 'index.html'), html);

  const left = html.match(/(https?:)?\/\/(fonts\.|cdnjs|unpkg|cdn\.|www\.g)[^"')\s]*/g);
  console.log('wrote index.html  ' + Math.round(html.length / 1024) + ' KB');
  console.log('external references remaining: ' + (left ? left.join(', ') : 'none'));
}

assemble();
