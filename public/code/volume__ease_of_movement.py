from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def easeOfMovement(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    eom = [0]
    for k in range(1, len(c)):
        dm = (c[k]['high'] + c[k]['low']) / 2 - (c[k - 1]['high'] + c[k - 1]['low']) / 2
        boxRatio = c[k]['volume'] / 1e6 / ((c[k]['high'] - c[k]['low'])  or  1e-9)
        eom.append((0 if boxRatio == 0 else dm / boxRatio))
    eomSma = sma(eom, 14)
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    if eomSma[i - 1] <= 0  and  eomSma[i] > 0:
        sl = cur['close'] - 2 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.68, reason="Ease of Movement turned positive")
    if eomSma[i - 1] >= 0  and  eomSma[i] < 0:
        sl = cur['close'] + 2 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.68, reason="Ease of Movement turned negative")
    return make_signal(reason="EOM neutral")
