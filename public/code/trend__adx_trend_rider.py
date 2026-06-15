from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def adxTrendRider(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    period = 14
    tr = []
    plusDM = []
    minusDM = []
    for k in range(1, len(c)):
        up = c[k]['high'] - c[k - 1]['high']
        dn = c[k - 1]['low'] - c[k]['low']
        plusDM.append((up if up > dn  and  up > 0 else 0))
        minusDM.append((dn if dn > up  and  dn > 0 else 0))
        tr.append(max(c[k]['high'] - c[k]['low'], abs(c[k]['high'] - c[k - 1]['close']), abs(c[k]['low'] - c[k - 1]['close'])))
    # Wilder smoothing
    def smooth(arr):
        out = []
        s = sum(b for b in arr[0: period])
        out[period - 1] = s
        for k in range(period, len(arr)):
            s = s - s / period + arr[k]
            out[k] = s
        return out
    trS = smooth(tr)
    pdmS = smooth(plusDM)
    mdmS = smooth(minusDM)
    plusDI = []
    minusDI = []
    dx = []
    for k in range(0, len(trS)):
        if trS[k] == None  or  trS[k] == 0:
            continue
        pDI = (pdmS[k] / trS[k]) * 100
        mDI = (mdmS[k] / trS[k]) * 100
        plusDI[k] = pDI
        minusDI[k] = mDI
        dx[k] = (abs(pDI - mDI) / (pDI + mDI  or  1)) * 100
    # ADX = DX'in smoothed ortalaması
    dxVals = [v for v in dx if v != None]
    adx = sma([v  or  0 for v in dx], period)
    j = len(c) - 2
    # tr arrays 1 kaydık (k başlangıç 1)
    last = len(plusDI) - 1
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    adxNow = adx[len(adx) - 1]
    if adxNow < 25:
        return make_signal(reason=f"ADX weak ({adxNow}) - no trend")
    # DI cross
    pNow = plusDI[last]
    mNow = minusDI[last]
    pPrev = plusDI[last - 1]
    mPrev = minusDI[last - 1]
    if pPrev <= mPrev  and  pNow > mNow:
        sl = cur['close'] - 2 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.76, reason=f"ADX {adxNow} + +DI cross above -DI")
    if mPrev <= pPrev  and  mNow > pNow:
        sl = cur['close'] + 2 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.76, reason=f"ADX {adxNow} + -DI cross above +DI")
    return make_signal(reason=f"ADX strong ({adxNow}) but no DI cross")
