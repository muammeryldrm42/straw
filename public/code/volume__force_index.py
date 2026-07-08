from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def forceIndex(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    fi = [0]
    for k in range(1, len(c)):
        fi.append((c[k]['close'] - c[k - 1]['close']) * c[k]['volume'])
    fiEma = ema(fi, 13)
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    if fiEma[i - 1] <= 0  and  fiEma[i] > 0:
        sl = cur['close'] - 2 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.69, reason="Force Index turned positive")
    if fiEma[i - 1] >= 0  and  fiEma[i] < 0:
        sl = cur['close'] + 2 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.69, reason="Force Index turned negative")
    return make_signal(reason="No Force Index cross")
