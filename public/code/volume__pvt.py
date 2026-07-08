from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def pvt(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    pvtArr = [0]
    for k in range(1, len(c)):
        chg = (c[k]['close'] - c[k - 1]['close']) / c[k - 1]['close']
        pvtArr.append(pvtArr[k - 1] + chg * c[k]['volume'])
    pvtEma = ema(pvtArr, 14)
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    if pvtArr[i - 1] <= pvtEma[i - 1]  and  pvtArr[i] > pvtEma[i]:
        sl = cur['close'] - 2 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.69, reason="PVT crossed above its EMA")
    if pvtArr[i - 1] >= pvtEma[i - 1]  and  pvtArr[i] < pvtEma[i]:
        sl = cur['close'] + 2 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.69, reason="PVT crossed below its EMA")
    return make_signal(reason="No PVT cross")
