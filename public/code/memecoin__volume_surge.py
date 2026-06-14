from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def volumeSurge(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    vols = [x['volume'] for x in c]
    i = len(c) - 1
    cur = c[i]
    avgV = sma(vols[0: -1], 20)[len(vols) - 2]
    mult = cur['volume'] / (avgV  or  1)
    if mult < 3:
        return make_signal(reason=f"Surge yok ({mult}x)")
    if cur['close'] <= cur['open']:
        return make_signal(reason="Volume on red candle — skip")
    a = atr(c, 14)
    sl = cur['close'] - a[i] * 1.5
    r = cur['close'] - sl
    conf = min(0.5 + (mult - 3) * 0.05 + 0.2, 0.95)
    return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 2, cur['close'] + r * 3.5, cur['close'] + r * 5], confidence=conf, reason=f"Volume surge {mult}x, yeşil mum")
