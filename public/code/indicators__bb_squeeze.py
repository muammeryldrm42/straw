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
def bbSqueeze(c):
    if len(c) < 70:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    _d = bollingerBands(closes, 20, 2)
    upper = _d['upper']
    middle = _d['middle']
    lower = _d['lower']
    width = [(u - lower[i]) / middle[i] for i, u in enumerate(upper)]
    cur = c[len(c) - 1]
    prev = c[len(c) - 2]
    i = len(c) - 1
    recent = sorted([v for v in width[-50:] if not math.isnan(v)])
    q25 = recent[math.floor(len(recent) * 0.25)]
    wasSqueeze = all(v < q25 for v in width[-5: -1])
    vols = [x['volume'] for x in c]
    avgV = sma(vols, 20)[i]
    volOk = cur['volume'] > avgV * 1.2
    if wasSqueeze  and  cur['close'] > upper[i]  and  prev['close'] <= upper[i - 1]  and  volOk:
        sl = middle[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.75, reason="BB squeeze breakout UP")
    if wasSqueeze  and  cur['close'] < lower[i]  and  prev['close'] >= lower[i - 1]  and  volOk:
        sl = middle[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.75, reason="BB squeeze breakout DOWN")
    return make_signal(reason="Squeeze breakout yok")
