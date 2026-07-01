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
def turtleSoup(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    cur = c[i]
    win = c[i - 20: i]
    hi20 = max([x['high'] for x in win])
    lo20 = min([x['low'] for x in win])
    # 20-bar low'un altına kırıp aynı mumda geri kapanır = turtle soup long
    if cur['low'] < lo20  and  cur['close'] > lo20  and  cur['close'] > cur['open']:
        return mkA(c, i, "long", cur['low'] - a[i] * 0.5, [hi20 * 0.5 + cur['close'] * 0.5, hi20], 0.71, "Turtle Soup: failed 20-bar low breakout")
    if cur['high'] > hi20  and  cur['close'] < hi20  and  cur['close'] < cur['open']:
        return mkA(c, i, "short", cur['high'] + a[i] * 0.5, [lo20 * 0.5 + cur['close'] * 0.5, lo20], 0.71, "Turtle Soup: failed 20-bar high breakout")
    return make_signal(reason="No turtle soup setup")
