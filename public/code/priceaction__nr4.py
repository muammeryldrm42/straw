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
def nr4(c):
    if len(c) < 20:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    prev = c[i - 1]
    last4 = c[i - 4: i]
    isNR4 = rng(prev) == min(last4.__map__(rng))
    if isNR4  and  c[i]['close'] > prev['high']:
        return mkPA(c, i, "long", prev['low'] - 0.3 * a[i], 0.69, "NR4 breakout up (volatility expansion)")
    if isNR4  and  c[i]['close'] < prev['low']:
        return mkPA(c, i, "short", prev['high'] + 0.3 * a[i], 0.69, "NR4 breakdown (volatility expansion)")
    return make_signal(reason="No NR4 break")
