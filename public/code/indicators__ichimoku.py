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
def ichimoku(c):
    if len(c) < 100:
        return make_signal(reason="Insufficient data")
    highs = [x['high'] for x in c]
    lows = [x['low'] for x in c]
    rMax = lambda arr, p, idx: max(arr[max(0, idx - p + 1): idx + 1])
    rMin = lambda arr, p, idx: min(arr[max(0, idx - p + 1): idx + 1])
    i = len(c) - 1
    tenkan = (rMax(highs, 9, i) + rMin(lows, 9, i)) / 2
    kijun = (rMax(highs, 26, i) + rMin(lows, 26, i)) / 2
    tenkanP = (rMax(highs, 9, i - 1) + rMin(lows, 9, i - 1)) / 2
    kijunP = (rMax(highs, 26, i - 1) + rMin(lows, 26, i - 1)) / 2
    ci = max(0, i - 26)
    sa = ((rMax(highs, 9, ci) + rMin(lows, 9, ci)) / 2 + (rMax(highs, 26, ci) + rMin(lows, 26, ci)) / 2) / 2
    sb = (rMax(highs, 52, ci) + rMin(lows, 52, ci)) / 2
    cloudTop = max(sa, sb)
    cloudBot = min(sa, sb)
    green = sa > sb
    cur = c[i]
    if cur['close'] > cloudTop  and  tenkan > kijun  and  tenkanP <= kijunP  and  green:
        r = cur['close'] - kijun
        if r <= 0:
            return make_signal(reason="Invalid risk")
        return make_signal(signal="long", entry=cur['close'], stop_loss=kijun, take_profit=[cur['close'] + r * 2, cur['close'] + r * 3, cur['close'] + r * 5], confidence=0.8, reason="Ichimoku full bullish")
    if cur['close'] < cloudBot  and  tenkan < kijun  and  tenkanP >= kijunP  and  not green:
        r = kijun - cur['close']
        if r <= 0:
            return make_signal(reason="Invalid risk")
        return make_signal(signal="short", entry=cur['close'], stop_loss=kijun, take_profit=[cur['close'] - r * 2, cur['close'] - r * 3, cur['close'] - r * 5], confidence=0.8, reason="Ichimoku full bearish")
    return make_signal(reason="Ichimoku not aligned")
