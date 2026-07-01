from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def quickScalp(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    rs = rsi(closes, 7)
    # hızlı RSI
    i = len(c) - 1
    cur = c[i]
    prev = c[i - 1]
    a = atr(c, 14)
    # Aşırı satım bounce - hızlı long
    if rs[i - 1] < 20  and  rs[i] > rs[i - 1]  and  cur['close'] > cur['open']:
        sl = min(prev['low'], cur['low']) - 0.2 * a[i]
        r = cur['close'] - sl
        if r > 0:
            return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1, cur['close'] + r * 1.5, cur['close'] + r * 2.2], confidence=0.65, reason=f"Scalp: RSI7 {rs[i]} bounce")
    # Aşırı alım rejection - hızlı short
    if rs[i - 1] > 80  and  rs[i] < rs[i - 1]  and  cur['close'] < cur['open']:
        sl = max(prev['high'], cur['high']) + 0.2 * a[i]
        r = sl - cur['close']
        if r > 0:
            return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1, cur['close'] - r * 1.5, cur['close'] - r * 2.2], confidence=0.65, reason=f"Scalp: RSI7 {rs[i]} rejection")
    return make_signal(reason="No scalp setup")
