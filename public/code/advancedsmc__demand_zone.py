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
def demandZone(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    for k in range(i - 3, (i - 14  and  k >= 2)-1, -1):
        rise = c[k + 1]['close'] - c[k]['close']
        if rise > a[i] * 1.5:
            bot = min(c[k]['low'], c[k - 1]['low'])
            top = max(c[k]['open'], c[k]['close'])
            if c[i]['low'] <= top  and  c[i]['low'] >= bot  and  c[i]['close'] > c[i]['open']:
                return mkA(c, i, "long", bot - a[i] * 0.5, [c[i]['close'] + (top - bot) * 2, c[i]['close'] + (top - bot) * 4], 0.71, "Demand zone retest bounce")
    return make_signal(reason="No demand zone retest")
