from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mk(c, i, side, a, conf, reason, slM=2, tpM=[1.5, 2.5, 4]):
    cur = c[i]
    if side == "long":
        sl = cur['close'] - slM * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * m for m in tpM], confidence=conf, reason=reason)
    sl = cur['close'] + slM * a[i]
    r = sl - cur['close']
    return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * m for m in tpM], confidence=conf, reason=reason)
def antiMartingale(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    i = len(c) - 1
    a = atr(c, 14)
    e = ema(closes, 21)
    up3 = closes[i] > closes[i - 1]  and  closes[i - 1] > closes[i - 2]  and  closes[i - 2] > closes[i - 3]
    # Trend yönünde 3 ardışık yükseliş + EMA üstü = piramitleme
    if closes[i] > e[i]  and  up3  and  e[i] > e[i - 3]:
        return mk(c, i, "long", a, 0.7, "Anti-Martingale: pyramid into uptrend strength", 2, [1.5, 3, 5])
    dn3 = closes[i] < closes[i - 1]  and  closes[i - 1] < closes[i - 2]  and  closes[i - 2] < closes[i - 3]
    if closes[i] < e[i]  and  dn3  and  e[i] < e[i - 3]:
        return mk(c, i, "short", a, 0.7, "Anti-Martingale: pyramid into downtrend strength", 2, [1.5, 3, 5])
    return make_signal(reason="No pyramiding trigger")
