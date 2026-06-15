from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


body = lambda c: abs(c['close'] - c['open'])
rng = lambda c: c['high'] - c['low']
green = lambda c: c['close'] > c['open']
red = lambda c: c['close'] < c['open']
def mkPA(c, i, side, slPrice, conf, reason):
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
def threeBarReversal(c):
    if len(c) < 20:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    c1 = c[i - 2]
    c2 = c[i - 1]
    cur = c[i]
    # Düşen low (c2 en düşük), sonra yükselen close = bullish 3-bar
    if c2['low'] < c1['low']  and  c2['low'] < cur['low']  and  cur['close'] > c2['high']  and  green(cur):
        return mkPA(c, i, "long", c2['low'] - 0.3 * a[i], 0.7, "Three-bar bullish reversal")
    if c2['high'] > c1['high']  and  c2['high'] > cur['high']  and  cur['close'] < c2['low']  and  red(cur):
        return mkPA(c, i, "short", c2['high'] + 0.3 * a[i], 0.7, "Three-bar bearish reversal")
    return make_signal(reason="No three-bar reversal")
