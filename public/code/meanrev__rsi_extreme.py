from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def rsiExtreme(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    rs = rsi(closes, 14)
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    # RSI <20 + dönüş mumu
    if rs[i] < 20  and  cur['close'] > cur['open']  and  cur['close'] > c[i - 1]['close']:
        sl = cur['low'] - 0.5 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.74, reason=f"RSI extreme {rs[i]} + bullish reversal")
    # RSI >80 + dönüş mumu
    if rs[i] > 80  and  cur['close'] < cur['open']  and  cur['close'] < c[i - 1]['close']:
        sl = cur['high'] + 0.5 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.74, reason=f"RSI extreme {rs[i]} + bearish reversal")
    return make_signal(reason=f"RSI {rs[i]} - not extreme")
