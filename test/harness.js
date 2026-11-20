/*
 * Lifts named functions out of the game's parts and runs them in a bare
 * context, so the driving model and the garage maths can be tested without a
 * browser, a canvas or a GPU.
 *
 * There is no framework here on purpose: the game ships as one HTML file with
 * no build step beyond concatenation, and a test runner would be the only
 * dependency in the project.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PARTS = path.join(__dirname, '..', 'parts');

function read(part){ return fs.readFileSync(path.join(PARTS, part), 'utf8'); }

/* Pull `function name(...){...}` out of a source file by matching braces.
   Crude, but the alternative is a parser, and the parts are plain ES5. */
function grab(src, names){
  const out = [];
  for(const name of names){
    const start = src.indexOf('function ' + name + '(');
    if(start === -1) throw new Error('no function called ' + name);
    let depth = 0, i = src.indexOf('{', start), end = -1;
    let inStr = null, inLine = false, inBlock = false;
    for(; i < src.length; i++){
      const c = src[i], prev = src[i - 1];
      if(inLine){ if(c === '\n') inLine = false; continue; }
      if(inBlock){ if(c === '/' && prev === '*') inBlock = false; continue; }
      if(inStr){ if(c === inStr && prev !== '\\') inStr = null; continue; }
      if(c === '/' && src[i + 1] === '/'){ inLine = true; continue; }
      if(c === '/' && src[i + 1] === '*'){ inBlock = true; continue; }
      if(c === '"' || c === "'"){ inStr = c; continue; }
      if(c === '{') depth++;
      else if(c === '}'){ depth--; if(depth === 0){ end = i + 1; break; } }
    }
    if(end === -1) throw new Error('unbalanced braces in ' + name);
    out.push(src.slice(start, end));
  }
  return out.join('\n\n');
}

/* Pull `var NAME = ...;` up to the matching close, for the data tables. */
function grabVar(src, names){
  const out = [];
  for(const name of names){
    const start = src.indexOf('var ' + name + ' =');
    if(start === -1) throw new Error('no var called ' + name);
    const open = src.indexOf(src[src.indexOf('=', start) + 2] === '[' ? '[' : '{', start);
    const openCh = src[open], closeCh = openCh === '[' ? ']' : '}';
    let depth = 0, end = -1, inStr = null;
    for(let i = open; i < src.length; i++){
      const c = src[i], prev = src[i - 1];
      if(inStr){ if(c === inStr && prev !== '\\') inStr = null; continue; }
      if(c === '"' || c === "'"){ inStr = c; continue; }
      if(c === openCh) depth++;
      else if(c === closeCh){ depth--; if(depth === 0){ end = i + 1; break; } }
    }
    if(end === -1) throw new Error('unbalanced brackets in ' + name);
    out.push('var ' + name + ' = ' + src.slice(open, end) + ';');
  }
  return out.join('\n\n');
}

function makeContext(extra){
  const ctx = Object.assign({
    Math: Math, JSON: JSON, console: console, isFinite: isFinite,
    Number: Number, String: String, Array: Array, Object: Object,
    parseInt: parseInt, parseFloat: parseFloat, Infinity: Infinity
  }, extra || {});
  vm.createContext(ctx);
  return ctx;
}

function run(ctx, code){ vm.runInContext(code, ctx); return ctx; }

/* --------------------------------------------------------------- asserts -- */

let passed = 0, failed = 0;

function ok(cond, label, detail){
  if(cond){ passed++; console.log('  PASS  ' + label + (detail ? '   ' + detail : '')); }
  else { failed++; console.log('  FAIL  ' + label + (detail ? '   ' + detail : '')); }
}
function near(a, b, tol, label){
  const d = Math.abs(a - b);
  ok(d <= tol, label, 'got ' + (Math.round(a * 1000) / 1000) + ', wanted ~' + b);
}
function done(){
  console.log('');
  if(failed){ console.log(failed + ' failed, ' + passed + ' passed'); process.exit(1); }
  console.log('all good');
}

module.exports = { read, grab, grabVar, makeContext, run, ok, near, done };
