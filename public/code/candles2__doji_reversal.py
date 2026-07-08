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
def dojiReversal(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    cur = c[i]
    prev = c[i - 1]
    a = atr(c, 14)
    closes = [x['close'] for x in c]
    rs = rsi(closes, 14)
    rng = range(cur)
    if rng == 0:
        return make_signal(reason="Zero range")
    # Doji: gövde range'in %10'undan küçük
    isDoji = body(cur) < rng * 0.1
    if not isDoji:
        return make_signal(reason="Not a doji")
    # Oversold doji -> long beklentisi (teyit: sonraki mum yok, doji'nin konumu)
    if rs[i] < 35:
        sl = cur['low'] - 0.5 * a[i]
        r = cur['close'] - sl
        if r > 0:
            return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.66, reason=f"Doji at oversold (RSI {rs[i]})")
    if rs[i] > 65:
        sl = cur['high'] + 0.5 * a[i]
        r = sl - cur['close']
        if r > 0:
            return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.66, reason=f"Doji at overbought (RSI {rs[i]})")
    return make_signal(reason="Doji in mid-range (no edge)")
