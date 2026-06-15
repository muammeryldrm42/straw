from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mkA(c, i, side, slPrice, tps, conf, reason):
    cur = c[i]
    if side == "long"  and  cur['close'] - slPrice <= 0:
        return make_signal(reason="Invalid risk")
    if side == "short"  and  slPrice - cur['close'] <= 0:
        return make_signal(reason="Invalid risk")
    return make_signal(signal=side, entry=cur['close'], stop_loss=slPrice, take_profit=tps, confidence=conf, reason=reason)
def rejectionBlock(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    cur = c[i]
    lowerWick = min(cur['open'], cur['close']) - cur['low']
    upperWick = cur['high'] - max(cur['open'], cur['close'])
    bodyS = abs(cur['close'] - cur['open'])
    if lowerWick > bodyS * 2  and  lowerWick > a[i]  and  cur['close'] > cur['open']:
        return mkA(c, i, "long", cur['low'] - a[i] * 0.3, [cur['close'] + lowerWick, cur['close'] + lowerWick * 2], 0.69, "Bullish rejection block (long lower wick)")
    if upperWick > bodyS * 2  and  upperWick > a[i]  and  cur['close'] < cur['open']:
        return mkA(c, i, "short", cur['high'] + a[i] * 0.3, [cur['close'] - upperWick, cur['close'] - upperWick * 2], 0.69, "Bearish rejection block (long upper wick)")
    return make_signal(reason="No rejection block")
