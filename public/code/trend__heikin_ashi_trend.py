from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def heikinAshiTrend(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    # Heikin Ashi hesapla
    ha = []
    for k in range(0, len(c)):
        haClose = (c[k]['open'] + c[k]['high'] + c[k]['low'] + c[k]['close']) / 4
        haOpen = ((c[k]['open'] + c[k]['close']) / 2 if k == 0 else (ha[k - 1]['open'] + ha[k - 1]['close']) / 2)
        haHigh = max(c[k]['high'], haOpen, haClose)
        haLow = min(c[k]['low'], haOpen, haClose)
        ha.append({'open': haOpen, 'high': haHigh, 'low': haLow, 'close': haClose})
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    last3 = ha[-3:]
    allGreen = all(x['close'] > x['open'] for x in last3)
    allRed = all(x['close'] < x['open'] for x in last3)
    # Önceki mum kırmızı -> dönüş yakalamak için ilk yeşil 3'lü tercih edilir
    flippedToGreen = ha[i - 3]  and  ha[i - 3]['close'] < ha[i - 3]['open']  and  allGreen
    flippedToRed = ha[i - 3]  and  ha[i - 3]['close'] > ha[i - 3]['open']  and  allRed
    # Gövde gücü: alt fitil yok (long) = güçlü trend
    curHa = ha[i]
    strongBull = curHa['close'] > curHa['open']  and  (curHa['open'] - curHa['low']) < (curHa['high'] - curHa['low']) * 0.15
    strongBear = curHa['close'] < curHa['open']  and  (curHa['high'] - curHa['open']) < (curHa['high'] - curHa['low']) * 0.15
    if allGreen  and  strongBull:
        sl = cur['close'] - 2 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=(0.75 if flippedToGreen else 0.7), reason=("Heikin Ashi flip to strong bull" if flippedToGreen else "Heikin Ashi strong bull trend"))
    if allRed  and  strongBear:
        sl = cur['close'] + 2 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=(0.75 if flippedToRed else 0.7), reason=("Heikin Ashi flip to strong bear" if flippedToRed else "Heikin Ashi strong bear trend"))
    return make_signal(reason="Heikin Ashi no strong trend")
