from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def obvTrend(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    obv = [0]
    for k in range(1, len(c)):
        if c[k]['close'] > c[k - 1]['close']:
            obv.append(obv[k - 1] + c[k]['volume'])
        elif c[k]['close'] < c[k - 1]['close']:
            obv.append(obv[k - 1] - c[k]['volume'])
        else:
            obv.append(obv[k - 1])
    obvEma = ema(obv, 20)
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    closeEma = ema([x['close'] for x in c], 20)
    if obv[i - 1] <= obvEma[i - 1]  and  obv[i] > obvEma[i]  and  cur['close'] > closeEma[i]:
        sl = cur['close'] - 2 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.72, reason="OBV crossed above its EMA + uptrend")
    if obv[i - 1] >= obvEma[i - 1]  and  obv[i] < obvEma[i]  and  cur['close'] < closeEma[i]:
        sl = cur['close'] + 2 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.72, reason="OBV crossed below its EMA + downtrend")
    return make_signal(reason="No OBV cross")
