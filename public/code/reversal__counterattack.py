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
def counterattack(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    prev = c[i - 1]
    cur = c[i]
    # Bullish: büyük kırmızı + yeşil aynı close'a kapanır (counterattack)
    if red(prev)  and  body(prev) > a[i]  and  green(cur)  and  abs(cur['close'] - prev['close']) / prev['close'] < 0.004  and  cur['open'] < prev['close']:
        return mkR(c, i, "long", cur['low'] - 0.4 * a[i], 0.67, "Bullish counterattack line")
    if green(prev)  and  body(prev) > a[i]  and  red(cur)  and  abs(cur['close'] - prev['close']) / prev['close'] < 0.004  and  cur['open'] > prev['close']:
        return mkR(c, i, "short", cur['high'] + 0.4 * a[i], 0.67, "Bearish counterattack line")
    return make_signal(reason="No counterattack")
