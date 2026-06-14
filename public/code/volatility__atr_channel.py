from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def atrChannel(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    mid = ema(closes, 20)
    a = atr(c, 14)
    i = len(c) - 1
    cur = c[i]
    prev = c[i - 1]
    upper = mid[i] + 2 * a[i]
    lower = mid[i] - 2 * a[i]
    upperPrev = mid[i - 1] + 2 * a[i - 1]
    lowerPrev = mid[i - 1] - 2 * a[i - 1]
    if cur['close'] > upper  and  prev['close'] <= upperPrev:
        sl = mid[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1, cur['close'] + r * 2, cur['close'] + r * 3], confidence=0.71, reason="ATR channel breakout up")
    if cur['close'] < lower  and  prev['close'] >= lowerPrev:
        sl = mid[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1, cur['close'] - r * 2, cur['close'] - r * 3], confidence=0.71, reason="ATR channel breakdown down")
    return make_signal(reason="Inside ATR channel")
