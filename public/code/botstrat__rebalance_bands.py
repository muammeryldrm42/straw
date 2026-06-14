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
def rebalanceBands(c):
    if len(c) < 60:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    i = len(c) - 1
    a = atr(c, 14)
    anchor = sma(closes, 50)[i]
    # hedef "değer" ortalaması
    drift = (closes[i] - anchor) / anchor
    # Fiyat hedefin %8 altına düşünce al (underweight), %8 üstüne çıkınca sat (overweight)
    if drift <= -0.08:
        return mk(c, i, "long", a, 0.68, f"Rebalance: underweight ({(drift * 100)}% below anchor)", 3, [1.5, 3, 5])
    if drift >= 0.08:
        return mk(c, i, "short", a, 0.68, f"Rebalance: overweight ({(drift * 100)}% above anchor)", 3, [1.5, 3, 5])
    return make_signal(reason=f"Within rebalance band ({(drift * 100)}%)")
