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
def mitigationBlock(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    for k in range(i - 2, (i - 12  and  k >= 1)-1, -1):
        impulse = c[k + 1]['close'] - c[k + 1]['open']
        if c[k]['close'] < c[k]['open']  and  impulse > a[i] * 1.2:
            # bullish mitigation block (down candle before up impulse)
            top = c[k]['high']
            bot = c[k]['low']
            if c[i]['low'] <= top  and  c[i]['low'] >= bot  and  c[i]['close'] > c[i]['open']:
                return mkA(c, i, "long", bot - a[i] * 0.5, [c[i]['close'] + (top - bot) * 2, c[i]['close'] + (top - bot) * 3], 0.71, "Bullish mitigation block retest")
        if c[k]['close'] > c[k]['open']  and  impulse < -a[i] * 1.2:
            top = c[k]['high']
            bot = c[k]['low']
            if c[i]['high'] >= bot  and  c[i]['high'] <= top  and  c[i]['close'] < c[i]['open']:
                return mkA(c, i, "short", top + a[i] * 0.5, [c[i]['close'] - (top - bot) * 2, c[i]['close'] - (top - bot) * 3], 0.71, "Bearish mitigation block retest")
    return make_signal(reason="No mitigation block")
