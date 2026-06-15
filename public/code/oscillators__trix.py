from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def trix(c):
    if len(c) < 60:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    e1 = ema(closes, 15)
    e2 = ema(e1, 15)
    e3 = ema(e2, 15)
    trixLine = [((((v - e3[i - 1]) / e3[i - 1]) * 100 if i > 0  and  e3[i - 1] else 0)) for i, v in enumerate(e3)]
    sig = ema(trixLine, 9)
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    if trixLine[i - 1] <= sig[i - 1]  and  trixLine[i] > sig[i]:
        sl = cur['close'] - 2 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.7, reason="TRIX bullish signal cross")
    if trixLine[i - 1] >= sig[i - 1]  and  trixLine[i] < sig[i]:
        sl = cur['close'] + 2 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.7, reason="TRIX bearish signal cross")
    return make_signal(reason="No TRIX cross")
