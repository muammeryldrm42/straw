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
def abandonedBaby(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    c1 = c[i - 2]
    c2 = c[i - 1]
    c3 = c[i]
    isDoji = body(c2) < rng(c2) * 0.1
    # Bullish: kırmızı + gap-down doji + gap-up yeşil
    if red(c1)  and  isDoji  and  c2['high'] < c1['low']  and  green(c3)  and  c3['low'] > c2['high']:
        return mkR(c, i, "long", c2['low'] - 0.3 * a[i], 0.71, "Bullish abandoned baby")
    if green(c1)  and  isDoji  and  c2['low'] > c1['high']  and  red(c3)  and  c3['high'] < c2['low']:
        return mkR(c, i, "short", c2['high'] + 0.3 * a[i], 0.71, "Bearish abandoned baby")
    return make_signal(reason="No abandoned baby")
