from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def roc(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    p = 12
    closes = [x['close'] for x in c]
    rocAt = lambda idx: ((closes[idx] - closes[idx - p]) / closes[idx - p]) * 100
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    now = rocAt(i)
    prev = rocAt(i - 1)
    e = ema(closes, 50)
    if prev <= 0  and  now > 0  and  cur['close'] > e[i]:
        sl = cur['close'] - 2 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.69, reason="ROC crossed above zero + uptrend")
    if prev >= 0  and  now < 0  and  cur['close'] < e[i]:
        sl = cur['close'] + 2 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.69, reason="ROC crossed below zero + downtrend")
    return make_signal(reason=f"ROC {now}%")
