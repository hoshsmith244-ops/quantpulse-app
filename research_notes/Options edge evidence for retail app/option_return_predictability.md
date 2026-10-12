# Cross-Sectional Predictability of Single-Stock Option Returns, and Whether Stock Momentum / Reversal / Mean-Reversion Signals Become Profitable Option Strategies

Notes compiled October 2026. Conventions: "delta-hedged return" = option position hedged with delta shares of stock; "straddle" = ATM call + put, usually zero-delta weighted; "mid" = returns computed at bid-ask midpoint (no trading costs); "10-1" or "H-L" = long-short extreme decile/quintile spread; OptionMetrics Ivy DB is the data source in essentially every US study below (sample usually starts January 1996). Where I could only reach a working-paper (WP) version or a secondary summary, this is flagged.

## Q1. Goyal & Saretto (2009): does the historical-vs-implied volatility gap predict straddle / delta-hedged returns, how big is it, and does it survive spreads?

### Takeaway
Yes. The realized-minus-implied volatility gap (HV − IV) is the strongest and most replicated cross-sectional predictor of single-stock option returns: buy options where IV is low relative to trailing realized vol, and sell options where IV is high. Mid-quote long-short straddle returns run about 10–16% per month in the original and replication samples. Assuming you pay 50–75% of the quoted spread cuts this by roughly two-thirds, to about 5% per month. The original authors' 2022 follow-up attributes most of the raw return to dynamic factor exposure. Its IPCA alpha is 1.0%/month against a raw 3.6%, though that alpha is still highly significant.

