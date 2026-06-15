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
def trailingStop(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    i = len(c) - 1
    a = atr(c, 22)
    highest = max([x['high'] for x in c[i - 22: i + 1]])
    lowest = min([x['low'] for x in c[i - 22: i + 1]])
    longStop = highest - a[i] * 3
    shortStop = lowest + a[i] * 3
    # Fiyat trailing stop'u koruyor + yükseliyor = trend takip girişi
    if closes[i] > longStop  and  closes[i - 1] <= (max([x['high'] for x in c[i - 23: i]]) - a[i - 1] * 3):
        return mk(c, i, "long", a, 0.69, "Trailing-stop bot: long trend follow", 3, [2, 4, 6])
    if closes[i] < shortStop  and  closes[i - 1] >= (min([x['low'] for x in c[i - 23: i]]) + a[i - 1] * 3):
        return mk(c, i, "short", a, 0.69, "Trailing-stop bot: short trend follow", 3, [2, 4, 6])
    return make_signal(reason="Trailing stop holding")
