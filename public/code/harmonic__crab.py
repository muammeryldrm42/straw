from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def pivots(c, lb=5):
    sh = swingHighs(c, lb)
    sl = swingLows(c, lb)
    pts = []
    for i in range(0, len(c)):
        if sh[i] != None:
            pts.append({'idx': i, 'price': sh[i], 'type': "H"})
        if sl[i] != None:
            pts.append({'idx': i, 'price': sl[i], 'type': "L"})
    sorted(pts, key=lambda _e: _e['idx'])
    # Ardışık aynı tipleri filtrele (zigzag yap)
    zz = []
    for p in pts:
        if len(zz)  and  zz[len(zz) - 1].type == p.type:
            if (p.type == "H"  and  p.price > zz[len(zz) - 1].price)  or  (p.type == "L"  and  p.price < zz[len(zz) - 1].price):
                zz[len(zz) - 1] = p
        else:
            zz.append(p)
    return zz
def harmonicCheck(c, name, conf, ab, bc, cd, xa):
    if len(c) < 60:
        return make_signal(reason="Insufficient data")
    zz = pivots(c, 5)
    if len(zz) < 5:
        return make_signal(reason="Not enough pivots")
    [X, A, B, C, D] = zz[-5:]
    a = atr(c, 14)
    i = len(c) - 1
    cur = c[i]
    # D son pivotlardan biri ve fiyata yakın olmalı
    if i - D.idx > 5:
        return make_signal(reason=f"{name}: pattern too old")
    XA = abs(A.price - X.price)
    AB = abs(B.price - A.price)
    BC = abs(C.price - B.price)
    CD = abs(D.price - C.price)
    if XA == 0  or  AB == 0  or  BC == 0:
        return make_signal(reason=f"{name}: degenerate")
    rAB = AB / XA
    rBC = BC / AB
    rCD = CD / BC
    inRange = lambda v, _dp: (lambda lo, hi: v >= lo  and  v <= hi)(*_dp)
    if not inRange(rAB, ab)  or  not inRange(rBC, bc)  or  not inRange(rCD, cd):
        return make_signal(reason=f"{name}: ratios off (AB {rAB})")
    # Bullish: D bir low (X-A yukarı değil aşağı pattern). D.type belirler yönü
    bullish = D.type == "L"
    if bullish:
        sl = D.price - 1.5 * a[i]
        r = cur['close'] - sl
        if r <= 0:
            return make_signal(reason=f"{name}: invalid risk")
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[C.price, A.price, A.price + (A.price - D.price) * 0.5], confidence=conf, reason=f"{name} bullish (D completion)")
    else:
        sl = D.price + 1.5 * a[i]
        r = sl - cur['close']
        if r <= 0:
            return make_signal(reason=f"{name}: invalid risk")
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[C.price, A.price, A.price - (D.price - A.price) * 0.5], confidence=conf, reason=f"{name} bearish (D completion)")
def crab(c):
    return harmonicCheck(c, "Crab", 0.7, [0.35, 0.65], [0.38, 0.89], [2.2, 3.7])
