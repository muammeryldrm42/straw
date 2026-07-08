from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


# Strategy Lab - Dev Wallet & First Buyers Pattern
def checkSignal(data, cfg={}):
    maxDev = cfg.max_dev_hold_pct  or  15
    maxTop10 = cfg.max_top10_pct  or  40
    maxBundle = cfg.max_bundled_pct  or  30
    dumpThr = cfg.dev_dump_pct  or  30
    _d = data
    symbol = _d['symbol']
    price = _d['price_usd']
    devH = _d['dev_hold_pct']
    devS = _d['dev_sold_pct']
    top10 = _d['top10_concentration_pct']
    bundled = _d['bundled_wallets_pct']
    insiders = _d['insider_wallets_count']
    mintR = _d['is_mint_authority_renounced']
    freezeR = _d['is_freeze_authority_renounced']
    if devS >= dumpThr:
        return make_signal("short", price, price*1.10, [price*0.85, price*0.65, price*0.40], 0.85, f"DEV DUMP detected ({devS}% sold)")
    if not mintR  or  not freezeR:
        return make_signal("neutral", price, 0, [], 0, f"Authority not renounced (mint={mintR}, freeze={freezeR})")
    if devH > maxDev:
        return make_signal("neutral", price, 0, [], 0, f"Dev hold too high ({devH}%)")
    if top10 > maxTop10:
        return make_signal("neutral", price, 0, [], 0, f"Top10 too high ({top10}%)")
    if bundled > maxBundle:
        return make_signal("neutral", price, 0, [], 0, f"Bundled too high ({bundled}%)")
    conf = 0.5
    if devH < 5:
        conf += 0.15
    if top10 < 25:
        conf += 0.1
    if bundled < 15:
        conf += 0.1
    if insiders == 0:
        conf += 0.1
    conf = min(conf, 0.95)
    return make_signal("long", price, price*0.65, [price*1.5, price*2.5, price*4.0], conf, f"Clean dist: dev={devH}% top10={top10}% bundled={bundled}%", { symbol })
