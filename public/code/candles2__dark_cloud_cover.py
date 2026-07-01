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
def darkCloudCover(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    cur = c[i]
    prev = c[i - 1]
    a = atr(c, 14)
    closes = [x['close'] for x in c]
    rs = rsi(closes, 14)
    # Dark cloud: büyük yeşil + sonraki kırmızı prev'in tepesinin üstünde açılıp ortasının altında kapanır
    midPrev = (prev['open'] + prev['close']) / 2
    darkCloud = isGreen(prev)  and  body(prev) > range(prev) * 0.5  and  isRed(cur)  and  cur['open'] > prev['high']  and  cur['close'] < midPrev  and  cur['close'] > prev['open']
    if darkCloud  and  rs[i] > 55:
        sl = cur['high'] + 0.3 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.72, reason="Dark cloud cover (bearish)")
    return make_signal(reason="No dark cloud cover")
