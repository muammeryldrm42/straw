from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def eqSweep(c):
    if len(c) < 50:
        return make_signal(reason="Insufficient data")
    a = atr(c, 14)
    tol = a[len(a) - 1] * 0.15
    rh = [v for v in swingHighs(c, 5) if v != None][-10:]
    rl = [v for v in swingLows(c, 5) if v != None][-10:]
    eqh = None
    eql = None
    for i in range(0, len(rh) - 1):
        for j in range(i + 1, len(rh)):
            if abs(rh[i] - rh[j]) <= tol:
                eqh = max(rh[i], rh[j])
    for i in range(0, len(rl) - 1):
        for j in range(i + 1, len(rl)):
            if abs(rl[i] - rl[j]) <= tol:
                eql = min(rl[i], rl[j])
    cur = c[len(c) - 1]
    prev = c[len(c) - 2]
    if eql != None  and  prev['low'] < eql  and  prev['close'] > eql  and  cur['close'] > cur['open']:
        slv = prev['low'] - 0.3 * a[len(a) - 1]
        r = cur['close'] - slv
        return make_signal(signal="long", entry=cur['close'], stop_loss=slv, take_profit=[cur['close'] + r * 2, cur['close'] + r * 3, cur['close'] + r * 5], confidence=0.76, reason=f"EQL sweep @ {eql}")
    if eqh != None  and  prev['high'] > eqh  and  prev['close'] < eqh  and  cur['close'] < cur['open']:
        slv = prev['high'] + 0.3 * a[len(a) - 1]
        r = slv - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=slv, take_profit=[cur['close'] - r * 2, cur['close'] - r * 3, cur['close'] - r * 5], confidence=0.76, reason=f"EQH sweep @ {eqh}")
    return make_signal(reason="EQH/EQL sweep yok")
