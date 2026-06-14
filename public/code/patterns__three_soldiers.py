from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def body(c):
    return abs(c['close'] - c['open'])
def range(c):
    return c['high'] - c['low']
def upperWick(c):
    return c['high'] - max(c['open'], c['close'])
def lowerWick(c):
    return min(c['open'], c['close']) - c['low']
def isGreen(c):
    return c['close'] > c['open']
def isRed(c):
    return c['close'] < c['open']
def threeSoldiers(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    s = [c[i - 2], c[i - 1], c[i]]
    # Three white soldiers: 3 ardışık yeşil, her biri öncekinin gövdesinde açılıp daha yüksek kapanır, güçlü gövde
    soldiers = all(isGreen(x)  and  body(x) > range(x) * 0.6 for x in s)  and  s[1]['close'] > s[0]['close']  and  s[2]['close'] > s[1]['close']  and  s[1]['open'] > s[0]['open']  and  s[2]['open'] > s[1]['open']
    if soldiers:
        sl = s[0]['low'] - 0.3 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1, cur['close'] + r * 1.8, cur['close'] + r * 3], confidence=0.74, reason="Three white soldiers")
    # Three black crows
    crows = all(isRed(x)  and  body(x) > range(x) * 0.6 for x in s)  and  s[1]['close'] < s[0]['close']  and  s[2]['close'] < s[1]['close']  and  s[1]['open'] < s[0]['open']  and  s[2]['open'] < s[1]['open']
    if crows:
        sl = s[0]['high'] + 0.3 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1, cur['close'] - r * 1.8, cur['close'] - r * 3], confidence=0.74, reason="Three black crows")
    return make_signal(reason="No three-candle pattern")
