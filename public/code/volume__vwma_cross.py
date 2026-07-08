from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def vwmaCross(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    p = 20
    def vwma(end):
        num = 0
        den = 0
        for k in range(end - p + 1, (end)+1):
            num += c[k]['close'] * c[k]['volume']
            den += c[k]['volume']
        return (c[end]['close'] if den == 0 else num / den)
    closes = [x['close'] for x in c]
    smaArr = sma(closes, p)
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    vNow = vwma(i)
    vPrev = vwma(i - 1)
    # VWMA, SMA üstüne çıkarsa = hacim fiyatı destekliyor
    if vPrev <= smaArr[i - 1]  and  vNow > smaArr[i]:
        sl = cur['close'] - 2 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.7, reason="VWMA crossed above SMA (volume-backed)")
    if vPrev >= smaArr[i - 1]  and  vNow < smaArr[i]:
        sl = cur['close'] + 2 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.7, reason="VWMA crossed below SMA (volume-backed)")
    return make_signal(reason="No VWMA/SMA cross")
