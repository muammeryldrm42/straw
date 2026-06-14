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
def cpr(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    _d = prevHLC(c)
    high = _d['high']
    low = _d['low']
    close = _d['close']
    pp = (high + low + close) / 3
    bc = (high + low) / 2
    tc = 2 * pp - bc
    top = max(tc, bc)
    bot = min(tc, bc)
    i = len(c) - 1
    cur = c[i]
    prev = c[i - 1]
    a = atr(c, 14)
    # CPR üstüne kırılım = bullish gün
    if cur['close'] > top  and  prev['close'] <= top:
        return mkP(c, i, "long", bot, [top + (top - bot) * 2, top + (top - bot) * 4], 0.7, "Price broke above CPR (bullish)")
    if cur['close'] < bot  and  prev['close'] >= bot:
        return mkP(c, i, "short", top, [bot - (top - bot) * 2, bot - (top - bot) * 4], 0.7, "Price broke below CPR (bearish)")
    return make_signal(reason="Inside CPR")
