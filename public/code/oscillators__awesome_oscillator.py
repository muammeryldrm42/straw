from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def awesomeOscillator(c):
    if len(c) < 45:
        return make_signal(reason="Insufficient data")
    median = [(x['high'] + x['low']) / 2 for x in c]
    ao = [v - sma(median, 34)[i] for i, v in enumerate(sma(median, 5))]
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    if ao[i - 1] <= 0  and  ao[i] > 0:
        sl = cur['close'] - 2 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.7, reason="Awesome Oscillator zero cross up")
    if ao[i - 1] >= 0  and  ao[i] < 0:
        sl = cur['close'] + 2 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.7, reason="Awesome Oscillator zero cross down")
    return make_signal(reason="No AO zero cross")
