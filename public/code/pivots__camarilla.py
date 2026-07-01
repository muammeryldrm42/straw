from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mkP(c, i, side, sl, tps, conf, reason):
    cur = c[i]
    if side == "long"  and  cur['close'] - sl <= 0:
        return make_signal(reason="Invalid risk")
    if side == "short"  and  sl - cur['close'] <= 0:
        return make_signal(reason="Invalid risk")
    return make_signal(signal=side, entry=cur['close'], stop_loss=sl, take_profit=tps, confidence=conf, reason=reason)
def prevHLC(c, window=24):
    w = c[-window - 1: -1]
    return {'high': max([x['high'] for x in w]), 'low': min([x['low'] for x in w]), 'close': w[len(w) - 1]['close']}
def camarilla(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    _d = prevHLC(c)
    high = _d['high']
    low = _d['low']
    close = _d['close']
    rng = high - low
    h3 = close + rng * 1.1 / 4
    l3 = close - rng * 1.1 / 4
    h4 = close + rng * 1.1 / 2
    l4 = close - rng * 1.1 / 2
    i = len(c) - 1
    prev = c[i - 1]
    cur = c[i]
    # H3 kırılımı = long breakout, L3 = short
    if cur['close'] > h3  and  prev['close'] <= h3:
        return mkP(c, i, "long", close, [h4, h4 + rng * 0.2], 0.7, "Camarilla H3 breakout")
    if cur['close'] < l3  and  prev['close'] >= l3:
        return mkP(c, i, "short", close, [l4, l4 - rng * 0.2], 0.7, "Camarilla L3 breakdown")
    return make_signal(reason="Between Camarilla levels")
