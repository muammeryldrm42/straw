from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def calcAdx(c, p=14):
    res = [float('nan')]*(len(c))
    if len(c) < p * 2:
        return res
    pdm = [0]
    mdm = [0]
    trs = [c[0]['high'] - c[0]['low']]
    for i in range(1, len(c)):
        up = c[i]['high'] - c[i - 1]['high']
        dn = c[i - 1]['low'] - c[i]['low']
        pdm.append((up if up > dn  and  up > 0 else 0))
        mdm.append((dn if dn > up  and  dn > 0 else 0))
        trs.append(max(c[i]['high'] - c[i]['low'], abs(c[i]['high'] - c[i - 1]['close']), abs(c[i]['low'] - c[i - 1]['close'])))
    sp = sum(b for b in pdm[1: p + 1])
    sm = sum(b for b in mdm[1: p + 1])
    st = sum(b for b in trs[1: p + 1])
    dx = []
    for i in range(p, len(c)):
        if i > p:
            sp = sp - sp / p + pdm[i]
            sm = sm - sm / p + mdm[i]
            st = st - st / p + trs[i]
        pdi = 100 * (sp / (st  or  1e-10))
        mdi = 100 * (sm / (st  or  1e-10))
        dx.append(100 * (abs(pdi - mdi) / ((pdi + mdi)  or  1e-10)))
    for i in range(0, len(dx)):
        if i < p - 1:
            continue
        res[i + p] = sum(b for b in dx[i - p + 1: i + 1]) / p
    return res
def calcSt(c, p=10, m=3):
    a = atr(c, p)
    st = [float('nan')]*(len(c))
    dir = [0]*(len(c))
    for i in range(0, len(c)):
        hl2 = (c[i]['high'] + c[i]['low']) / 2
        ub = hl2 + m * a[i]
        lb = hl2 - m * a[i]
        if i == 0:
            st[i] = ub
            dir[i] = -1
            continue
        if c[i - 1]['close'] > st[i - 1]:
            st[i] = max(lb, st[i - 1])
            if c[i]['close'] < st[i]:
                st[i] = ub
                dir[i] = -1
            else:
                dir[i] = 1
        else:
            st[i] = min(ub, st[i - 1])
            if c[i]['close'] > st[i]:
                st[i] = lb
                dir[i] = 1
            else:
                dir[i] = -1
    return {'st': st, 'dir': dir}
def stochRsi(c):
    if len(c) < 50:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    rs = rsi(closes, 14)
    # StochRSI = (RSI - RSI.lowestN) / (RSI.highestN - RSI.lowestN)
    period = 14
    sr = [float('nan')]*(len(closes))
    for i in range(period * 2, len(closes)):
        slice = [v for v in rs[i - period + 1: i + 1] if not math.isnan(v)]
        if len(slice) < period:
            continue
        lo = min(slice)
        hi = max(slice)
        sr[i] = (50 if hi == lo else ((rs[i] - lo) / (hi - lo)) * 100)
    k = sma([(50 if math.isnan(v) else v) for v in sr], 3)
    # %K (smoothed)
    d = sma(k, 3)
    # %D
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    # Bullish cross at oversold
    if k[i] < 20  and  k[i - 1] < d[i - 1]  and  k[i] > d[i]:
        sl = cur['close'] - 2 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.73, reason=f"StochRSI oversold cross (K={k[i]})")
    if k[i] > 80  and  k[i - 1] > d[i - 1]  and  k[i] < d[i]:
        sl = cur['close'] + 2 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.73, reason=f"StochRSI overbought cross (K={k[i]})")
    return make_signal(reason="No StochRSI extreme cross")
