from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def adLine(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    ad = []
    cum = 0
    for k in range(0, len(c)):
        rng = c[k]['high'] - c[k]['low']
        mfm = (0 if rng == 0 else ((c[k]['close'] - c[k]['low']) - (c[k]['high'] - c[k]['close'])) / rng)
        cum += mfm * c[k]['volume']
        ad.append(cum)
    adEma = ema(ad, 21)
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    if ad[i - 1] <= adEma[i - 1]  and  ad[i] > adEma[i]:
        sl = cur['close'] - 2 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.7, reason="A/D line turned up (accumulation)")
    if ad[i - 1] >= adEma[i - 1]  and  ad[i] < adEma[i]:
        sl = cur['close'] + 2 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.7, reason="A/D line turned down (distribution)")
    return make_signal(reason="No A/D cross")
