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
def orderFlowImbalance(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    # 3 ardışık güçlü tek-yön mum (delta proxy: gövde/range + hacim)
    last3 = c[i - 2: i + 1]
    allGreen = all(x['close'] > x['open']  and  abs(x['close'] - x['open']) > (x['high'] - x['low']) * 0.6 for x in last3)
    allRed = all(x['close'] < x['open']  and  abs(x['close'] - x['open']) > (x['high'] - x['low']) * 0.6 for x in last3)
    avgV = sum(x['volume'] for x in c[i - 20: i]) / 20
    volRising = all(x['volume'] > avgV for x in last3)
    if allGreen  and  volRising:
        return mkA(c, i, "long", min([x['low'] for x in last3]) - a[i] * 0.5, [c[i]['close'] + a[i] * 2, c[i]['close'] + a[i] * 3.5], 0.7, "Bullish order-flow imbalance (3 strong green + volume)")
    if allRed  and  volRising:
        return mkA(c, i, "short", max([x['high'] for x in last3]) + a[i] * 0.5, [c[i]['close'] - a[i] * 2, c[i]['close'] - a[i] * 3.5], 0.7, "Bearish order-flow imbalance (3 strong red + volume)")
    return make_signal(reason="Balanced order flow")
