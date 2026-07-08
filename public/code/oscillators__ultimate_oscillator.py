from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def ultimateOscillator(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    bp = []
    tr = []
    for k in range(1, len(c)):
        lowMin = min(c[k]['low'], c[k - 1]['close'])
        bp.append(c[k]['close'] - lowMin)
        tr.append(max(c[k]['high'], c[k - 1]['close']) - lowMin)
    sum = lambda arr, end, n: sum(b for b in arr[end - n + 1: end + 1])
    j = len(bp) - 1
    avg7 = sum(bp, j, 7) / sum(tr, j, 7)
    avg14 = sum(bp, j, 14) / sum(tr, j, 14)
    avg28 = sum(bp, j, 28) / sum(tr, j, 28)
    uo = (100 * (4 * avg7 + 2 * avg14 + avg28)) / 7
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    if uo < 30:
        sl = cur['low'] - 1.5 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.71, reason=f"Ultimate Oscillator oversold ({uo})")
    if uo > 70:
        sl = cur['high'] + 1.5 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.71, reason=f"Ultimate Oscillator overbought ({uo})")
    return make_signal(reason=f"Ultimate Oscillator {uo}")
