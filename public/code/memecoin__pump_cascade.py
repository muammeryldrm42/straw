from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def pumpCascade(c):
    if len(c) < 20:
        return make_signal(reason="Insufficient data")
    last7 = c[-7:]
    greens = [x for x in last7 if x['close'] > x['open']].length
    if greens < 5:
        return make_signal(reason=f"No cascade ({greens}/7 green)")
    # Mum boyları artıyor mu?
    sizes = [abs(x['close'] - x['open']) for x in last7]
    firstHalf = sum(b for b in sizes[0: 3]) / 3
    secondHalf = sum(b for b in sizes[-3:]) / 3
    if secondHalf < firstHalf * 1.1:
        return make_signal(reason="Momentum weakening")
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    # Geç giriş riski - hızlı SL, kademeli TP
    sl = cur['close'] - a[i] * 1.5
    r = cur['close'] - sl
    return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1, cur['close'] + r * 2, cur['close'] + r * 3.5], confidence=0.65, reason=f"🚀 Pump cascade {greens}/7 green, momentum rising")