### Cited Findings
- **Citation and design.** Goyal, A. & Saretto, A. (2009), "Cross-section of option returns and volatility," *Journal of Financial Economics* 94(2), 310–326, DOI 10.1016/j.jfineco.2009.01.001. The authors sort stocks on historical realized volatility minus ATM implied volatility, then form decile portfolios of straddles and of delta-hedged calls and puts. The zero-cost strategy goes long the large positive HV−IV decile and short the large negative one, and it "produces an economically and statistically significant average monthly return." The result holds across market conditions, stock risk characteristics, industries and option-liquidity groups, and standard risk-factor models do not explain it. — [IDEAS/RePEc record](https://ideas.repec.org/a/eee/jfinec/v94y2009i2p310-326.html); [SUFE abstract page](https://academicnewsletter.sufe.edu.cn/info/357238)
- **Mechanism, as described in a survey.** Straddle and delta-hedged call returns *increase* with HV−IV, which the survey treats as a stock-level volatility-risk-premium proxy. So options that are "expensive" relative to recent realized vol earn low returns. — [Hu, survey slides, NUS RMI](https://rmi.nus.edu.sg/wp-content/uploads/2020/11/30.-Guanglian-Hu.pdf)
- **Variable construction (secondary source).** One practitioner write-up describes the sort as 12-month historical volatility minus 1-month ATM IV. I did not verify this against the JFE text. — [BSIC summary](https://bsic.it/dislocations-historical-implied-volatility-indicators-volatility-trades/)
- **Precursor paper (Saretto, Nov 2005 WP, "Option Returns and the Cross-Sectional Predictability of Implied Volatility"):**
  - **Data.** Ivy DB, January 1996–June 2005, 4,249 stocks, average option maturity about 47 days. Deciles average 134 stocks per month.
  - **Signal.** Out-of-sample cross-sectional forecasts of the change in IV.
  - **Returns at mid.** Decile 1 straddles return −7.2%/month and decile 10 straddles +5.6%/month. The long-short straddle earns **12.9%/month** with a 13.2% monthly standard deviation, monthly Sharpe 0.977, and a worst month of −21.6%.
  - **Costs.** He assumes an effective spread of 75% of the quoted spread and holds positions to expiration. The long-short return-to-expiration falls from **16.1% at mid to 5.5% after costs**. In the medium-spread tercile it is 8.6% after costs.
  - **Liquidity.** Options with wide quoted spreads earn more at mid than tight-spread options (16.6% vs 13.3%).
  — [Saretto 2005 WP PDF](https://www.cis.upenn.edu/~mkearns/finread/CrossOptions.pdf)
- **Goyal & Saretto August 2006 WP, as summarized by CXO Advisory.** Sample January 1996–May 2005. Long-short ATM one-month straddles earn **15.0%/month** (monthly Sharpe 0.626). Charging half the quoted spread drops this to **5.3%/month**, and restricting to less-liquid options gives 6.7%/month. This is a secondary summary of a pre-publication draft. — [CXO Advisory (2006)](https://www.cxoadvisory.com/volatility-effects/making-money-with-options-based-on-superior-volatility-forecasts)
- **Out-of-sample replication to June 2019 (Heston, Jones, Khorram, Li & Mo WP, Sept 2021).** Quintile sorts of zero-delta straddles on IV−HV:
  - The low quintile (cheap IV) returns −1.86%/month and the high quintile (rich IV) returns −12.20%/month, a **10.34%/month spread (t = −9.48)**.
  - The GS IV−HV factor and the Vasquez term-spread factor are the only two option factors with higher Sharpe ratios than option momentum, whose annualized Sharpe is 1.53.
  — [Option Momentum WP (SJTU-hosted PDF)](https://www.acem.sjtu.edu.cn/sffs/2021w/pdfs/3.pdf)
- **Same authors, 1996–2020 (Goyal & Saretto, Dallas Fed WP 2214, Aug 2022, "Are Equity Option Returns Abnormal? IPCA Says No").**
  - The realized-minus-implied sort averages **3.5–3.6%/month with t ≈ 20**. The scale is lower than straddle returns, apparently because these are delta-hedged position returns. I could not confirm which position type underlies the headline number.
  - Their IPCA latent-factor model with dynamic betas cuts the alpha to **1.0%/month (t = 9.4)**.
  - Across 44 option-return characteristics, 29 are significant after multiple-testing correction, but only 5 (9 at conventional levels) keep significant IPCA alphas. The alpha reduction relative to static factor models is 50–75%.
  - Their conclusion: "the extant evidence on option trading strategies presents no significant challenges to market efficiency."
  — [Dallas Fed WP 2214](https://www.dallasfed.org/-/media/documents/research/papers/2022/wp2214.pdf)
- **Non-US evidence (secondary, unverified).** A Vaasa thesis reports that Do, Foster & Gray (2016) re-examined the HV−IV spread trade and questioned whether returns survive transaction costs. I could not open the thesis or the original paper. — [Univ. of Vaasa thesis record](https://osuva.uwasa.fi/handle/11111/6167)

### Inferences
- The HV−IV effect is not fragile at mid prices. It appears in 1996–2005, 1996–2019 and 1996–2020 samples with t-statistics of 9–20.
- The open questions are (a) net-of-cost size and (b) whether it is "alpha" or compensation for dynamic risk exposure (Goyal & Saretto 2022 argue mostly the latter).
- Across every version I could check, about 60–70% of the mid-quote return disappears once 50–75% of the quoted spread is charged.
- Economically, this is a volatility mean-reversion signal: IV that is far above trailing realized vol tends to be overpriced. It is the closest options analogue to a "distance from moving average" signal (see Q3).
- In the 2019 replication, even the "best" quintile (cheap IV) has negative mean straddle returns (−1.86%/month). The long-short profit therefore comes mostly from *selling* rich-IV straddles. For a retail app this implies short-volatility exposure, with margin and tail risk, rather than buying cheap options.

### Gaps
- I could not access the published JFE 2009 full text. The exact published sample end, decile returns for straddles vs delta-hedged calls, and the published transaction-cost table are not verified here. Figures above come from the 2005/2006 WPs and later replications.
- No study I found measures net-of-cost HV−IV returns using actual retail fills (PFOF/wholesaler executions).

## Q2. Other documented predictors of delta-hedged / straddle returns: IVOL, illiquidity, size, analyst dispersion, IV term structure, vol-of-vol, etc.

### Takeaway
More than a dozen stock and option characteristics predict delta-hedged option returns, with mid-quote long-short spreads of roughly 1–4%/month for delta-hedged calls and 2–10%/month for straddles. The robust ones are:
- IV−HV
- IV term-structure slope
- idiosyncratic volatility (negative)
- firm size (positive)
- analyst dispersion (negative)
- vol-of-vol (negative)
- option illiquidity (positive premium to liquidity providers)
- several fundamentals (profitability, cash holdings, share issuance)

Machine-learning combinations of 265 characteristics remain profitable after costs (Bali et al. 2023). Static option factor models leave many alphas, but a dynamic IPCA model explains most of them (Goyal & Saretto 2022).

### Cited Findings
- **Idiosyncratic volatility: Cao, J. & Han, B. (2013), "Cross section of option returns and idiosyncratic stock volatility," *JFE* 108(1), 231–249.** Delta-hedged equity option returns *decrease monotonically* with the underlying's idiosyncratic volatility, and standard risk factors do not explain the pattern. The authors' explanation is that dealers charge more for options on high-IVOL stocks because hedging/arbitrage costs are higher. Adding limits-to-arbitrage proxies weakens the IVOL relation by about 40%. — [OptionMetrics research summary](https://optionmetrics.com/research/j-cao-and-b-han-cross-section-of-option-returns-and-idiosyncratic-stock-volatility/); [PolyU record](https://research.polyu.edu.hk/en/publications/cross-section-of-option-returns-and-idiosyncratic-stock-volatilit/)
- **Cao & Han, Sept 2010 WP version (secondary summary).**
  - Sample: January 1996–October 2009, about 6,000 stocks, about 200,000 near-ATM call and put observations each, roughly 1.5 months to expiry.
  - Delta-hedged calls lose on average **4.89% of option price** to expiration.
  - Long low-vol / short high-vol ATM delta-hedged calls earn **about 2%/month at mid**.
  - Charging 50/75/100% of the closing spread cuts profit to "approximately zero." The summary's own numbers are internally inconsistent (it also says "from about 1% per month"). Treat as approximate.
  — [CXO Advisory summary](https://www.cxoadvisory.com/volatility-effects/extracting-a-volatility-premium-with-equity-options)
- **Stock characteristics and fundamentals: Zhan, X., Han, B., Cao, J. & Tong, Q. (2022), "Option Return Predictability," *Review of Financial Studies* 35(3), 1394–1442, DOI 10.1093/rfs/hhab067.** Expected returns to *writing* delta-hedged calls are:
  - **negatively** related to stock price, profit margin and profitability;
  - **positively** related to cash holdings, cash-flow variance, new share issuance, total external financing, distress risk and analyst forecast dispersion.
  Long-short option portfolios have **annual Sharpe ratios above 2 and remain profitable after transaction costs**. Two option factors explain the profits, while equity risk factors have no explanatory power. The authors say the predictability "remains puzzling." — [PolyU publication page](https://research.polyu.edu.hk/en/publications/option-return-predictability/); [IDEAS/RePEc](https://ideas.repec.org/a/oup/rfinst/v35y2022i3p1394-1442..html)
- **Zhan et al., April 2016 WP version (sample January 1996–December 2012).**
  - 8 of 12 classic stock anomalies predict delta-hedged option gains, even though none of them significantly predicted *stock* returns in that sample.
  - Equal-weighted 10-1 monthly spreads for delta-neutral call writing:
    - IVOL **3.92%**
    - size **3.79%** (small-cap options richer)
    - profitability **2.39%**
    - analyst dispersion **2.03%**
    - cash holdings **1.99%**
    - momentum **1.58%**
    - share issuance **1.46%**
    - short-term reversal **1.28%**
  - Monthly Sharpe ratios range from 0.63 to 2.00. Profitability alone has a monthly Sharpe of 1.38.
  - Book-to-market, accruals, asset growth and SUE are not significant.
  - Signs are the same for calls and puts, so the effect is not inherited from stock-return predictability.
  - Profits are larger where underlying-stock arbitrage is harder: low liquidity, low price, low institutional ownership, low analyst coverage.
  — [Zhan et al. 2016 WP (ABFER)](https://abfer.org/media/abfer-events-2016/annual-conference/investment-finance/226-option-return-predictability.pdf)
- **IV term structure: Vasquez, A. (2017), "Equity Volatility Term Structures and the Cross Section of Option Returns," *JFQA* 52(6), 2727–2754.** The slope of the IV term structure (long-dated minus short-dated ATM IV) is *positively* related to future option returns. High-slope straddle portfolios outperform low-slope ones by an economically and statistically significant margin. The result is robust to traditional factors, higher-order option factors and jump risk. A secondary summary gives the sample as January 1996–June 2007. — [IDEAS/RePEc](https://ideas.repec.org/a/cup/jfinqa/v52y2017i06p2727-2754_00.html); [Cambridge Core](https://www.cambridge.org/core/journals/journal-of-financial-and-quantitative-analysis/article/equity-volatility-term-structures-and-the-cross-section-of-option-returns/F0A40E99FD2458367DD9A56A89783D38); [Alpha Architect summary](https://alphaarchitect.com/2014/01/equity-term-structure-and-option-returns/)
- **Head-to-head replication, zero-delta straddles, quintile H−L, January 1996–June 2019.**

  | Signal | H−L per month | t-stat |
  |---|---|---|
  | IV term spread | **7.17%** | 7.92 |
  | IV−HV | **−10.34%** | −9.48 |
  | Size | 2.41% | 2.07 |
  | Cao-Han IVOL | −2.49% | −1.99 |
  | IV smirk slope (skew proxy) | 0.49% | 0.78, not significant |

  — [Heston et al. 2021 WP, Table 2](https://www.acem.sjtu.edu.cn/sffs/2021w/pdfs/3.pdf)
- **Volatility-of-volatility.**
  - Cao, J., Vasquez, A., Xiao, X. & Zhan, X. (2023), "Why Does Volatility Uncertainty Predict Equity Option Returns?", *Quarterly Journal of Finance* 13(1), 2350005. Delta-hedged option returns consistently *decrease* with uncertainty of volatility, measured from IV, EGARCH or high-frequency realized vol. The result is robust to firm characteristics, stock/option liquidity, volatility characteristics and jump risk, and is unexplained by common factors. Proposed channels are dealers charging more for hard-to-hedge names (model risk) and a gambling preference concentrated in vol-of-vol *increases*. — [City Research Online](https://openaccess.city.ac.uk/id/eprint/30606/); [IDEAS/RePEc](https://ideas.repec.org/a/wsi/qjfxxx/v13y2023i01ns2010139223500052.html)
  - Ruan (*Journal of Financial Markets*, 2020) independently finds a significantly negative option-return/VOV relation not explained by standard factors. — [Ruan WP (AUT)](https://acfr.aut.ac.nz/__data/assets/pdf_file/0008/185291/157562-X-Ruan-VOV_Option.pdf); listed in [Goyal & Saretto 2022 lit review](https://www.dallasfed.org/-/media/documents/research/papers/2022/wp2214.pdf)
- **Option illiquidity: Christoffersen, P., Goyenko, R., Jacobs, K. & Karoui, M. (2018), "Illiquidity Premia in the Equity Options Market," *RFS* 31(3).** Illiquid options earn a *positive* risk-adjusted premium over liquid ones. Illiquidity is measured from intraday effective spreads. The authors interpret it as compensation to market makers who hold large, risky net long positions.
  - A search-engine summary of the published abstract reports 3.4% per day for ATM calls and 2.5% for ATM puts. An earlier draft reports 23 bps/day for calls and 13 bps/day for puts. **Verify units and magnitudes before using either number.**
  - The effect of *stock* illiquidity was described differently across drafts.
  — [CBS research portal](https://research.cbs.dk/en/publications/illiquidity-premia-in-the-equity-options-market-2/); [CREATES WP 2011-43](https://repec.econ.au.dk/repec/creates/rp/11/rp11_43.pdf)
- **Other predictors listed in Goyal & Saretto's (2022) literature review:**
  - risk-neutral skewness (Bali & Murray 2013) and ex-ante option skewness (Boyer & Vorkink 2014), both negative;
  - lottery-like stocks' calls underperform (Byun & Kim 2016);
  - option order-flow imbalance predicts daily option returns (Muravyev 2016);
  - option momentum (Heston et al.).
  Goyal & Saretto build 44 characteristics in four groups: contract, risk-neutral moments, physical moments and firm characteristics. — [Dallas Fed WP 2214](https://www.dallasfed.org/-/media/documents/research/papers/2022/wp2214.pdf)
- **Machine learning: Bali, T., Beckmeyer, H., Moerke, M. & Weigert, F. (2023), "Option Return Predictability with Machine Learning and Big Data," *RFS* 36(9), 3548–3602, DOI 10.1093/rfs/hhad017.**
  - Data: more than 12 million US delta-hedged option returns, 1996–2020, with 265 option- and stock-based characteristics.
  - Nonlinear models (gradient-boosted trees, random forests, neural nets) significantly improve out-of-sample prediction.
  - Long-short portfolios earn "statistically and economically sizable profits even after accounting for transaction costs."
  - Option-based characteristics are the strongest standalone predictors, but stock characteristics add incremental power.
  - The authors attribute the predictability to informational frictions, mispricing and costly arbitrage.
  — [Univ. of Münster record](https://www.wiwi.uni-muenster.de/fcm/en/publication/98329575); [CFR WP 21-08](https://www.cfr-cologne.de/download/workingpaper/cfr-21-08.pdf)
- **Factor models.** After multiple-testing correction, 30 of 44 option characteristics keep significant alphas against the Bali-Cao-Song-Zhan (2022) option factors. The Horenstein-Vasquez-Xiao factor model leaves 14 significant alphas. — [Goyal & Saretto 2022](https://www.dallasfed.org/-/media/documents/research/papers/2022/wp2214.pdf)

### Inferences
- The predictors cluster into three economic themes:
  1. **Volatility mispricing / mean reversion:** IV−HV and term slope.
  2. **Dealer hedging cost / inventory risk:** IVOL, vol-of-vol, small size, illiquidity, low price and dispersion all make options richer, so *writing* delta-hedged options there pays.
  3. **Fundamentals:** profitability, cash and issuance, for which the authors offer no clean explanation.
- For an app, the most data-light signals are IV−HV, term slope, IVOL, size and price. They need only option chains and daily stock prices.
- The "rich options" side (high IVOL, high vol-of-vol, small, illiquid) is where premia are largest. It is also where spreads are widest and short-vol tail risk is highest, so gross and net rankings may differ.

### Gaps
- I could not retrieve published-version magnitudes for Cao & Han (2013), Vasquez (2017), Zhan et al. (2022, extended sample) or Christoffersen et al. (2018). Numbers above come from WPs, secondary summaries or the Heston et al. replication.
- I found no direct study of analyst-dispersion-sorted option returns *after* 2012 beyond the ML and IPCA papers, which pool everything.
- I did not find a 2021–2026 out-of-sample test of these single characteristics.

## Q3. Do stock momentum, short-term reversal, or mean reversion / distance-from-moving-average predict option returns or IV changes? Option-momentum research.

### Takeaway
**Stock-price signals:** past stock returns do carry information for option returns, but the evidence is modest and not consistent in sign across studies.
- Zhan et al. find delta-hedged option returns *rise* with both past 1-month and 12−2-month stock returns. The 10-1 spread to writing delta-hedged calls is about 1.3–1.6%/month at mid, about 0.4–0.7%/month at full quoted spread.
- An et al. (2014) find that high past-month stock returns predict *rising* call IV.
- Heston et al. find past stock returns have a slightly negative, insignificant relation with straddle returns.

**Option momentum:** the robust "momentum" effect is in options' *own* past returns.
- Straddle momentum on months 2–12 earns 6.2%/month at mid (t ≈ 8). One-month straddle returns reverse (−4.1%/month).
- Neither effect survives paying the full quoted spread unless the strategy is cost-optimized.

**Mean reversion / distance from moving average:** I found no published study on price-based distance-from-MA signals for options. The vol analogue, IV relative to its own 12-month average and to realized vol, is strongly predictive (see Q1).

### Cited Findings
- **Zhan et al. 2016 WP (1996–2012):**
  - Delta-hedged option gains *increase* with momentum RET(−12,−2) and with short-term reversal RET(−1,0), as well as with size and profitability.
  - Past 1-month and 12−2-month stock returns predict *stock* returns in opposite directions, yet "both negatively predict the return to delta-neutral call writing."
  - EW 10-1 spreads for delta-neutral call writing are **1.28%/month (reversal sort)** and **1.58%/month (momentum sort)**.
  - At an effective spread equal to 100% of the quoted spread they are **0.73%/month (t = 5.13)** and **0.42%/month (t = 2.89)**. At 50% they are 1.00% and 0.98%.
  - In the published RFS version, "stock price" appears in the abstract as a negative predictor of call-writing returns. I could not confirm whether the momentum and reversal results were kept with the same magnitudes.
  — [Zhan et al. 2016 WP](https://abfer.org/media/abfer-events-2016/annual-conference/investment-finance/226-option-return-predictability.pdf); [RFS 2022 abstract (PolyU)](https://research.polyu.edu.hk/en/publications/option-return-predictability/)
- **An, B.-J., Ang, A., Bali, T. & Cakici, N. (2014), "The Joint Cross Section of Stocks and Options," *Journal of Finance* 69(5), 2279–2337.**
  - Stocks with high returns over the past month tend to have call options whose **implied volatility increases over the next month**, while realized volatility tends to decrease.
  - In the other direction, stocks with large increases in call IV earn higher next-month stock returns, and put-IV increases predict lower returns. The quintile spread on lagged call-IV changes is about **1%/month**.
  - The authors interpret this as slow information diffusion between the option and equity markets.
  — [NBER WP 19590 record](https://ideas.repec.org/p/nbr/nberwo/19590.html); [Columbia WP PDF](https://business.columbia.edu/sites/default/files-efs/pubfiles/3954/The%20Joint%20Cross%20Section%20of%20Stocks%20and%20Options.pdf)
- **Heston et al. (WP) on the stock-to-option link.**
  - They report that Cao & Han (2013) find past stock returns predict option returns *positively* at 1–36 month horizons, though "not particularly strong or robust."
  - In Heston et al.'s own straddle sample the relation is **slightly negative but insignificant**.
  - Option momentum is equally strong among firms with low and high past stock returns, so they find "no appreciable link between stock and option momentum."
  — [Option Momentum WP, Sec. 5.5](https://www.acem.sjtu.edu.cn/sffs/2021w/pdfs/3.pdf)
- **Option momentum: Heston, S., Jones, C., Khorram, M., Li, S. & Mo, H. (2023), "Option Momentum," *Journal of Finance* 78(6), 3141–3192, DOI 10.1111/jofi.13279.**
  - Monthly ATM straddle returns on individual equities, January 1996–June 2019, about 1,369 straddles per month.
  - Options with high past returns continue to outperform over **6–36 month** formation horizons. This holds with OTM options and with delta-hedged returns.
  - Unlike stock momentum, there is **no long-run reversal**.
  - Significant returns remain after controlling for IV and other characteristics, and after factor adjustment.
  - "Average option momentum returns are close to zero after paying the full bid-ask spread for options with below-median bid-ask spreads." Trading costs are unrelated to the size of momentum profits.
  — [EconBiz record](https://www.econbiz.de/Record/option-momentum-heston-steven/10014437686); [WP PDF](https://www.acem.sjtu.edu.cn/sffs/2021w/pdfs/3.pdf)
- **Option momentum magnitudes (2021 WP, Table 2, quintile H−L, monthly, mid quotes).**
  - Straddles average **−5.3%/month** (SD 81%/month, positively skewed).

  | Formation window | H−L per month | t-stat |
  |---|---|---|
  | Lag 1 (reversal) | **−4.09%** | −6.18 |
  | Lags 2–12 | **6.22%** | 7.97 |
  | Lags 2–24 | 5.96% | 7.28 |
  | Lags 13–24 | 3.14% | 3.99 |
  | Lags 25–36 | 2.61% | 3.35 |

  - Even the top momentum quintile has a negative average straddle return: −1.55%/month for lags 2–12 (t = −0.85). The bottom quintile returns −7.77%/month.
  — [WP PDF](https://www.acem.sjtu.edu.cn/sffs/2021w/pdfs/3.pdf)
- **Risk profile of option momentum.**
  - Momentum: monthly Sharpe 0.441 (**1.53 annualized**), more than three times the standard stock-momentum Sharpe, positively skewed, maximum drawdown 56%.
  - Short-term reversal: annualized Sharpe **1.14**.
  - An equal-weighted short-straddle portfolio has a drawdown above 100%.
  - Momentum is significantly positive in every rolling five-year window in the sample, and robust across size, liquidity, analyst-coverage and credit-rating subgroups.
  - Daily delta-hedged 1–12 momentum earns 5.59%/month vs 3.64% static.
  - The short-term reversal result is "less robust to different methods for computing option returns" and disappears in panel regressions.
  — [WP PDF](https://www.acem.sjtu.edu.cn/sffs/2021w/pdfs/3.pdf)
- **Delta-hedging as a hidden stock-reversal strategy.** A long straddle that is delta-hedged daily buys stock after declines and sells after rises. That is a high-frequency stock reversal strategy, which "increases the returns of a long options strategy" and reduces those of short-option strategies. It explains why hedged and unhedged short-term option-reversal results differ. — [Heston et al. WP](https://www.acem.sjtu.edu.cn/sffs/2021w/pdfs/3.pdf)
- **Mean reversion / moving-average analogue in IV (Saretto 2005).**
  - "A stock with an at-the-money implied volatility below the cross-sectional average and below its own twelve months moving average, has a higher implied volatility in the next month," and vice versa.
  - Cross-sectional regressions show "a high degree of mean-reversion in implied volatilities."
  - Straddle portfolios sorted on the resulting IV-change forecasts earn the 12.9%/month long-short return in Q1.
  - When underlying stocks are sorted the same way, the option returns do not reflect directional exposure.
  — [Saretto 2005 WP](https://www.cis.upenn.edu/~mkearns/finread/CrossOptions.pdf)
- **Interaction with stock momentum in the HV−IV strategy.** Saretto (2005) finds IV predictability persists within beta, size, book-to-market and momentum portfolios, and that the Carhart momentum factor "does not seem to play a very important role" in explaining long-short straddle returns. — [Saretto 2005 WP](https://www.cis.upenn.edu/~mkearns/finread/CrossOptions.pdf)

### Inferences
- **"Buy calls on stock-momentum winners" has no direct support for option *returns* here.** Its directional payoff is just stock momentum with leverage and high costs. What the literature shows is that past stock returns shift the *volatility* component.
  - On a hedged basis, options on past winners (1-month and 12−2-month) are relatively cheap and on past losers relatively rich.
  - That implies selling delta-hedged options on losers and buying them on winners: about 1.3–1.6%/month at mid, much less after costs (Zhan et al.).
- **Mixed evidence.** An et al. (rising call IV after high returns) is consistent with Zhan et al. Heston et al. find no stock-to-straddle link. Effects measured on monthly delta-hedged calls vs to-expiration straddles may differ.
- **The strongest "momentum" signal for an options app is option-return momentum** (past 2–12 month straddle returns), not stock-price momentum. Combining it with the 1-month option reversal improves after-cost performance (see Q4).
- **Mean reversion and moving averages.** The robust signals are vol-based: IV vs its own 12-month average, IV vs realized vol, and term slope. Price-based distance-from-MA has not been studied for option returns, as far as I found.
- **Long-only buyers face negative expected returns.** Straddles average about −5%/month and even the best momentum quintile is negative. Signal-driven *long* option buying earns at best near zero at mid. Profits in these long-short studies come largely from the short-volatility leg.

### Gaps
- I found no peer-reviewed study of option (straddle/delta-hedged) returns conditioned on a stock's distance from its 50- or 200-day moving average, or on RSI-type oscillators.
- I did not verify Jones, Khorram & Mo's related work on seasonality and reversal in option returns.
- I could not open the published Cao & Han (2013) tables on past-return predictability. That claim comes via Heston et al.
- The published (2022) Zhan et al. momentum and reversal magnitudes are not verified. The figures above are from the 2016 WP.

## Q4. How much option-return predictability survives realistic transaction costs? Net-of-cost evidence, including retail-sized trades.

### Takeaway
Costs are the binding constraint. Single-stock option quoted spreads average about 12–20% of the option price, and 28% for slightly-OTM retail favourites.
- Single-signal strategies typically lose 60–100%+ of mid-quote profits once 50–100% of the quoted spread is charged.
- They survive only if you (a) trade the extreme deciles, (b) restrict to options with spreads under about 10% of mid, (c) combine signals, (d) hold to expiration, and/or (e) achieve "algo-like" execution at about 20% of the half-spread.
- Muravyev & Pearson show sophisticated traders pay far less than quoted spreads.
- Retail flow is documented to lose money in aggregate, and its execution costs ($4.1B) dwarf commissions.

### Cited Findings
- **Quoted spread levels.**
  - Zhan et al.'s ATM, about 50-day sample: average quoted spread **about 20%**, median 15.6%. — [Zhan et al. 2016 WP](https://abfer.org/media/abfer-events-2016/annual-conference/investment-finance/226-option-return-predictability.pdf)
  - S&P 500 stock options: average quoted spread **17.2%**, per Muravyev & Pearson as cited by Bryzgalova et al. — [Bryzgalova, Pavlova & Sikorskaya 2022 WP](https://conference.nber.org/conf_papers/f163907/f163907.pdf)
  - Retail-favoured weekly options: average quoted spread **12.3%** (12.6% in the JF version). Slightly-OTM retail trades average **28%**. — [Bryzgalova et al. WP](https://conference.nber.org/conf_papers/f163907/f163907.pdf); [LBS page](https://www.london.edu/faculty-and-research/academic-research/r/retail-trading-in-options-and-the-rise-of-the-big-three-wholesalers)
- **Effective vs quoted spreads.**
  - Earlier studies (de Fontnouvelle, Fisher & Harris 2003; Mayhew 2002) find the effective/quoted ratio for equity options is **below 0.5**. — cited in [Saretto 2005](https://www.cis.upenn.edu/~mkearns/finread/CrossOptions.pdf) and [Zhan et al. WP](https://abfer.org/media/abfer-events-2016/annual-conference/investment-finance/226-option-return-predictability.pdf)
  - Goyenko et al. (2015) find the aggregate effective/quoted ratio fell from 1 to 0.8, and it would be far lower for short-dated ATM options. — cited in [Zhan et al. WP](https://abfer.org/media/abfer-events-2016/annual-conference/investment-finance/226-option-return-predictability.pdf)
- **Muravyev, D. & Pearson, N. (2020), "Options Trading Costs Are Lower than You Think," *RFS* 33(11), 4973–5014.**
  - Many traders time executions, buying when fair value is near the ask and selling when it is near the bid.
  - Timing traders' effective spreads are **under 40% of conventional measures**. The overall average effective spread is one-quarter smaller than conventional estimates.
  - Conventional price-impact measures overstate impact by more than 2x.
  - This "alter[s] conclusions about the after-cost profitability of options trading strategies."
  — [IDEAS/RePEc](https://ideas.repec.org/a/oup/rfinst/v33y2020i11p4973-5014..html); [SUFE abstract](https://academicnewsletter.sufe.edu.cn/info/352530)
  - Heston et al. derive cost tiers from Muravyev & Pearson's Table 5:
    - "algo" traders pay an effective half-spread of **$0.026 vs a $0.128 quoted half-spread** on ATM options (**20.3%** of quoted);
    - "adjusted" spreads are **51.6%** of quoted;
    - "effective" spreads are **75.8%** of quoted.
    — [Heston et al. WP](https://www.acem.sjtu.edu.cn/sffs/2021w/pdfs/3.pdf)
- **Option momentum / reversal after costs (Heston et al. WP, Table 13, monthly, 1996–2019, zero stock-exercise cost).** Cost columns are fractions of the quoted half-spread paid per leg.

  | Strategy | Mid | Algo (20%) | Adjusted (52%) | Effective (76%) | Full quoted |
  |---|---|---|---|---|---|
  | Momentum, baseline quintiles | 6.22% | 3.62% | −0.40% | −3.56% | −6.78% |
  | Reversal, baseline quintiles | 4.09% | 1.07% | −3.59% | −7.22% | −10.90% |
  | Momentum, cost-optimized | 7.23% | 5.99% | 4.08% (t 2.74) | 2.60% (t 1.75) | 1.12% (t 0.75) |
  | Reversal, cost-optimized | 8.06% | 6.82% | 4.93% | 3.46% (t 2.85) | 1.99% (t 1.64) |
  | Composite, cost-optimized | 8.15% | 6.90% | 4.98% | 3.48% (t 2.59) | 1.98% (t 1.47) |

  - "Cost-optimized" means extreme deciles and only options with spread under 10% of mid. The composite is a momentum + reversal z-score.
  - Charging half the stock closing spread to liquidate exercised positions drops the composite at full quoted spread to −0.30%.
  - The authors' summary: main strategies "are not profitable if one assumes that the entire quoted spread must be paid." Cost-aware portfolios "are quite profitable … under a number of reasonable assumptions."
  - Margin-adjusted (SPAN) returns, before costs, are about 1.9–4.0%/month.
  — [Heston et al. WP](https://www.acem.sjtu.edu.cn/sffs/2021w/pdfs/3.pdf)
- **Stock-anomaly-based delta-hedged call writing after costs (Zhan et al. 2016 WP, Table 8, EW 10-1, monthly, 1996–2012).** Effective spread as a percentage of quoted spread.

  | Sort | Mid | 50% | 100% |
  |---|---|---|---|
  | Size | 3.79% | 1.75% | **−0.22% (not significant)** |
  | Reversal | 1.28% | 1.00% | 0.73% |
  | Momentum | 1.58% | 0.98% | 0.42% |
  | Cash holdings | 1.99% | 1.51% | 1.04% |
  | Dispersion | 2.03% | 1.26% | 0.51% |
  | Issuance | 1.46% | 1.03% | 0.62% |
  | IVOL | 3.92% | 2.74% | 1.61% |
  | Profitability | 2.39% | 1.46% | 0.56% |

  - Seven of eight stay significant at 100%. Holding to maturity (about 50 days) gives larger spreads and lower costs.
  - Caveat: the PDF table text was garbled in extraction. I matched columns using the authors' in-text ISSUE example (1.46 → 1.24 → 1.03 → 0.82 → 0.62) and their statement that only size fails at 100%.
  — [Zhan et al. 2016 WP](https://abfer.org/media/abfer-events-2016/annual-conference/investment-finance/226-option-return-predictability.pdf)
- **HV−IV after costs.**
  - Saretto 2005: 16.1% falls to **5.5%/month** to expiration with a 75% effective spread. — [Saretto 2005](https://www.cis.upenn.edu/~mkearns/finread/CrossOptions.pdf)
  - GS 2006 WP: 15.0% falls to **5.3%/month** at half spread. — [CXO Advisory](https://www.cxoadvisory.com/volatility-effects/making-money-with-options-based-on-superior-volatility-forecasts)
- **IVOL after costs (Cao & Han WP).** Profits fall to about zero at 50–100% of the closing spread, so "only traders who can achieve relatively low trading frictions can exploit" it. — [CXO Advisory](https://www.cxoadvisory.com/volatility-effects/extracting-a-volatility-premium-with-equity-options)
- **ML composite after costs.** Nonlinear-ML long-short delta-hedged portfolios remain sizably profitable after transaction costs, 1996–2020. — [Bali et al. 2023 (Münster record)](https://www.wiwi.uni-muenster.de/fcm/en/publication/98329575)
- **Retail-specific evidence: Bryzgalova, Pavlova & Sikorskaya, "Retail Trading in Options and the Rise of the Big Three Wholesalers," *Journal of Finance* (2023), DOI 10.1111/jofi.13285.**
  - Data: Nov 2019–June 2022 transaction data with wholesaler-trade identification.
  - Retail flow loses money at every horizon. At a 10-day holding horizon the aggregate retail portfolio **lost $1.14B before costs**, while all options trades together gained $5.48B.
  - Retail trading costs measured as trade price vs midquote total **$4.13B**, compared with about **$800M** in commissions.
  - Losses concentrate in short-term calls. About 50% of wholesaler trades are in options with under one week to expiry. 72% are ATM and 24% slightly OTM.
  - The Big Three wholesalers hold more than 85% of options PFOF.
  — [NBER conference WP](https://conference.nber.org/conf_papers/f163907/f163907.pdf)

### Inferences
- **What a retail app should assume.** Retail market orders at roughly the effective spread (about 75% of quoted) will wipe out single-signal option strategies such as momentum, reversal, IVOL and size. Only algo-like execution keeps baseline strategies profitable.
- **Survivable design levers:**
  - extreme deciles only;
  - liquid names only (spread under 10% of mid);
  - multi-signal composites (Heston composite, Bali et al. ML);
  - hold-to-expiration instead of monthly round-trips (Saretto; Zhan et al.);
  - limit and complex (multi-leg) orders to capture price improvement.
  Heston et al. note that only end users can post to the complex order book.
- **Short-leg frictions are not in the mid-quote numbers.** Margin (SPAN), assignment and stock liquidation costs, and tail risk all matter. Heston et al. show stock-liquidation costs alone can flip the composite's full-spread return negative.
- **Delta-hedging costs.** Rebalancing a delta hedge daily is commission-free in stocks today, but it adds stock spreads and operational burden. Monthly-static hedges (Zhan et al.'s main spec) are the more retail-feasible benchmark.

### Gaps
- I found no academic study that measures net returns of these specific cross-sectional option strategies using *actual retail fills* (PFOF/wholesaler price improvement) or small lot sizes.
- I did not verify the exact after-cost numbers in the published Zhan et al. (2022) and Bali et al. (2023) tables.
- No evidence was found on how 0DTE/weekly-option growth after 2022 changed effective spreads for monthly single-stock options.

## Q5. Replication and post-publication evidence: have these anomalies weakened?

### Takeaway
There is no McLean-Pontiff-style post-publication decay study for single-stock option anomalies that I could find.
- The main replications (Heston et al. to 2019; Goyal & Saretto IPCA to 2020; Bali et al. ML to 2020) confirm that raw mid-quote returns of the classic signals (IV−HV, term slope, IVOL, size, option momentum) persist through about 2020.
- The challenge is to interpretation, not existence. Goyal & Saretto (2022) show a dynamic-beta IPCA model explains 50–75% of alphas and leaves only 5 of 29 significant.
- Separately, the *index* variance risk premium has shrunk toward zero over the last 15 years (Dew-Becker & Giglio 2025), a warning sign for short-vol-leg profits.
- Post-2020 single-stock evidence is essentially absent from peer-reviewed work.

### Cited Findings
- **Raw returns persist through 2020.** The GS realized-minus-implied strategy still earns 3.5–3.6%/month (t ≈ 20) over 1996–2020. 29 of 44 option characteristics remain significant after multiple-testing correction. — [Goyal & Saretto 2022, Dallas Fed WP 2214](https://www.dallasfed.org/-/media/documents/research/papers/2022/wp2214.pdf)
- **But mostly explained by dynamic risk exposure.** IPCA (4 factors for delta-hedged calls, 5 for puts and straddles) cuts alphas by 50–75%. Only 5 (9 at conventional significance) of 29 strategies keep significant alpha, and only 2 of 23 among signal-weighted portfolios. GS HV−IV alpha falls to 1.0%/month (t = 9.4) from 3.6% raw. Average absolute 10-1 alphas are 13 bps (low spread) and 25 bps (high spread) per month. Conclusion: "no significant challenges to market efficiency." — [Goyal & Saretto 2022](https://www.dallasfed.org/-/media/documents/research/papers/2022/wp2214.pdf)
- **Option momentum stability.** Momentum is significantly positive in every rolling five-year window, 1996–2019. Both momentum and reversal five-year moving averages are positive "at all times." — [Heston et al. WP](https://www.acem.sjtu.edu.cn/sffs/2021w/pdfs/3.pdf)
- **Zhan et al. stability.** Profitability "has not diminished in recent years," was strong during 2008–09, and does not depend on sentiment or NBER cycles, through 2012. This contrasts with stock anomalies that weakened (Chordia et al. 2014; McLean & Pontiff 2015). The authors note option liquidity improved over the period. — [Zhan et al. 2016 WP](https://abfer.org/media/abfer-events-2016/annual-conference/investment-finance/226-option-return-predictability.pdf)
- **ML out-of-sample through 2020.** Nonlinear models' long-short portfolios are profitable out of sample and after costs, 1996–2020. — [Bali et al. 2023](https://www.wiwi.uni-muenster.de/fcm/en/publication/98329575)
- **Index VRP decline (index options, not single stocks).** Dew-Becker, I. & Giglio, S. (Sept 2025), "The Decline of the Variance Risk Premium: Evidence from Traded and Synthetic Options," Chicago Fed WP 2025-17. Equity *index* options historically had sharply negative returns and CAPM alphas, but "over the past 15 years, option alphas have become indistinguishable from zero." They explain this with an intermediary-based model. A search summary adds that delta-hedged 5% OTM puts and ATM straddles converged to zero alpha around 2020; I did not verify that detail in the PDF. — [Chicago Fed WP 2025-17](https://www.chicagofed.org/-/media/publications/working-papers/2025/wp2025-17.pdf)
- **Common-source critique (preprint, unverified).** Gerchik, "The Common Source of Option Return Anomalies," SSRN. A search summary describes it as arguing that most option anomalies are one effect: long-short portfolios hold options on volatile stocks, which are repriced at the monthly expiration roll. I did not read the paper. — [SSRN 7458380](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7458380)
- **General anomaly decay (equities, for context).** A JFQA paper finds equity anomaly gross returns decay about 50% after publication. Option-specific decay was not addressed. — [JFQA, "Zeroing In on the Expected Returns of Anomalies"](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/945133D5A3ECEEAF466AEE91551FD225/S0022109022000874a.pdf/zeroing-in-on-the-expected-returns-of-anomalies.pdf)

### Inferences
- None of the major single-stock option anomalies has "failed to replicate" in the narrow sense. Raw mid-quote spreads for IV−HV, term slope, IVOL, size and option momentum show up again in independent samples through 2019–2020.
- The reasons to expect smaller live returns are:
  - (a) much of the return is compensation for dynamic, priced option risk factors (Goyal & Saretto 2022), so it is not free alpha;
  - (b) the profit sits mostly on the short-vol leg, and the index VRP that underlies short-vol has compressed since about 2010;
  - (c) costs (Q4).
- Publication dates are recent: GS 2009, Cao-Han 2013, Vasquez 2017, Zhan et al. 2022, Heston et al. 2023, Bali et al. 2023. Most samples end before or near publication, so true post-publication decay is largely untested.

### Gaps
- I found no peer-reviewed or NBER/SSRN study (by October 2026) that formally tests post-publication decay of single-stock option anomalies, or that extends IV−HV, IVOL, term slope or option momentum through 2021–2025.
- The Gerchik preprint and the "expiration effects" explanation of option anomalies remain unverified.
- Whether single-stock delta-hedged returns shrank like the index VRP did is not established in the sources I found.
