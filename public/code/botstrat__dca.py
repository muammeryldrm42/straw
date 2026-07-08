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
def dca(c):
    if len(c) < 60:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    i = len(c) - 1
    a = atr(c, 14)
    trend = sma(closes, 50)
    r = rsi(closes, 14)
    # Genel yükseliş + pullback (RSI < 45) = DCA giriş noktası
    if closes[i] > trend[i]  and  r[i] < 45  and  closes[i] < closes[i - 3]:
        return mk(c, i, "long", a, 0.7, "DCA buy: dip within uptrend", 3, [1.5, 3, 5])
    return make_signal(reason="No DCA entry (not a dip in uptrend)")
