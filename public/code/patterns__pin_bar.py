from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def body(c):
    return abs(c['close'] - c['open'])
def range(c):
    return c['high'] - c['low']
def upperWick(c):
    return c['high'] - max(c['open'], c['close'])
def lowerWick(c):
    return min(c['open'], c['close']) - c['low']
def isGreen(c):
    return c['close'] > c['open']
def isRed(c):
    return c['close'] < c['open']
def pinBar(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    rng = range(cur)
    if rng == 0:
        return make_signal(reason="Doji range")
    b = body(cur)
    uw = upperWick(cur)
    lw = lowerWick(cur)
    # Trend bağlamı: son 20 mum
    recent = c[-20:]
    recentLow = min([x['low'] for x in recent])
    recentHigh = max([x['high'] for x in recent])
    # Hammer: uzun alt fitil (range %60+), küçük gövde, dip yakınında
    isHammer = lw > rng * 0.6  and  b < rng * 0.3  and  uw < rng * 0.15
    nearLow = cur['low'] <= recentLow + (recentHigh - recentLow) * 0.2
    if isHammer  and  nearLow:
        sl = cur['low'] - 0.2 * a[i]
        r = cur['close'] - sl
        if r > 0:
            return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.71, reason="Hammer pin bar at support")
    # Shooting star: uzun üst fitil, küçük gövde, tepe yakınında
    isStar = uw > rng * 0.6  and  b < rng * 0.3  and  lw < rng * 0.15
    nearHigh = cur['high'] >= recentHigh - (recentHigh - recentLow) * 0.2
    if isStar  and  nearHigh:
        sl = cur['high'] + 0.2 * a[i]
        r = sl - cur['close']
        if r > 0:
            return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.71, reason="Shooting star pin bar at resistance")
    return make_signal(reason="No pin bar")
