from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def momentumBurst(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    move = abs(cur['close'] - cur['open'])
    if move < a[i] * 2:
        return make_signal(reason="Insufficient momentum")
    vols = [x['volume'] for x in c]
    avgV = sma(vols, 20)[i]
    if cur['volume'] < avgV * 1.5:
        return make_signal(reason="Volume not confirmed")
    # Yön: yeşil mum = long, kırmızı = short
    if cur['close'] > cur['open']:
        sl = cur['low'] - 0.3 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1, cur['close'] + r * 1.8, cur['close'] + r * 3], confidence=0.72, reason=f"Momentum burst up ({(move/a[i])}x ATR)")
    else:
        sl = cur['high'] + 0.3 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1, cur['close'] - r * 1.8, cur['close'] - r * 3], confidence=0.72, reason=f"Momentum burst down ({(move/a[i])}x ATR)")
