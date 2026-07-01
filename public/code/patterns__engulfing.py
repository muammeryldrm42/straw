from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def body(c):
    return abs(c['close'] - c['open'])
def range(c):
    return c['high'] - c['low']
def upperWick(c):
    return c['high'] - max(c['open'], c['close'])
def lowerWick(c):
    return min(c['open'], c['close']) - c['low']
def isGreen(c):
    return c['close'] > c['open']
def isRed(c):
    return c['close'] < c['open']
def engulfing(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    cur = c[i]
    prev = c[i - 1]
    a = atr(c, 14)
    closes = [x['close'] for x in c]
    rs = rsi(closes, 14)
    # Bullish engulfing: önceki kırmızı, mevcut yeşil ve önceki gövdeyi tam sarar
    bullEngulf = isRed(prev)  and  isGreen(cur)  and  cur['close'] > prev['open']  and  cur['open'] < prev['close']  and  body(cur) > body(prev)
    # Bearish engulfing
    bearEngulf = isGreen(prev)  and  isRed(cur)  and  cur['close'] < prev['open']  and  cur['open'] > prev['close']  and  body(cur) > body(prev)
    # Bağlam: oversold'da bullish, overbought'ta bearish daha güvenilir
    if bullEngulf  and  rs[i] < 45:
        sl = cur['low'] - 0.3 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.73, reason=f"Bullish engulfing (RSI {rs[i]})")
    if bearEngulf  and  rs[i] > 55:
        sl = cur['high'] + 0.3 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.73, reason=f"Bearish engulfing (RSI {rs[i]})")
    return make_signal(reason="No engulfing pattern")
