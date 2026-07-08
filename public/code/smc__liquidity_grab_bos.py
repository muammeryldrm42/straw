from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def liquidityGrabBos(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    sh = [v for v in swingHighs(c, 10) if v != None]
    sl = [v for v in swingLows(c, 10) if v != None]
    if len(sh) < 2  or  len(sl) < 2:
        return make_signal(reason="No clean structure")
    a = atr(c, 14)
    cur = c[len(c) - 1]
    prev = c[len(c) - 2]
    lastH = sh[len(sh) - 1]
    lastL = sl[len(sl) - 1]
    if prev['low'] < lastL  and  prev['close'] > lastL  and  cur['close'] > lastH:
        slv = prev['low'] - 0.3 * a[len(a) - 1]
        r = cur['close'] - slv
        return make_signal(signal="long", entry=cur['close'], stop_loss=slv, take_profit=[cur['close'] + r * 2, cur['close'] + r * 3, cur['close'] + r * 5], confidence=0.82, reason="Liquidity grab + BOS up")
    if prev['high'] > lastH  and  prev['close'] < lastH  and  cur['close'] < lastL:
        slv = prev['high'] + 0.3 * a[len(a) - 1]
        r = slv - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=slv, take_profit=[cur['close'] - r * 2, cur['close'] - r * 3, cur['close'] - r * 5], confidence=0.82, reason="Liquidity grab + BOS down")
    return make_signal(reason="LG+BOS kurulumu yok")
