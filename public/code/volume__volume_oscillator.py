from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def volumeOscillator(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    vols = [x['volume'] for x in c]
    fast = sma(vols, 5)
    slow = sma(vols, 20)
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    vo = ((fast[i] - slow[i]) / slow[i]) * 100
    # Yüksek hacim + yön = trend onayı
    if vo > 40  and  cur['close'] > cur['open']  and  cur['close'] > c[i - 1]['close']:
        sl = cur['low'] - 1.5 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.69, reason=f"Volume Oscillator spike +{vo}% + green")
    if vo > 40  and  cur['close'] < cur['open']  and  cur['close'] < c[i - 1]['close']:
        sl = cur['high'] + 1.5 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.69, reason=f"Volume Oscillator spike +{vo}% + red")
    return make_signal(reason=f"Volume Oscillator {vo}%")
