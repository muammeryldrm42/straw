from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mk(c, i, side, a, conf, reason, slMult=2):
    cur = c[i]
    if side == "long":
        sl = cur['close'] - slMult * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=conf, reason=reason)
    sl = cur['close'] + slMult * a[i]
    r = sl - cur['close']
    return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=conf, reason=reason)
def stochKD(c, kP, smooth, dP):
    raw = []
    for i in range(0, len(c)):
        if i < kP - 1:
            raw.append(50)
            continue
        win = c[i - kP + 1: i + 1]
        hh = max([x['high'] for x in win])
        ll = min([x['low'] for x in win])
        raw.append((50 if hh == ll else ((c[i]['close'] - ll) / (hh - ll)) * 100))
    k = sma(raw, smooth)
    d = sma(k, dP)
    return {'k': k, 'd': d}
def macdLine(closes, f, s):
    ef = ema(closes, f)
    es = ema(closes, s)
    return [v - es[i] for i, v in enumerate(ef)]
def stochOf(arr, p):
    out = []
    for i in range(0, len(arr)):
        if i < p - 1:
            out.append(50)
            continue
        win = arr[i - p + 1: i + 1]
        mn = min(win)
        mx = max(win)
        out.append((50 if mx == mn else ((arr[i] - mn) / (mx - mn)) * 100))
    return out
def kst(c):
    if len(c) < 60:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    def rocSma(n, s):
        r = [((((v - closes[i - n]) / closes[i - n]) * 100 if i >= n else 0)) for i, v in enumerate(closes)]
        return sma(r, s)
    k1 = rocSma(10, 10)
    k2 = rocSma(15, 10)
    k3 = rocSma(20, 10)
    k4 = rocSma(30, 15)
    kstArr = [v + 2 * k2[i] + 3 * k3[i] + 4 * k4[i] for i, v in enumerate(k1)]
    sig = sma(kstArr, 9)
    i = len(c) - 1
    a = atr(c, 14)
    if kstArr[i - 1] <= sig[i - 1]  and  kstArr[i] > sig[i]:
        return mk(c, i, "long", a, 0.71, "KST bullish cross")
    if kstArr[i - 1] >= sig[i - 1]  and  kstArr[i] < sig[i]:
        return mk(c, i, "short", a, 0.71, "KST bearish cross")
    return make_signal(reason="No KST cross")
