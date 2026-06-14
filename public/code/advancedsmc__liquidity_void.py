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
def liquidityVoid(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    # Geniş gövdeli mum sonrası boşluk: c[i-2].high < c[i].low (bullish void)
    for k in range(i - 1, (i - 8  and  k >= 2)-1, -1):
        if c[k - 2]['high'] < c[k]['low']:
            # bullish void
            voidMid = (c[k - 2]['high'] + c[k]['low']) / 2
            if c[i]['low'] <= voidMid  and  c[i]['close'] > c[i]['open']:
                return mkA(c, i, "long", c[k - 2]['high'] - a[i], [c[i]['close'] + (c[i]['close'] - c[k - 2]['high']), c[k]['high']], 0.71, "Bullish liquidity void fill")
        if c[k - 2]['low'] > c[k]['high']:
            # bearish void
            voidMid = (c[k - 2]['low'] + c[k]['high']) / 2
            if c[i]['high'] >= voidMid  and  c[i]['close'] < c[i]['open']:
                return mkA(c, i, "short", c[k - 2]['low'] + a[i], [c[i]['close'] - (c[k - 2]['low'] - c[i]['close']), c[k]['low']], 0.71, "Bearish liquidity void fill")
    return make_signal(reason="No liquidity void")
