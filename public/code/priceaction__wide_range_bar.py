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
def wideRangeBar(c):
    if len(c) < 20:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    cur = c[i]
    avgRange = sum(rng(x) for x in c[i - 10: i]) / 10
    if rng(cur) > avgRange * 2  and  green(cur)  and  body(cur) > rng(cur) * 0.7:
        return mkPA(c, i, "long", cur['low'] - 0.3 * a[i], 0.69, "Wide-range bar (bullish thrust)")
    if rng(cur) > avgRange * 2  and  red(cur)  and  body(cur) > rng(cur) * 0.7:
        return mkPA(c, i, "short", cur['high'] + 0.3 * a[i], 0.69, "Wide-range bar (bearish thrust)")
    return make_signal(reason="No wide-range bar")
