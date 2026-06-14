from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def body(c):
    return abs(c['close'] - c['open'])
def range(c):
    return c['high'] - c['low']
def isGreen(c):
    return c['close'] > c['open']
def isRed(c):
    return c['close'] < c['open']
def tweezer(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    cur = c[i]
    prev = c[i - 1]
    a = atr(c, 14)
    recent = c[-20:]
    recentLow = min([x['low'] for x in recent])
    recentHigh = max([x['high'] for x in recent])
    # Tweezer bottom: iki mum dipleri eşit, dip bölgede
    eqLows = abs(cur['low'] - prev['low']) / (prev['low']  or  1) < 0.003
    eqHighs = abs(cur['high'] - prev['high']) / (prev['high']  or  1) < 0.003
    nearLow = cur['low'] <= recentLow + (recentHigh - recentLow) * 0.2
    nearHigh = cur['high'] >= recentHigh - (recentHigh - recentLow) * 0.2
    if eqLows  and  nearLow  and  isRed(prev)  and  isGreen(cur):
        sl = cur['low'] - 0.5 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.69, reason="Tweezer bottom at support")
    if eqHighs  and  nearHigh  and  isGreen(prev)  and  isRed(cur):
        sl = cur['high'] + 0.5 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.69, reason="Tweezer top at resistance")
    return make_signal(reason="No tweezer")
