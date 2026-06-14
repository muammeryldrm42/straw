from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def openingRangeBreakout(c):
    if len(c) < 70:
        return make_signal(reason="Insufficient data")
    # Son 60 mumun ilk 15'i = "opening range"
    window = c[-60:]
    orCandles = window[0: 15]
    orH = max([x['high'] for x in orCandles])
    orL = min([x['low'] for x in orCandles])
    i = len(c) - 1
    cur = c[i]
    prev = c[i - 1]
    a = atr(c, 14)
    vols = [x['volume'] for x in c]
    avgV = sma(vols, 20)[i]
    volOk = cur['volume'] > avgV * 1.2
    # Kırılım son birkaç mumda gerçekleşmeli (taze)
    if cur['close'] > orH  and  prev['close'] <= orH  and  volOk:
        sl = orL
        r = cur['close'] - (orH + orL) / 2
        return make_signal(signal="long", entry=cur['close'], stop_loss=orH - (orH - orL) * 0.5, take_profit=[cur['close'] + r * 1, cur['close'] + r * 2, cur['close'] + r * 3], confidence=0.72, reason="Opening range breakout UP + volume")
    if cur['close'] < orL  and  prev['close'] >= orL  and  volOk:
        r = (orH + orL) / 2 - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=orL + (orH - orL) * 0.5, take_profit=[cur['close'] - r * 1, cur['close'] - r * 2, cur['close'] - r * 3], confidence=0.72, reason="Opening range breakdown DOWN + volume")
    return make_signal(reason="No opening range breakout")
