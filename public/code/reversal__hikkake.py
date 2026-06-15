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
def hikkake(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    inside = c[i - 2]
    bar = c[i - 1]
    cur = c[i]
    # inside bar, sonra aşağı sahte kırılım, sonra yukarı dönüş = bullish hikkake
    wasInside = inside['high'] < c[i - 3]['high']  and  inside['low'] > c[i - 3]['low']
    if wasInside  and  bar['low'] < inside['low']  and  cur['close'] > inside['high']:
        return mkR(c, i, "long", bar['low'] - 0.3 * a[i], 0.7, "Bullish hikkake (failed breakdown)")
    if wasInside  and  bar['high'] > inside['high']  and  cur['close'] < inside['low']:
        return mkR(c, i, "short", bar['high'] + 0.3 * a[i], 0.7, "Bearish hikkake (failed breakout)")
    return make_signal(reason="No hikkake")
