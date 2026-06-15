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
def springboard(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    closes = [x['close'] for x in c]
    e = ema(closes, 21)
    cur = c[i]
    # Uptrend + EMA'ya geri çekilme + dönüş mumu
    if e[i] > e[i - 10]  and  cur['low'] <= e[i]  and  cur['close'] > e[i]  and  green(cur):
        return mkPA(c, i, "long", cur['low'] - 0.5 * a[i], 0.71, "Springboard: pullback to EMA in uptrend")
    if e[i] < e[i - 10]  and  cur['high'] >= e[i]  and  cur['close'] < e[i]  and  red(cur):
        return mkPA(c, i, "short", cur['high'] + 0.5 * a[i], 0.71, "Springboard: bounce to EMA in downtrend")
    return make_signal(reason="No springboard setup")
