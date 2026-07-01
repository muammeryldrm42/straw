from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def bollingerBandwidth(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    bb = bollingerBands(closes, 20, 2)
    bw = lambda idx: (((bb['upper'][idx] - bb['lower'][idx]) / bb['middle'][idx] if bb['middle'][idx] else 0))
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    bwNow = bw(i)
    # Son 20 mumun en düşük bandwidth'i (squeeze) sonrası genişleme
    minBw = float('inf')
    for k in range(i - 20, i):
        minBw = min(minBw, bw(k))
    wasSqueeze = bw(i - 1) <= minBw * 1.05
    if wasSqueeze  and  bwNow > bw(i - 1):
        if cur['close'] > bb['upper'][i - 1]:
            sl = bb['middle'][i]
            r = cur['close'] - sl
            return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.73, reason="BB bandwidth expanding up (post-squeeze)")
        if cur['close'] < bb['lower'][i - 1]:
            sl = bb['middle'][i]
            r = sl - cur['close']
            return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.73, reason="BB bandwidth expanding down (post-squeeze)")
    return make_signal(reason="No bandwidth expansion")
