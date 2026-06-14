from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


# Strategy Lab - Social Mention Velocity
def checkSignal(data, cfg={}):
    minM = cfg.min_mentions_now  or  20
    minVel = cfg.min_velocity_pct  or  50
    minSent = cfg.min_sentiment  or  0.2
    minAuth = cfg.min_unique_authors  or  10
    _d = data
    symbol = _d['symbol']
    price = _d['price_usd']
    mN = _d['mentions_now']
    m1 = _d['mentions_1h_ago']
    m6 = _d['mentions_6h_ago']
    sent = _d['sentiment_score']
    kol = _d['kol_mentions']
    authors = _d['unique_authors_1h']
    if mN < minM:
        return make_signal("neutral", price, 0, [], 0, f"Low mentions ({mN})")
    velocity = ((mN - m1) / max(m1, 1)) * 100
    if velocity < minVel:
        return make_signal("neutral", price, 0, [], 0, f"Weak velocity ({velocity}%/h)")
    if sent < minSent:
        return make_signal("neutral", price, 0, [], 0, f"Weak sentiment ({sent})")
    if authors < minAuth:
        return make_signal("neutral", price, 0, [], 0, f"Few authors ({authors})")
    conf = 0.5
    if velocity > 200:
        conf += 0.15
    if sent > 0.6:
        conf += 0.1
    if kol >= 1:
        conf += 0.15
    if authors > 50:
        conf += 0.1
    conf = min(conf, 0.95)
    return make_signal("long", price, price*0.7, [price*1.5, price*2.5, price*4.0], conf, f"Social: {mN} mentions (+{velocity}%/h), sent={sent}, KOL={kol}", {'symbol': symbol, 'velocity_pct': velocity})
