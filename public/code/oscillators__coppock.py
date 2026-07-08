from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def coppock(c):
    if len(c) < 60:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    rocN = lambda n, idx: ((closes[idx] - closes[idx - n]) / closes[idx - n]) * 100
    raw = []
    for k in range(0, len(closes)):
        if k < 14:
            raw.append(0)
            continue
        raw.append(rocN(11, k) + rocN(14, k))
    # WMA(10) of raw
    def _map_wma(_, idx):
        if idx < 10:
            return 0
        num = 0
        den = 0
        for w in range(0, 10):
            num += raw[idx - w] * (10 - w)
            den += (10 - w)
        return num / den
    wma = [_map_wma(_, idx) for idx, _ in enumerate(raw)]
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    if wma[i - 1] <= 0  and  wma[i] > 0:
        sl = cur['close'] - 2.5 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 2, cur['close'] + r * 3, cur['close'] + r * 5], confidence=0.72, reason="Coppock curve turned up (long-term buy)")
    return make_signal(reason=f"Coppock {wma[i]}")
