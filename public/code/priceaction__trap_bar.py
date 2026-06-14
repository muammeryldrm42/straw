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
def trapBar(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    cur = c[i]
    win = c[i - 10: i]
    recentHigh = max([x['high'] for x in win])
    recentLow = min([x['low'] for x in win])
    # Recent low'u kırıp güçlü geri kapanış = bear trap (long)
    if cur['low'] < recentLow  and  cur['close'] > recentLow  and  body(cur) > a[i]  and  green(cur):
        return mkPA(c, i, "long", cur['low'] - 0.3 * a[i], 0.71, "Bear trap (stop-run below support)")
    if cur['high'] > recentHigh  and  cur['close'] < recentHigh  and  body(cur) > a[i]  and  red(cur):
        return mkPA(c, i, "short", cur['high'] + 0.3 * a[i], 0.71, "Bull trap (stop-run above resistance)")
    return make_signal(reason="No trap bar")
