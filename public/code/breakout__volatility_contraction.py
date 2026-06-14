from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def volatilityContraction(c):
    if len(c) < 60:
        return make_signal(reason="Insufficient data")
    # Son 3 pencerenin range'i giderek daralmalı
    w1 = c[-45: -30]
    w2 = c[-30: -15]
    w3 = c[-15:]
    range = lambda w: max([x['high'] for x in w]) - min([x['low'] for x in w])
    r1 = range(w1)
    r2 = range(w2)
    r3 = range(w3)
    # Contraction: her pencere bir öncekinden dar
    if not (r2 < r1 * 0.85  and  r3 < r2 * 0.85):
        return make_signal(reason="No volatility contraction")
    # Hacim de düşmeli (kuruma)
    v1 = sma([x['volume'] for x in w1], len(w1))[len(w1) - 1]
    v3 = sma([x['volume'] for x in w3], len(w3))[len(w3) - 1]
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    w3H = max([x['high'] for x in w3])
    w3L = min([x['low'] for x in w3])
    vols = [x['volume'] for x in c]
    avgV = sma(vols, 20)[i]
    # Kırılım: son daralma penceresinin üstüne + hacim patlaması
    if cur['close'] > w3H * 0.999  and  cur['volume'] > avgV * 1.5  and  cur['close'] > cur['open']:
        sl = w3L
        r = cur['close'] - sl
        if r > 0:
            return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.77, reason="VCP breakout: contraction + volume surge")
    return make_signal(reason="VCP forming, no breakout yet")
