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
def harami(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    cur = c[i]
    prev = c[i - 1]
    a = atr(c, 14)
    closes = [x['close'] for x in c]
    rs = rsi(closes, 14)
    # Bullish harami: büyük kırmızı + içine sığan küçük yeşil
    bullHarami = isRed(prev)  and  body(prev) > range(prev) * 0.6  and  isGreen(cur)  and  cur['high'] < prev['open']  and  cur['low'] > prev['close']  and  body(cur) < body(prev) * 0.6
    bearHarami = isGreen(prev)  and  body(prev) > range(prev) * 0.6  and  isRed(cur)  and  cur['high'] < prev['close']  and  cur['low'] > prev['open']  and  body(cur) < body(prev) * 0.6
    if bullHarami  and  rs[i] < 45:
        sl = prev['low'] - 0.3 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.7, reason="Bullish harami reversal")
    if bearHarami  and  rs[i] > 55:
        sl = prev['high'] + 0.3 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.7, reason="Bearish harami reversal")
    return make_signal(reason="No harami")
