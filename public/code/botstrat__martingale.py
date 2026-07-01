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
def martingale(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    i = len(c) - 1
    a = atr(c, 14)
    r = rsi(closes, 14)
    drop3 = (closes[i] - closes[i - 3]) / closes[i - 3]
    # Keskin düşüş + aşırı satım = martingale ekleme (büyük boyut notu)
    if drop3 < -0.04  and  r[i] < 30:
        return mk(c, i, "long", a, 0.66, "Martingale add after sharp drop (size up — high risk)", 3, [1, 2, 3.5])
    return make_signal(reason="No martingale trigger")
