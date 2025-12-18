// brain/brain.js
// Requires: npm install natural
const natural = require('natural');
const TfIdf = natural.TfIdf;

let TEMPLATES = {};

function seedTemplates() {
  TEMPLATES['javascript'] = {
    example: '```javascript\\nconsole.log(\"Hello from JavaScript\");\\n```',
    explain: 'JavaScript — dynamic language for web.'
  };
  TEMPLATES['python'] = {
    example: '```python\\nprint(\"Hello, Python\")\\n```',
    explain: 'Python — versatile, great for scripting & ML.'
  };
  TEMPLATES['cpp'] = {
    example: '```cpp\\n#include <iostream>\\nint main(){ std::cout<<\"Hello C++\\\\n\"; return 0; }\\n```',
    explain: 'C++ — compiled, high-performance.'
  };
  const more = ['java','c#','go','rust','php','ruby','kotlin','swift','html','css','typescript','bash','sql'];
  more.forEach(l => {
    if(!TEMPLATES[l]) TEMPLATES[l] = { example: `// example placeholder for ${l}`, explain: `${l} quick info` };
  });
}

function buildDocs(history) {
  return history.map(h => (h.text||'').toString());
}

function getTopRelevant(history, query, topN=4) {
  const docs = buildDocs(history);
  const tfidf = new TfIdf();
  docs.forEach(d=>tfidf.addDocument(d));
  const scores = [];
  tfidf.tfidfs(query, (i, measure) => { scores.push({ i, score: measure, raw: history[i] }); });
  scores.sort((a,b)=>b.score-a.score);
  return scores.slice(0,topN).map(s=>s.raw).filter(Boolean);
}

function detectLanguage(message) {
  const m = message.match(/in\\s+([A-Za-z#+0-9_-]+)/i);
  if (m) return m[1].toLowerCase();
  const langs = Object.keys(TEMPLATES);
  for (const l of langs) if (new RegExp('\\\\b'+l+'\\\\b','i').test(message)) return l;
  return null;
}

function classifyIntent(message) {
  const t = message.toLowerCase();
  if (/^run:\\s*/i.test(message)) return 'run';
  if (/(debug|error|exception|stack trace|crash)/i.test(t)) return 'debug';
  if (/(example|contoh|implement)/i.test(t)) return 'example';
  if (/(explain|apa itu|penjelasan)/i.test(t)) return 'explain';
  if (/(optimi|optimize|perf)/i.test(t)) return 'optimize';
  return 'general';
}

function generateFromTemplates(intent, lang, query, relevant) {
  if (intent === 'run') {
    const code = query.replace(/^run:\\s*/i,'');
    if (/<\\/?html|<script|<style/i.test(code)) return '```html\\n'+code+'\\n```';
    return '```html\\n<!doctype html>\\n<html><body>\\n'+code+'\\n</body></html>\\n```';
  }
  if (intent === 'debug') {
    let out = 'Debug analysis (relevant context):\\n\\n';
    relevant.forEach((r,i)=> out += `${i+1}) [${new Date(r.ts).toLocaleString()}] ${r.role}: ${r.text}\\n`);
    out += '\\nKirim stack trace / error message untuk analisis lebih detail.';
    return out;
  }
  if (intent === 'example' || intent === 'explain' || intent === 'general') {
    if (lang && TEMPLATES[lang]) {
      return `Contoh (${lang}):\\n` + (TEMPLATES[lang].example||'') + '\\n\\n' + (TEMPLATES[lang].explain||'');
    }
    let out = 'Contoh singkat beberapa bahasa:\\n';
    ['javascript','python','cpp','java','go'].forEach(l => { if (TEMPLATES[l]) out += `\\n--- ${l} ---\\n` + TEMPLATES[l].example + '\\n'; });
    out += '\\nSebutkan bahasa dengan \"in <language>\" untuk lebih spesifik.';
    return out;
  }
  return 'Gunakan kata kunci: run:, debug, example, explain, optimize.';
}

async function processMessage(history, sessionId, message) {
  const intent = classifyIntent(message);
  const lang = detectLanguage(message);
  const relevant = getTopRelevant(history, message, 4);
  const aiText = generateFromTemplates(intent, lang, message.replace(/^run:\\s*/i,''), relevant);
  const userMsg = { role:'user', text: message, ts: Date.now(), sessionId };
  const aiMsg = { role:'ai', text: aiText, ts: Date.now(), sessionId };
  return { userMsg, aiMsg };
}

module.exports = { processMessage, seedTemplates };
     
