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
def starPattern(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    c1 = c[i - 2]
    c2 = c[i - 1]
    c3 = c[i]
    a = atr(c, 14)
    r1 = range(c1)
    r3 = range(c3)
    # Morning star: büyük kırmızı + küçük gövde (yıldız) + büyük yeşil (1. mumun ortasını geçen)
    morningStar = isRed(c1)  and  body(c1) > r1 * 0.5  and  body(c2) < range(c2) * 0.4  and  isGreen(c3)  and  body(c3) > r3 * 0.5  and  c3['close'] > (c1['open'] + c1['close']) / 2
    if morningStar:
        sl = min(c2['low'], c3['low']) - 0.3 * a[i]
        r = c3['close'] - sl
        return make_signal(signal="long", entry=c3['close'], stop_loss=sl, take_profit=[c3['close'] + r * 1.5, c3['close'] + r * 2.5, c3['close'] + r * 4], confidence=0.76, reason="Morning star reversal")
    # Evening star: büyük yeşil + küçük gövde + büyük kırmızı
    eveningStar = isGreen(c1)  and  body(c1) > r1 * 0.5  and  body(c2) < range(c2) * 0.4  and  isRed(c3)  and  body(c3) > r3 * 0.5  and  c3['close'] < (c1['open'] + c1['close']) / 2
    if eveningStar:
        sl = max(c2['high'], c3['high']) + 0.3 * a[i]
        r = sl - c3['close']
        return make_signal(signal="short", entry=c3['close'], stop_loss=sl, take_profit=[c3['close'] - r * 1.5, c3['close'] - r * 2.5, c3['close'] - r * 4], confidence=0.76, reason="Evening star reversal")
    return make_signal(reason="No star pattern")
