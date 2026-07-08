from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def body(c):
    return abs(c['close'] - c['open'])
def range(c):
    return c['high'] - c['low']
def isGreen(c):
    return c['close'] > c['open']
def isRed(c):
    return c['close'] < c['open']
def marubozu(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    rng = range(cur)
    if rng < a[i] * 1.2:
        return make_signal(reason="Candle too small")
    upWick = cur['high'] - max(cur['open'], cur['close'])
    dnWick = min(cur['open'], cur['close']) - cur['low']
    # Marubozu: fitiller range'in %5'inden küçük
    noWicks = upWick < rng * 0.05  and  dnWick < rng * 0.05
    if not noWicks:
        return make_signal(reason="Not a marubozu (has wicks)")
    if isGreen(cur):
        sl = cur['low'] - 0.3 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1, cur['close'] + r * 1.8, cur['close'] + r * 3], confidence=0.7, reason="Bullish marubozu (full-body momentum)")
    sl = cur['high'] + 0.3 * a[i]
    r = sl - cur['close']
    return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1, cur['close'] - r * 1.8, cur['close'] - r * 3], confidence=0.7, reason="Bearish marubozu (full-body momentum)")
