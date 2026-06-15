from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def channelBreakout(c):
    if len(c) < 60:
        return make_signal(reason="Insufficient data")
    sh = swingHighs(c, 5)
    sl = swingLows(c, 5)
    highs = []
    lows = []
    for k in range(len(c) - 50, len(c)):
        if sh[k] != None:
            highs.append(sh[k])
        if sl[k] != None:
            lows.append(sl[k])
    if len(highs) < 2  or  len(lows) < 2:
        return make_signal(reason="No clear channel")
    upper = max(highs)
    lower = min(lows)
    i = len(c) - 1
    cur = c[i]
    prev = c[i - 1]
    a = atr(c, 14)
    vols = [x['volume'] for x in c]
    avgV = sma(vols, 20)[i]
    # Kanal genişliği makul mü (en az 2 ATR)
    if upper - lower < a[i] * 2:
        return make_signal(reason="Channel too tight")
    if cur['close'] > upper  and  prev['close'] <= upper  and  cur['volume'] > avgV * 1.3:
        sl2 = upper - a[i]
        r = cur['close'] - sl2
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl2, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.73, reason="Channel breakout UP + volume")
    if cur['close'] < lower  and  prev['close'] >= lower  and  cur['volume'] > avgV * 1.3:
        sl2 = lower + a[i]
        r = sl2 - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl2, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.73, reason="Channel breakdown DOWN + volume")
    return make_signal(reason="Price inside channel")
