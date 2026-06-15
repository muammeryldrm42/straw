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
def stickSandwich(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    c1 = c[i - 2]
    c2 = c[i - 1]
    c3 = c[i]
    # Bullish: kırmızı, yeşil, kırmızı - c1 ve c3 close eşit
    if red(c1)  and  green(c2)  and  red(c3)  and  abs(c1['close'] - c3['close']) / c3['close'] < 0.004:
        return mkR(c, i, "long", min(c1['low'], c3['low']) - 0.5 * a[i], 0.67, "Bullish stick sandwich")
    if green(c1)  and  red(c2)  and  green(c3)  and  abs(c1['close'] - c3['close']) / c3['close'] < 0.004:
        return mkR(c, i, "short", max(c1['high'], c3['high']) + 0.5 * a[i], 0.67, "Bearish stick sandwich")
    return make_signal(reason="No stick sandwich")
