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
def relativeMomentumIndex(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    p = 14
    mom = 4
    up = []
    dn = []
    for i in range(0, len(closes)):
        if i < mom:
            up.append(0)
            dn.append(0)
            continue
        diff = closes[i] - closes[i - mom]
        up.append((diff if diff > 0 else 0))
        dn.append((-diff if diff < 0 else 0))
    upE = ema(up, p)
    dnE = ema(dn, p)
    rmi = [((50 if v + dnE[i] == 0 else (100 * v) / (v + dnE[i]))) for i, v in enumerate(upE)]
    i = len(c) - 1
    a = atr(c, 14)
    if rmi[i - 1] < 30  and  rmi[i] >= 30:
        return mk(c, i, "long", a, 0.69, f"RMI exit oversold ({rmi[i]})")
    if rmi[i - 1] > 70  and  rmi[i] <= 70:
        return mk(c, i, "short", a, 0.69, f"RMI exit overbought ({rmi[i]})")
    return make_signal(reason=f"RMI {rmi[i]}")
