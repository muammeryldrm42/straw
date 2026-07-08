from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def inducement(c):
    if len(c) < 24:
        return make_signal(reason="Insufficient data")
    sh = [v for v in swingHighs(c, 8) if v != None]
    sl = [v for v in swingLows(c, 8) if v != None]
    if len(sh) < 2  or  len(sl) < 2:
        return make_signal(reason="No structure")
    a = atr(c, 14)
    cur = c[len(c) - 1]
    last3 = c[-4: -1]
    lastL = sl[len(sl) - 1]
    lastH = sh[len(sh) - 1]
    wickBelow = any(x['low'] < lastL  and  x['close'] > lastL for x in last3)
    max3 = max([x['high'] for x in last3])
    if wickBelow  and  cur['close'] > cur['open']  and  cur['close'] > max3:
        min3 = min([x['low'] for x in last3])
        slv = min3 - 0.3 * a[len(a) - 1]
        r = cur['close'] - slv
        return make_signal(signal="long", entry=cur['close'], stop_loss=slv, take_profit=[cur['close'] + r * 2, cur['close'] + r * 3, cur['close'] + r * 5], confidence=0.7, reason="Bullish inducement")
    wickAbove = any(x['high'] > lastH  and  x['close'] < lastH for x in last3)
    min3 = min([x['low'] for x in last3])
    if wickAbove  and  cur['close'] < cur['open']  and  cur['close'] < min3:
        max3b = max([x['high'] for x in last3])
        slv = max3b + 0.3 * a[len(a) - 1]
        r = slv - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=slv, take_profit=[cur['close'] - r * 2, cur['close'] - r * 3, cur['close'] - r * 5], confidence=0.7, reason="Bearish inducement")
    return make_signal(reason="Inducement kurulumu yok")
