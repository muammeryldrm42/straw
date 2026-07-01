from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mkH(c, i, side, a, conf, reason, m=2):
    cur = c[i]
    if side == "long":
        sl = cur['close'] - m * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=conf, reason=reason)
    sl = cur['close'] + m * a[i]
    r = sl - cur['close']
    return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=conf, reason=reason)
def stochK(c, p=14):
    out = []
    for i in range(0, len(c)):
        if i < p - 1:
            out.append(50)
            continue
        w = c[i - p + 1: i + 1]
        hh = max([x['high'] for x in w])
        ll = min([x['low'] for x in w])
        out.append((50 if hh == ll else ((c[i]['close'] - ll) / (hh - ll)) * 100))
    return sma(out, 3)
def emaAdx(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    e1 = ema(closes, 9)
    e2 = ema(closes, 21)
    i = len(c) - 1
    a = atr(c, 14)
    # ADX proxy
    p = 14
    pdm = []
    mdm = []
    tr = []
    for k in range(1, len(c)):
        up = c[k]['high'] - c[k - 1]['high']
        dn = c[k - 1]['low'] - c[k]['low']
        pdm.append((up if up > dn  and  up > 0 else 0))
        mdm.append((dn if dn > up  and  dn > 0 else 0))
        tr.append(max(c[k]['high'] - c[k]['low'], abs(c[k]['high'] - c[k - 1]['close']), abs(c[k]['low'] - c[k - 1]['close'])))
    trS = ema(tr, p)
    pdi = [(((100 * v) / trS[k] if trS[k] else 0)) for k, v in enumerate(ema(pdm, p))]
    mdi = [(((100 * v) / trS[k] if trS[k] else 0)) for k, v in enumerate(ema(mdm, p))]
    dx = [(((100 * abs(v - mdi[k])) / (v + mdi[k]) if v + mdi[k] else 0)) for k, v in enumerate(pdi)]
    adx = ema(dx, p)
    j = len(adx) - 1
    if e1[i - 1] <= e2[i - 1]  and  e1[i] > e2[i]  and  adx[j] > 25:
        return mkH(c, i, "long", a, 0.74, f"EMA cross up + ADX strong ({adx[j]})")
    if e1[i - 1] >= e2[i - 1]  and  e1[i] < e2[i]  and  adx[j] > 25:
        return mkH(c, i, "short", a, 0.74, f"EMA cross down + ADX strong ({adx[j]})")
    return make_signal(reason="No EMA+ADX trend signal")
