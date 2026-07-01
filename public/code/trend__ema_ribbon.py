from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def emaRibbon(c):
    if len(c) < 70:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    e8 = ema(closes, 8)
    e13 = ema(closes, 13)
    e21 = ema(closes, 21)
    e34 = ema(closes, 34)
    e55 = ema(closes, 55)
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    up = e8[i] > e13[i]  and  e13[i] > e21[i]  and  e21[i] > e34[i]  and  e34[i] > e55[i]
    down = e8[i] < e13[i]  and  e13[i] < e21[i]  and  e21[i] < e34[i]  and  e34[i] < e55[i]
    # Yeni hizalanma mı? (önceki mumda tam hizalı değildi)
    upPrev = e8[i-1] > e13[i-1]  and  e13[i-1] > e21[i-1]  and  e21[i-1] > e34[i-1]  and  e34[i-1] > e55[i-1]
    downPrev = e8[i-1] < e13[i-1]  and  e13[i-1] < e21[i-1]  and  e21[i-1] < e34[i-1]  and  e34[i-1] < e55[i-1]
    if up  and  cur['close'] > e8[i]:
        sl = e34[i] - 0.5 * a[i]
        r = cur['close'] - sl
        if r > 0:
            return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=(0.72 if upPrev else 0.78), reason=("EMA ribbon bullish (aligned)" if upPrev else "EMA ribbon NEW bullish alignment"))
    if down  and  cur['close'] < e8[i]:
        sl = e34[i] + 0.5 * a[i]
        r = sl - cur['close']
        if r > 0:
            return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=(0.72 if downPrev else 0.78), reason=("EMA ribbon bearish (aligned)" if downPrev else "EMA ribbon NEW bearish alignment"))
    return make_signal(reason="EMA ribbon not aligned (chop)")
