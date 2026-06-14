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
def fakey(c):
    if len(c) < 20:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    mother = c[i - 3]
    inside = c[i - 2]
    fake = c[i - 1]
    cur = c[i]
    isInside = inside['high'] < mother['high']  and  inside['low'] > mother['low']
    # Fakey long: inside bar, aşağı sahte kırılım, sonra yukarı dönüş
    if isInside  and  fake['low'] < mother['low']  and  cur['close'] > mother['low']  and  cur['close'] > cur['open']:
        return mkPA(c, i, "long", fake['low'] - 0.3 * a[i], 0.71, "Bullish fakey (False breakdown)")
    if isInside  and  fake['high'] > mother['high']  and  cur['close'] < mother['high']  and  cur['close'] < cur['open']:
        return mkPA(c, i, "short", fake['high'] + 0.3 * a[i], 0.71, "Bearish fakey (False breakout)")
    return make_signal(reason="No fakey")
