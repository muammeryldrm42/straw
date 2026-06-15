from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def rangeBounce(c):
    if len(c) < 35:
        return make_signal(reason="Insufficient data")
    rng = c[-30:]
    rH = max([x['high'] for x in rng])
    rL = min([x['low'] for x in rng])
    size = rH - rL
    a = atr(c, 14)
    ai = len(a) - 1
    # Dar range olmalı (ATR'nin 6 katından az)
    if size / a[ai] > 6:
        return make_signal(reason="Range too wide (trend exists)")
    cur = c[len(c) - 1]
    prev = c[len(c) - 2]
    tol = size * 0.1
    # Alt sınırdan bounce - long
    if cur['low'] <= rL + tol  and  cur['close'] > cur['open']  and  prev['low'] <= rL + tol * 2:
        sl = rL - 0.5 * a[ai]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[(rH + rL) / 2, rH - tol], confidence=0.68, reason=f"Range lower bounce @ {rL}")
    # Üst sınırdan rejection - short
    if cur['high'] >= rH - tol  and  cur['close'] < cur['open']  and  prev['high'] >= rH - tol * 2:
        sl = rH + 0.5 * a[ai]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[(rH + rL) / 2, rL + tol], confidence=0.68, reason=f"Range upper rejection @ {rH}")
    return make_signal(reason="Not at range edge")
