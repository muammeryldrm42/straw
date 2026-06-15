from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def zScoreReversion(c):
    if len(c) < 50:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    period = 20
    i = len(c) - 1
    cur = c[i]
    slice = closes[i - period + 1: i + 1]
    mean = sum(b for b in slice) / period
    variance = sum((v - mean) ** 2 for v in slice) / period
    sd = math.sqrt(variance)
    if sd == 0:
        return make_signal(reason="Volatility zero")
    z = (cur['close'] - mean) / sd
    a = atr(c, 14)
    # Z > +2: aşırı yüksek → short (mean'e dönüş bekleniyor)
    if z > 2  and  cur['close'] < cur['open']:
        sl = cur['high'] + 0.5 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[mean + sd, mean, mean - sd * 0.5], confidence=0.7, reason=f"Z-score +{z} → mean reversion short")
    if z < -2  and  cur['close'] > cur['open']:
        sl = cur['low'] - 0.5 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[mean - sd, mean, mean + sd * 0.5], confidence=0.7, reason=f"Z-score {z} → mean reversion long")
    return make_signal(reason=f"Z-score {z} (normal range)")
