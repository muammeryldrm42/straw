from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def bbMeanReversion(c):
    if len(c) < 50:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    bb = bollingerBands(closes, 20, 2)
    i = len(c) - 1
    cur = c[i]
    prev = c[i - 1]
    a = atr(c, 14)
    # Trend filtresi: BB orta bandı bir önceki orta banttan çok uzakta değilse (trendli pazarda mean reversion riski)
    midSlope = abs(bb['middle'][i] - bb['middle'][i - 10]) / bb['middle'][i]
    if midSlope > 0.02:
        return make_signal(reason="Strong trend — mean reversion risky")
    # Alt banda dokunma + dönüş = long
    if prev['low'] <= bb['lower'][i - 1]  and  cur['close'] > cur['open']  and  cur['close'] > prev['close']:
        sl = prev['low'] - 0.3 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[bb['middle'][i], bb['upper'][i] - (bb['upper'][i] - bb['middle'][i]) * 0.3], confidence=0.7, reason="BB lower band touch + reversal")
    if prev['high'] >= bb['upper'][i - 1]  and  cur['close'] < cur['open']  and  cur['close'] < prev['close']:
        sl = prev['high'] + 0.3 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[bb['middle'][i], bb['lower'][i] + (bb['middle'][i] - bb['lower'][i]) * 0.3], confidence=0.7, reason="BB upper band touch + rejection")
    return make_signal(reason="No BB band touch")
