from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def powerOf3(c):
    if len(c) < 60:
        return make_signal(reason="Insufficient data")
    # Son 24 mumu 3 faza böl: 8 mum accumulation, 8 mum manipulation, mevcut distribution başlangıcı
    accum = c[-24: -16]
    manip = c[-16: -8]
    cur = c[len(c) - 1]
    a = atr(c, 14)
    ai = len(a) - 1
    # Accumulation: dar range
    accH = max([x['high'] for x in accum])
    accL = min([x['low'] for x in accum])
    accRange = accH - accL
    if accRange > a[ai] * 4:
        return make_signal(reason="No accumulation phase (range too wide)")
    # Manipulation: range dışına wick at ama kapatma
    manipBelowAcc = any(x['low'] < accL  and  x['close'] > accL for x in manip)
    manipAboveAcc = any(x['high'] > accH  and  x['close'] < accH for x in manip)
    # Bullish PO3: manip aşağıya wick → distribution yukarı
    if manipBelowAcc  and  cur['close'] > accH  and  cur['close'] > cur['open']:
        slv = min([x['low'] for x in manip]) - 0.3 * a[ai]
        r = cur['close'] - slv
        return make_signal(signal="long", entry=cur['close'], stop_loss=slv, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.81, reason="PO3: Accum + downside manip + upside distribution")
    # Bearish PO3
    if manipAboveAcc  and  cur['close'] < accL  and  cur['close'] < cur['open']:
        slv = max([x['high'] for x in manip]) + 0.3 * a[ai]
        r = slv - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=slv, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.81, reason="PO3: Accum + upside manip + downside distribution")
    return make_signal(reason="PO3 setup incomplete")
