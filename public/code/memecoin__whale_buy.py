from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def whaleBuy(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    cur = c[i]
    vols = [x['volume'] for x in c]
    avgV = sma(vols, 20)[i]
    mult = cur['volume'] / (avgV  or  1)
    if mult < 5:
        return make_signal(reason=f"No whale volume ({mult}x)")
    if cur['close'] <= cur['open']:
        return make_signal(reason="Red candle — whale could be selling")
    # Mum gövdesi range'in %70+'ında ve kapanış üst %25'te
    range = cur['high'] - cur['low']
    body = abs(cur['close'] - cur['open'])
    if body / range < 0.7:
        return make_signal(reason="Candle body too weak")
    closePos = (cur['close'] - cur['low']) / range
    if closePos < 0.75:
        return make_signal(reason="Close not in upper portion")
    a = atr(c, 14)
    sl = cur['close'] - a[i] * 1.2
    r = cur['close'] - sl
    return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 2, cur['close'] + r * 4, cur['close'] + r * 6], confidence=0.78, reason=f"🐋 Whale buy {mult}x volume, strong body")
