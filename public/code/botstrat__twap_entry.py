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
def twapEntry(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    i = len(c) - 1
    a = atr(c, 14)
    twap = sum(y for y in closes[i - 20: i + 1]) / 21
    e = ema(closes, 50)
    # Fiyat TWAP altına sarkıp yukarı trendde = kademeli TWAP alımı
    if closes[i] > e[i]  and  closes[i] < twap  and  closes[i] > closes[i - 1]:
        return mk(c, i, "long", a, 0.68, "TWAP entry: below TWAP in uptrend", 2.5, [1.5, 3, 4.5])
    if closes[i] < e[i]  and  closes[i] > twap  and  closes[i] < closes[i - 1]:
        return mk(c, i, "short", a, 0.68, "TWAP entry: above TWAP in downtrend", 2.5, [1.5, 3, 4.5])
    return make_signal(reason="No TWAP entry")
