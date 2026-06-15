from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


# Strategy Lab - Migration Play
def checkSignal(data, cfg={}):
    preMig = cfg.pre_mig_curve_pct  or  95
    maxMins = cfg.post_mig_max_minutes  or  30
    minVol = cfg.min_post_mig_volume  or  10000
    minBR = cfg.min_buy_ratio  or  1.3
    _d = data
    symbol = _d['symbol']
    price = _d['price_usd']
    curve = _d['bonding_curve_pct']
    target = _d['migration_target_pct']
    migd = _d['is_migrated']
    mins = _d['minutes_since_migration']
    vol = _d['post_mig_volume_usd']
    buys = _d['post_mig_buys']
    sells = _d['post_mig_sells']
    if not migd:
        if curve >= preMig:
            return make_signal("long", price, price*0.9, [price*1.3, price*1.7, price*2.2], 0.6, f"Pre-migration setup ({curve}%/{target}%)", {'symbol': symbol, 'stage': "pre"})
        return make_signal("neutral", price, 0, [], 0, f"Not at mig zone ({curve}%)")
    if mins > maxMins:
        return make_signal("neutral", price, 0, [], 0, f"Mig too old ({mins}min)")
    if vol < minVol:
        return make_signal("neutral", price, 0, [], 0, f"Weak post-mig vol (${vol})")
    ratio = buys / max(sells, 1)
    if ratio < minBR:
        return make_signal("neutral", price, 0, [], 0, f"Selling post-mig ({ratio})")
    conf = 0.55
    if mins < 10:
        conf += 0.15
    if ratio > 2.0:
        conf += 0.1
    if vol > 50000:
        conf += 0.15
    conf = min(conf, 0.9)
    return make_signal("long", price, price*0.85, [price*1.5, price*2.5, price*4.0], conf, f"Post-mig pump: {mins}min, ${vol} vol, buyR={ratio}", {'symbol': symbol, 'stage': "post"})
