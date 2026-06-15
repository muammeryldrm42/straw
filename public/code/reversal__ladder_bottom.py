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
def ladderBottom(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    # 3 ardışık alçalan kırmızı, sonra üst fitilli kırmızı, sonra güçlü yeşil
    r1 = c[i - 4]
    r2 = c[i - 3]
    r3 = c[i - 2]
    r4 = c[i - 1]
    g = c[i]
    if red(r1)  and  red(r2)  and  red(r3)  and  r3['close'] < r2['close']  and  r2['close'] < r1['close']  and  red(r4)  and  (r4['high'] - max(r4['open'], r4['close'])) > body(r4)  and  green(g)  and  g['close'] > r4['open']:
        return mkR(c, i, "long", r3['low'] - 0.4 * a[i], 0.69, "Ladder bottom reversal")
    return make_signal(reason="No ladder bottom")
