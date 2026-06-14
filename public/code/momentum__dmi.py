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
def dmi(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    p = 14
    plusDM = []
    minusDM = []
    tr = []
    for k in range(1, len(c)):
        up = c[k]['high'] - c[k - 1]['high']
        dn = c[k - 1]['low'] - c[k]['low']
        plusDM.append((up if up > dn  and  up > 0 else 0))
        minusDM.append((dn if dn > up  and  dn > 0 else 0))
        tr.append(max(c[k]['high'] - c[k]['low'], abs(c[k]['high'] - c[k - 1]['close']), abs(c[k]['low'] - c[k - 1]['close'])))
    sm = lambda arr: ema(arr, p)
    trS = sm(tr)
    pdi = [(((100 * v) / trS[i] if trS[i] else 0)) for i, v in enumerate(sm(plusDM))]
    mdi = [(((100 * v) / trS[i] if trS[i] else 0)) for i, v in enumerate(sm(minusDM))]
    j = len(pdi) - 1
    i = len(c) - 1
    a = atr(c, 14)
    if pdi[j - 1] <= mdi[j - 1]  and  pdi[j] > mdi[j]:
        return mk(c, i, "long", a, 0.7, "+DI crossed above -DI")
    if mdi[j - 1] <= pdi[j - 1]  and  mdi[j] > pdi[j]:
        return mk(c, i, "short", a, 0.7, "-DI crossed above +DI")
    return make_signal(reason="No DI cross")
