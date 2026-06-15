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
def meanReversionGrid(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    i = len(c) - 1
    a = atr(c, 14)
    ma = sma(closes, 20)
    win = closes[i - 20: i + 1]
    mean = sum(y for y in win) / 21
    sd = math.sqrt(sum((v - mean) ** 2 for v in win) / 21)
    dev = ((closes[i] - ma[i]) / sd if sd else 0)
    # Ortalamadan -1.5σ/-2.5σ gridlerde long, +tarafta short (range piyasası)
    if dev <= -1.5  and  dev > -3:
        return mk(c, i, "long", a, 0.7, f"Mean-reversion grid long ({dev}σ below mean)", 2, [1, 2, 3])
    if dev >= 1.5  and  dev < 3:
        return mk(c, i, "short", a, 0.7, f"Mean-reversion grid short ({dev}σ above mean)", 2, [1, 2, 3])
    return make_signal(reason=f"Within grid ({dev}σ)")
