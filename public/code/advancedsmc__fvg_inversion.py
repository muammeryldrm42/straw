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
def fvgInversion(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    for k in range(i - 2, (i - 10  and  k >= 2)-1, -1):
        # bullish FVG: c[k-2].high < c[k].low
        if c[k - 2]['high'] < c[k]['low']:
            top = c[k]['low']
            bot = c[k - 2]['high']
            # fiyat aşağı kırıp FVG'yi geçti -> inversion -> şimdi direnç -> short retest
            broke = any(x['close'] < bot for x in c[k + 1: i])
            if broke  and  c[i]['high'] >= bot  and  c[i]['high'] <= top  and  c[i]['close'] < c[i]['open']:
                return mkA(c, i, "short", top + a[i], [c[i]['close'] - (top - c[i]['close']) * 2], 0.7, "Bullish FVG inverted to resistance")
        if c[k - 2]['low'] > c[k]['high']:
            bot = c[k]['high']
            top = c[k - 2]['low']
            broke = any(x['close'] > top for x in c[k + 1: i])
            if broke  and  c[i]['low'] <= top  and  c[i]['low'] >= bot  and  c[i]['close'] > c[i]['open']:
                return mkA(c, i, "long", bot - a[i], [c[i]['close'] + (c[i]['close'] - bot) * 2], 0.7, "Bearish FVG inverted to support")
    return make_signal(reason="No FVG inversion")
