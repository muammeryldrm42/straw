// Runs the user strategy in an isolated Web Worker.
// The worker has no DOM/network access -> safe. Nothing is sent to the server.
"use client";
import { Candle, Signal } from "./indicators";

const WORKER_SRC = `
// --- Sandbox indicator library (accessible to the user) ---
function ema(v,p){var k=2/(p+1),o=[],pr=v[0];o.push(pr);for(var i=1;i<v.length;i++){pr=v[i]*k+pr*(1-k);o.push(pr);}return o;}
function sma(v,p){var o=[];for(var i=0;i<v.length;i++){if(i<p-1){o.push(NaN);continue;}var s=v.slice(i-p+1,i+1);o.push(s.reduce(function(a,b){return a+b;},0)/p);}return o;}
function rsi(c,p){p=p||14;var o=new Array(c.length).fill(NaN);if(c.length<=p)return o;var g=0,l=0;for(var i=1;i<=p;i++){var d=c[i]-c[i-1];if(d>0)g+=d;else l-=d;}var ag=g/p,al=l/p;o[p]=100-100/(1+ag/(al||1e-10));for(var i=p+1;i<c.length;i++){var d=c[i]-c[i-1];ag=(ag*(p-1)+(d>0?d:0))/p;al=(al*(p-1)+(d<0?-d:0))/p;o[i]=100-100/(1+ag/(al||1e-10));}return o;}
function macd(c,f,s,sp){f=f||12;s=s||26;sp=sp||9;var ef=ema(c,f),es=ema(c,s),m=ef.map(function(v,i){return v-es[i];}),sig=ema(m,sp),h=m.map(function(v,i){return v-sig[i];});return{macd:m,signal:sig,histogram:h};}
function atr(c,p){p=p||14;var t=[];for(var i=0;i<c.length;i++){if(i===0){t.push(c[i].high-c[i].low);continue;}t.push(Math.max(c[i].high-c[i].low,Math.abs(c[i].high-c[i-1].close),Math.abs(c[i].low-c[i-1].close)));}return sma(t,p);}
function bollingerBands(c,p,sd){p=p||20;sd=sd||2;var m=sma(c,p),u=[],l=[];for(var i=0;i<c.length;i++){if(i<p-1){u.push(NaN);l.push(NaN);continue;}var sl=c.slice(i-p+1,i+1),mn=m[i],vr=sl.reduce(function(a,b){return a+(b-mn)*(b-mn);},0)/p,s=Math.sqrt(vr);u.push(mn+s*sd);l.push(mn-s*sd);}return{upper:u,middle:m,lower:l};}
function makeSignal(o){o=o||{};return{signal:o.signal||"neutral",entry:o.entry||0,stop_loss:o.stop_loss||0,take_profit:o.take_profit||[],confidence:o.confidence||0,reason:o.reason||""};}

self.onmessage = function(e){
  var candles = e.data.candles;
  var code = e.data.code;
  try {
    var fn = new Function("candles","ema","sma","rsi","macd","atr","bollingerBands","makeSignal",
      code + "\\n;return (typeof strategy==='function')?strategy(candles):makeSignal({reason:'strategy() function not found'});");
    var result = fn(candles, ema, sma, rsi, macd, atr, bollingerBands, makeSignal);
    if(!result || typeof result!=="object" || !("signal" in result)){
      result = makeSignal({reason:"Invalid return - must return a Signal object"});
    }
    self.postMessage({ ok:true, signal:result });
  } catch(err){
    self.postMessage({ ok:false, error: String(err && err.message || err) });
  }
};
`;

export function runUserStrategy(code: string, candles: Candle[], timeoutMs = 3000): Promise<{ ok: boolean; signal?: Signal; error?: string }> {
  return new Promise((resolve) => {
    let worker: Worker | null = null;
    let done = false;
    const finish = (r: any) => {
      if (done) return; done = true;
      if (worker) worker.terminate();
      resolve(r);
    };
    try {
      const blob = new Blob([WORKER_SRC], { type: "application/javascript" });
      worker = new Worker(URL.createObjectURL(blob));
      const timer = setTimeout(() => finish({ ok: false, error: "Timeout (infinite loop?)" }), timeoutMs);
      worker.onmessage = (e) => { clearTimeout(timer); finish(e.data); };
      worker.onerror = (e) => { clearTimeout(timer); finish({ ok: false, error: e.message }); };
      worker.postMessage({ code, candles });
    } catch (err: any) {
      finish({ ok: false, error: String(err?.message || err) });
    }
  });
}

export const DEFAULT_USER_CODE = `// Write your own strategy! The "strategy(candles)" function must return a Signal.
// Available helper functions:
//   ema(values, period), sma(values, period), rsi(closes, period)
//   macd(closes) -> {macd, signal, histogram}
//   atr(candles, period), bollingerBands(closes, period, std)
//   makeSignal({ signal, entry, stop_loss, take_profit, confidence, reason })
//
// candles: [{ time, open, high, low, close, volume }, ...]  (newest = last element)

function strategy(candles) {
  const closes = candles.map(c => c.close);
  const fast = ema(closes, 9);
  const slow = ema(closes, 21);
  const i = candles.length - 1;
  const price = closes[i];
  const a = atr(candles, 14)[i];

  // EMA9 crossing above EMA21 = LONG
  if (fast[i] > slow[i] && fast[i-1] <= slow[i-1]) {
    const sl = price - 2 * a;
    const risk = price - sl;
    return makeSignal({
      signal: "long",
      entry: price,
      stop_loss: sl,
      take_profit: [price + risk*1.5, price + risk*2.5, price + risk*4],
      confidence: 0.7,
      reason: "EMA9 crossed above EMA21"
    });
  }

  // Crossing below = SHORT
  if (fast[i] < slow[i] && fast[i-1] >= slow[i-1]) {
    const sl = price + 2 * a;
    const risk = sl - price;
    return makeSignal({
      signal: "short",
      entry: price,
      stop_loss: sl,
      take_profit: [price - risk*1.5, price - risk*2.5, price - risk*4],
      confidence: 0.7,
      reason: "EMA9 crossed below EMA21"
    });
  }

  return makeSignal({ reason: "No signal" });
}`;
