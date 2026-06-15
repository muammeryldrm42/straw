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
def rsiDivergence(c):
    if len(c) < 44:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    rs = rsi(closes, 14)
    sh = swingHighs(c, 5)
    sl = swingLows(c, 5)
    li = []
    hi = []
    [v != None  and  li.append(i) for i, v in enumerate(sl)]
    [v != None  and  hi.append(i) for i, v in enumerate(sh)]
    if len(li) < 2  or  len(hi) < 2:
        return make_signal(reason="Insufficient swings")
    a = atr(c, 14)
    cur = c[len(c) - 1]
    ai = len(a) - 1
    l1 = li[len(li) - 2]
    l2 = li[len(li) - 1]
    h1 = hi[len(hi) - 2]
    h2 = hi[len(hi) - 1]
    if c[l2]['low'] < c[l1]['low']  and  rs[l2] > rs[l1]  and  rs[l2] < 40:
        sv = c[l2]['low'] - 0.3 * a[ai]
        r = cur['close'] - sv
        if r > 0:
            return make_signal(signal="long", entry=cur['close'], stop_loss=sv, take_profit=[cur['close'] + r * 2, cur['close'] + r * 3, cur['close'] + r * 5], confidence=0.78, reason="Bullish RSI divergence")
    if c[h2]['high'] > c[h1]['high']  and  rs[h2] < rs[h1]  and  rs[h2] > 60:
        sv = c[h2]['high'] + 0.3 * a[ai]
        r = sv - cur['close']
        if r > 0:
            return make_signal(signal="short", entry=cur['close'], stop_loss=sv, take_profit=[cur['close'] - r * 2, cur['close'] - r * 3, cur['close'] - r * 5], confidence=0.78, reason="Bearish RSI divergence")
    return make_signal(reason="RSI divergence yok")
