from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def pivots(c, lb=5):
    sh = swingHighs(c, lb)
    sl = swingLows(c, lb)
    highs = []
    lows = []
    for i in range(0, len(c)):
        if sh[i] != None:
            highs.append({'idx': i, 'price': sh[i]})
        if sl[i] != None:
            lows.append({'idx': i, 'price': sl[i]})
    return {'highs': highs, 'lows': lows}
def bullFlag(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    a = atr(c, 14)
    i = len(c) - 1
    cur = c[i]
    # Pole: son 20-10 mum arası güçlü yükseliş
    poleStart = c[i - 20]
    poleEnd = c[i - 8]
    poleGain = (poleEnd['close'] - poleStart['close']) / poleStart['close']
    if poleGain < 0.05:
        return make_signal(reason="No strong pole")
    # Flag: son 8 mum dar konsolidasyon (hafif aşağı/yatay)
    flag = c[-8:]
    flagH = max([x['high'] for x in flag])
    flagL = min([x['low'] for x in flag])
    if (flagH - flagL) > a[i] * 4:
        return make_signal(reason="Flag too wide")
    # Kırılım: flag üstüne çıkış
    if cur['close'] > flagH * 0.999  and  cur['close'] > cur['open']:
        sl = flagL
        height = poleEnd['close'] - poleStart['close']
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + height * 0.5, cur['close'] + height, cur['close'] + height * 1.5], confidence=0.74, reason="Bull flag breakout")
    return make_signal(reason="Bull flag forming")
