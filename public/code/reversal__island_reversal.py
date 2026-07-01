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
def islandReversal(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    before = c[i - 2]
    island = c[i - 1]
    cur = c[i]
    # Bottom island: gap-down sonra gap-up = long
    if island['high'] < before['low']  and  cur['low'] > island['high']:
        return mkR(c, i, "long", island['low'] - 0.3 * a[i], 0.71, "Island bottom reversal")
    if island['low'] > before['high']  and  cur['high'] < island['low']:
        return mkR(c, i, "short", island['high'] + 0.3 * a[i], 0.71, "Island top reversal")
    return make_signal(reason="No island reversal")
