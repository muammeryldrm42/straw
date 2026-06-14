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
def vortex(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    p = 14
    vmPlus = []
    vmMinus = []
    tr = []
    for k in range(1, len(c)):
        vmPlus.append(abs(c[k]['high'] - c[k - 1]['low']))
        vmMinus.append(abs(c[k]['low'] - c[k - 1]['high']))
        tr.append(max(c[k]['high'] - c[k]['low'], abs(c[k]['high'] - c[k - 1]['close']), abs(c[k]['low'] - c[k - 1]['close'])))
    sum = lambda arr, end: sum(b for b in arr[end - p + 1: end + 1])
    j = len(vmPlus) - 1
    viP = sum(vmPlus, j) / sum(tr, j)
    viM = sum(vmMinus, j) / sum(tr, j)
    viPprev = sum(vmPlus, j - 1) / sum(tr, j - 1)
    viMprev = sum(vmMinus, j - 1) / sum(tr, j - 1)
    i = len(c) - 1
    a = atr(c, 14)
    if viPprev <= viMprev  and  viP > viM:
        return mk(c, i, "long", a, 0.71, "Vortex VI+ crossed above VI-")
    if viMprev <= viPprev  and  viM > viP:
        return mk(c, i, "short", a, 0.71, "Vortex VI- crossed above VI+")
    return make_signal(reason="No vortex cross")
