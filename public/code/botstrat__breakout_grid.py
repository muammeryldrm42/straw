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
def breakoutGrid(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    cur = c[i]
    win = c[i - 20: i]
    hi = max([x['high'] for x in win])
    lo = min([x['low'] for x in win])
    step = (hi - lo) / 4
    # Üst grid çizgisini kırınca trend yönünde ekle
    if cur['close'] > hi  and  c[i - 1]['close'] <= hi:
        return mk(c, i, "long", a, 0.7, "Breakout grid: new upper level broken", 2, [2, 3.5, 5])
    if cur['close'] < lo  and  c[i - 1]['close'] >= lo:
        return mk(c, i, "short", a, 0.7, "Breakout grid: new lower level broken", 2, [2, 3.5, 5])
    return make_signal(reason="No grid breakout")
