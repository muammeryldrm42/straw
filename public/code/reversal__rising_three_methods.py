from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


body = lambda c: abs(c['close'] - c['open'])
rng = lambda c: c['high'] - c['low']
green = lambda c: c['close'] > c['open']
red = lambda c: c['close'] < c['open']
def mkR(c, i, side, slPrice, conf, reason):
    cur = c[i]
    if side == "long":
        r = cur['close'] - slPrice
        if r <= 0:
            return make_signal(reason="Invalid risk")
        return make_signal(signal="long", entry=cur['close'], stop_loss=slPrice, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=conf, reason=reason)
    r = slPrice - cur['close']
    if r <= 0:
        return make_signal(reason="Invalid risk")
    return make_signal(signal="short", entry=cur['close'], stop_loss=slPrice, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=conf, reason=reason)
def risingThreeMethods(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    c1 = c[i - 4]
    small = c[i - 3: i]
    c5 = c[i]
    # Rising: büyük yeşil, 3 küçük (gövde içinde), büyük yeşil yeni high
    if green(c1)  and  body(c1) > a[i]  and  all(body(x) < body(c1)  and  x['high'] < c1['high']  and  x['low'] > c1['low'] for x in small)  and  green(c5)  and  c5['close'] > c1['close']:
        return mkR(c, i, "long", c1['low'] - 0.3 * a[i], 0.7, "Rising three methods (bullish continuation)")
    if red(c1)  and  body(c1) > a[i]  and  all(body(x) < body(c1)  and  x['high'] < c1['high']  and  x['low'] > c1['low'] for x in small)  and  red(c5)  and  c5['close'] < c1['close']:
        return mkR(c, i, "short", c1['high'] + 0.3 * a[i], 0.7, "Falling three methods (bearish continuation)")
    return make_signal(reason="No three methods")
