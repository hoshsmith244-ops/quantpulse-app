# Options-Market Signals That Predict Returns of the Underlying Stock

Scope: variables built from option prices or option trading that forecast the cross-section of future stock returns (not option returns). Current date is October 2026. Effect sizes are as reported by the original papers unless noted. "OSAP" = Chen & Zimmermann's Open Source Asset Pricing replication project ([Chen & Zimmermann 2022, Critical Finance Review 11(2), "Open Source Cross-Sectional Asset Pricing"](https://papers.ssrn.com/abstract=3604626); signal metadata in [SignalDoc.csv](https://raw.githubusercontent.com/OpenSourceAP/CrossSection/master/SignalDoc.csv)).

Credibility flags used below: [PEER-REVIEWED], [WORKING PAPER], [PREPRINT, NOT PEER-REVIEWED], [THESIS / LOW CREDIBILITY], [SECONDARY SUMMARY].

---

## 1. Implied volatility skew / smirk (Xing, Zhang & Zhao 2010 and related)

### Takeaway
Xing, Zhang & Zhao (2010) found that stocks with the steepest smirk (OTM put IV minus ATM call IV) underperformed the flattest-smirk stocks by 10.9%/yr risk-adjusted in 1996–2005, with predictability lasting about 6 months. But the original statistical evidence was only moderate (OSAP records the weekly long-short t-stat as 2.19 and rates it only "likely"). The effect looks largely explained by stock borrow fees, and one 2026 preprint finds it decaying to insignificance at the 1-month horizon in 2023–2026.

### Cited Findings
- **Original claim [PEER-REVIEWED]:** Xing, Y., Zhang, X. & Zhao, R. (2010), "What Does the Individual Option Volatility Smirk Tell Us About Future Equity Returns?", *Journal of Financial and Quantitative Analysis* 45(3), 641–662. Stocks with the steepest smirks underperform stocks with the least pronounced smirks by **10.9% per year on a risk-adjusted basis**. Predictability persists for **at least 6 months**, and the steepest-smirk firms have the **worst earnings shocks in the following quarter**. The authors' interpretation is that informed traders with negative news buy OTM puts and the equity market is slow to absorb the information. — [IDEAS/RePEc record](https://ideas.repec.org/a/cup/jfinqa/v45y2010i03p641-662_00.html); [Cambridge journal page](https://resolve.cambridge.org/core/journals/journal-of-financial-and-quantitative-analysis/article/what-does-the-individual-option-volatility-smirk-tell-us-about-future-equity-returns/ECFD16BA9ACBDC8D577D1BD866FBEA72); [author PDF](https://www.ruf.rice.edu/~yxing/option-skew-FINAL.pdf)
- **Sample and construction:** daily option and stock data for all firms with listed options, **1996–2005**. The smirk is the IV of an OTM put minus the IV of an ATM call. The working-paper version of the hedge portfolio was long the lowest-smirk decile and short the highest-smirk decile, **rebalanced weekly**, earning about **15%/yr** risk-adjusted (market, size, B/M) **before transaction costs**. Over 90% of observations have positive smirks, and the median OTM put IV is about 5 percentage points above the ATM call IV. Returns diminish with holding period but persist up to about 6 months. Bimonthly rebalancing with a "rough" transaction-cost approximation suggested the strategy might still be profitable, but no net-of-cost figure is given. — [CXO Advisory summary of the 2008 WP](https://www.cxoadvisory.com/?p=1798) [SECONDARY SUMMARY]. The ~15% vs 10.9% gap reflects working-paper vs published versions.
- **OSAP replication metadata:** signal `skew1` (OP acronym OSmirkNTM) uses OptionMetrics options with 10–60 days to expiry, with volume/IV/price/open-interest filters. OSAP classifies its predictability in the original paper as **"2_likely"**, not "1_clear". The original test was **t = 2.19** in a weekly equal-weighted quintile sort (Table 3A), and OSAP notes that "the screens in the appendix are important", meaning the result is sensitive to data filters. — [OSAP SignalDoc.csv](https://raw.githubusercontent.com/OpenSourceAP/CrossSection/master/SignalDoc.csv)
- **Related "smile slope" signal [PEER-REVIEWED]:** Yan (2011, *Journal of Financial Economics*), "Jump risk, stock returns, and slope of implied volatility smile". The signal is put IV minus call IV (30-day, delta ±0.50), sampled at month end, sample 1996–2005, and is a negative predictor. OSAP records a **1.8%/month** equal-weighted quintile spread with **t = 8.17**, rated "1_clear". — [OSAP SignalDoc.csv](https://raw.githubusercontent.com/OpenSourceAP/CrossSection/master/SignalDoc.csv)
- **Independent confirmation in the original era:** Fu, Arisoy, Shackleton & Umutlu (2016, *Journal of Derivatives*), "Option-Implied Volatility Measures and Stock Return Predictability". The "5-1" skew-sorted arbitrage portfolios have average monthly returns that are always negative and statistically significant, both equal- and value-weighted. — [Lancaster eprint](https://eprints.lancs.ac.uk/id/eprint/80351/2/JoD_1_.pdf); [Liverpool repository](https://livrepository.liverpool.ac.uk/3002404/1/FuArisoyShackletonUmutlu2016.pdf)
- **Recent-sample decay [PREPRINT, NOT PEER-REVIEWED]:** Li, B. & Wang, M. (2026), "Option-Implied Signals and Crash Risk: Predictability and Machine-Learning Evidence from U.S. Equity Options", arXiv 2608.26115 (v1 dated 10 June 2026). The panel is **2015–2026**, about 12.36M firm-days across 10,026 underlyings, from a proprietary OPRA **end-of-day** extract, with a price ≥ $5 filter. It uses univariate panel regressions with two-way fixed effects and double-clustered SEs. Smirk coefficients (t-stats) by horizon and regime:
  - **Next day (h=1):** −0.0105 (−3.9) in 2015–19, −0.0037 (−4.2) in 2020–22, and −0.0032 (−4.1) in 2023–26.
  - **Next week (h=5):** −0.0151 (−5.1), then −0.0092 (−5.4), then −0.0053 (−2.9).
  - **Next month (h=21):** −0.0234 (−5.5), then −0.0150 (−4.2), then **−0.0060 (−1.5, insignificant)**.
  - **Three months (h=63):** −0.0256 (−3.5), then −0.0135 (−2.0), then **+0.0156 (+2.1, sign reversal)**.

  In joint regressions with the other canonical signals, the smirk is insignificant in every regime except 2023–26 (+0.016, t=+2.6, wrong sign). A 2015–2017 quintile sort gives high-minus-low **−0.409% over 21 days (≈ −4.9% annualized), about half the original magnitude**. — [arXiv abstract](https://arxiv.org/abs/2608.26115); [arXiv HTML](https://arxiv.org/html/2608.26115v1)
- **Same preprint, risk-neutral skewness:** its cross-strike skewness proxy (`rns_bkm`, *not* a full Bakshi-Kapadia-Madan estimator) stays negative and highly significant at h=21 in every regime: −0.0028 (t −10.5) in 2015–19, −0.0047 (−12.2) in 2020–22, and −0.0040 (−11.7) in 2023–26. — [arXiv HTML](https://arxiv.org/html/2608.26115v1)
- **Mechanism challenge [PEER-REVIEWED]:** Muravyev, Pearson & Pollet (2025, JFE 172) find that return predictability from both the **implied volatility spread and skew falls by at least two-thirds when high-borrow-fee stocks are excluded** (details under Question 6). — [IDEAS record](https://ideas.repec.org/a/eee/jfinec/v172y2025ics0304405x25001618.html); [Mendeley replication package](https://data.mendeley.com/datasets/n73cyx89gs/2)
- **Large-cap evidence (thin):** a *Financial Analysts Journal* (2012, vol. 68(4), pp. 56–72) study reports that skew-based strategies in a "well-investable universe of highly liquid U.S. large-cap stocks" yield significant returns and alphas after controlling for market, size, value, momentum and reversal. Only an abstract excerpt was available, so the authors and magnitudes were not verified. — [IDEAS record](https://ideas.repec.org/a/taf/ufajxx/v68y2012i4p56-72.html)

### Inferences
- The skew signal works best as a short-side "bad news" flag, which is the leg most exposed to borrow-fee and short-sale frictions. A long-only retail implementation would capture only the weaker flat-smirk long leg.
- The preprint shows the decay is horizon-dependent. Next-day/next-week coefficients are still significant in 2023–26 but about 1/3 of their 2015–19 size, while the monthly effect is gone. Very short-horizon remnants on EOD data may partly reflect microstructure or non-synchronous closes rather than exploitable information.
- Risk-neutral skewness (full-distribution) measures may be more robust than the simple OTM-put-minus-ATM-call smirk, but this rests on one non-peer-reviewed preprint using a proxy measure.

### Gaps
- No peer-reviewed post-2010 out-of-sample test of the exact XZZ smirk was found. The main recent evidence is a single unreviewed arXiv preprint whose arXiv ID ("2608") does not match its stated June 2026 submission date, which should be checked. Its two-way fixed-effects regressions also differ from XZZ's portfolio sorts.
- I could not retrieve XZZ's size-subsample tables to confirm whether the effect holds in large caps.
- Conrad, Dittmar & Ghysels (2013, JF) and Stilger, Kostakis & Poon (2017, Management Science) on risk-neutral skewness are relevant but were not verified in this session. My recollection is that they report conflicting signs.

---

## 2. Call–put implied volatility spread / put–call parity deviations (Cremers & Weinbaum 2010; Bali & Hovakimian 2009)

### Takeaway
Stocks whose calls are expensive relative to matched puts outperform stocks with relatively expensive puts. Cremers & Weinbaum (2010) found about **50 bps/week** in 1996–2005, with predictability **declining within their own sample**. Bali & Hovakimian's CIV−PIV spread earns about 1.0%/month value-weighted in OSAP's records. This is the most persistent option-price signal in recent data (still significant in the 2023–26 preprint), but its mechanism is now largely attributed to stock borrow fees.

### Cited Findings
- **Original claim [PEER-REVIEWED]:** Cremers, M. & Weinbaum, D. (2010), "Deviations from Put-Call Parity and Stock Return Predictability", *JFQA* 45(2), 335–367. The measure is the IV difference between matched call and put pairs (same strike and expiry). Stocks with relatively expensive calls outperform stocks with relatively expensive puts by **50 bps per week** (the working paper gave 51 bps/week, value-weighted, risk-adjusted). Abnormal performance shows up on **both** the long (expensive-call) and short (expensive-put) side. The authors argued the effect is not explained by short-sale constraints, citing stock-lending rebate rates. — [IDEAS record](https://ideas.repec.org/a/cup/jfinqa/v45y2010i02p335-367_00.html); [CXO Advisory WP summary](https://www.cxoadvisory.com/?p=1665) [SECONDARY]
- **Sample and conditioning:** 1996–2005. Predictability is **larger when option liquidity is high and stock liquidity is low**, with little predictability in the opposite case. Deviations are larger when the underlying faces more information risk, and more-levered (further OTM) options predict more strongly. **"The degree of predictability decreases over the sample period"**, which the authors read as early mispricing that gradually disappeared. — [IDEAS record](https://ideas.repec.org/a/cup/jfinqa/v45y2010i02p335-367_00.html)
- **Bali & Hovakimian [PEER-REVIEWED]:** Bali, T. G. & Hovakimian, A. (2009), "Volatility Spreads and Expected Stock Returns", *Management Science* 55(11), 1797–1812. Volatility *levels* (realized or implied) do not predict returns, but *spreads* do. The **call–put IV spread is significantly positively related** to future returns, which the authors interpret as a jump-risk proxy. — [INFORMS](https://pubsonline.informs.org/doi/fpi/10.1287/mnsc.1090.1063); [IAOR record](https://iaorifors.com/paper/65620)
- **OSAP metadata for Bali-Hovakimian CPVolSpread:** ATM call IV minus ATM put IV, sample **1996–2004**. The original reports **1.045%/month** (value-weighted quintile long-short, t = 4.2, Table 3 Panel B), rated "1_clear". OSAP notes that using all stocks rather than NYSE-only breakpoints comes closer to the paper's numbers. — [OSAP SignalDoc.csv](https://raw.githubusercontent.com/OpenSourceAP/CrossSection/master/SignalDoc.csv)
- **Post-sample replication [THESIS / LOW CREDIBILITY]:** a Copenhagen Business School master's thesis applying Cremers-Weinbaum's method to **Jan 2011–Dec 2015** reports 4-factor abnormal returns of **19 bps (t = 2.45) at one week and 73 bps (t = 2.79) at four weeks**. That is roughly 40% of the original weekly magnitude. These numbers come from a search-engine summary and were not verified against the full text. — [CBS thesis PDF](https://research-api.cbs.dk/ws/portalfiles/portal/60755923/306868_Trading_on_deviations_from_put_call_parity_and_mean_reversion.pdf)
- **Recent sample [PREPRINT, NOT PEER-REVIEWED]:** Li & Wang (2026) define the IV spread as ATM call IV minus ATM put IV. It remains positive and significant at the 1-month horizon in all regimes: **+0.0291 (t 6.6) in 2015–19, +0.0166 (4.8) in 2020–22, and +0.0151 (4.2) in 2023–26**. In joint regressions for 2023–26 it is +0.040 (t 5.4). The coefficient roughly halved from 2015–19 to 2023–26 but stayed significant. — [arXiv HTML](https://arxiv.org/html/2608.26115v1)
- **European evidence:** a study of European options found no evidence that the Cremers-Weinbaum strategy is profitable. Source identified only via search snippet. — [AUEB repository record](https://pyxida.aueb.gr/items/492b4004-31e3-49cf-b5a8-9f7a040f986d) [unverified details]

### Inferences
- Of the price-based option signals, the call–put IV spread has the best survival record in post-publication data: significant in 2011–15 (thesis) and 2015–26 (preprint), though at roughly 40–50% of the original magnitude.
- Cremers-Weinbaum's 1996–2005 within-sample decline and the halving of coefficients from 2015–19 to 2023–26 both point to continued arbitrage/decay.
- Because put–call parity deviations mechanically embed the borrow fee (see Q6), a big part of the "signal" is a borrow-fee proxy. Where a retail app shows a large negative call–put spread, that may simply flag a hard-to-borrow stock.

### Gaps
- No peer-reviewed post-2010 out-of-sample portfolio-sort replication of Cremers-Weinbaum with full net-of-cost numbers was found.
- The original paper's value-weighted vs equal-weighted split and size-subsample tables were not retrieved.

---

## 3. Changes in implied volatility (An, Ang, Bali & Cakici 2014)

### Takeaway
Stocks with large increases in call IV over the past month earn higher returns next month, and stocks with large increases in put IV earn lower returns. Decile spreads are about **1%/month** (1996–2011), persisting **up to six months**. The combined measure (ΔPut IV − ΔCall IV) is the strongest, with an OSAP-recorded original spread of **1.68%/month, t = 6.77**. The put-side alone is weak (t ≈ 2.0).

### Cited Findings
- **Original claim [PEER-REVIEWED]:** An, B.-J., Ang, A., Bali, T. G. & Cakici, N. (2014), "The Joint Cross Section of Stocks and Options", *Journal of Finance* 69(5), 2279–2337. Large increases in **call IV over the previous month predict high future returns**, and large increases in **put IV predict low future returns**. Decile portfolios sorted on past call-IV changes produce **return spreads of about 1% per month**, which **persist up to six months**. In the reverse direction, high-return stocks see call and put IVs rise next month even as realized volatility falls. The authors read this as slow information diffusion across the option and stock markets, consistent with informed trading in both. — [SSRN 2008902](https://papers.ssrn.com/abstract=2008902); [NBER w19590](https://www.nber.org/papers/w19590.pdf); [Columbia Business School page](https://business.columbia.edu/faculty/research/joint-cross-section-stocks-and-options)
- **Data:** daily stock returns and OptionMetrics volatility-surface IVs, **January 1996–December 2011**, using 30-day, delta-0.5 options (i.e., end-of-day standardized surface points). — [SSRN 2008902](https://papers.ssrn.com/abstract=2008902)
- **OSAP metadata (original-paper numbers, equal-weighted deciles, monthly):**
  - **dVolCall:** **1.09%/month, t = 3.45**, rated "1_clear".
  - **dVolPut:** **0.42%/month (negative sign), t = 2.03**, rated only "2_likely".
  - **dCPVolSpread** (ΔPut IV − ΔCall IV): **1.68%/month (negative sign), t = 6.77**, rated "1_clear".

  — [OSAP SignalDoc.csv](https://raw.githubusercontent.com/OpenSourceAP/CrossSection/master/SignalDoc.csv)

### Inferences
- The OSAP numbers are equal-weighted, so they likely overweight small stocks. Value-weighted effects are probably smaller, but this was not verified.
- The IV-change signal can be computed entirely from end-of-day OptionMetrics-style IV surfaces at a monthly horizon. It is one of the more daily-bar-friendly signals, but it is also exposed to the borrow-fee critique, since a rising put-minus-call IV gap is consistent with rising borrow fees.

### Gaps
- No post-2011 out-of-sample test of the An et al. signals specifically was found. The 2026 preprint did not test IV changes.
- Value-weighted results, large-cap subsamples and transaction-cost-adjusted returns were not retrieved.

---

## 4. Option volume, put–call ratios and informed trading (Pan & Poteshman 2006; Johnson & So 2012; Ge, Lin & Pearson 2016)

### Takeaway
Volume-based signals are strong at **very short horizons**: Pan & Poteshman's open-buy put–call ratio gives more than 40 bps next day and more than 1% next week. However, the strongest versions need **signed, open/close-classified volume** that is not in standard public EOD data, and the authors attribute the predictability to non-public information. The simpler, publicly computable O/S ratio (Johnson & So) gives about **0.34%/week** (≈19.3%/yr) for the low-minus-high decile in 1996–2010. Ge, Lin & Pearson show the information comes mainly from **opening call purchases (leverage)**.

### Cited Findings
- **Pan & Poteshman [PEER-REVIEWED]:** Pan, J. & Poteshman, A. M. (2006), "The Information in Option Volume for Future Stock Prices", *Review of Financial Studies* 19(3), 871–908 (NBER WP w10925). Put–call ratios are built from **volume initiated by buyers opening new positions**, using proprietary CBOE data. On a risk-adjusted basis, low-PCR stocks outperform high-PCR stocks by **more than 40 bps on the next day and more than 1% over the next week**. Predictability is greater for stocks with higher concentrations of informed traders and for higher-leverage contracts. Decomposing into publicly and non-publicly observable components, the authors conclude the **economic source is non-public information held by option traders, not market inefficiency**. — [NBER w10925](https://www.nber.org/papers/w10925); [SUFE abstract listing](https://academicnewsletter.sufe.edu.cn/info/355439)
- **Johnson & So [PEER-REVIEWED]:** Johnson, T. L. & So, E. C. (2012), "The Option to Stock Volume Ratio and Future Returns", *Journal of Financial Economics* 106(2), 262–286, DOI 10.1016/j.jfineco.2012.05.008. Firms in the **lowest O/S decile outperform the highest by ~0.34% per week (~19.3% annualized)**. The model attributes the negative O/S–return relation to short-sale costs, which push informed negative-news traders into options. Predictability is **stronger when short-sale costs are high or option leverage is low**, and O/S predicts future firm-specific earnings news. — [IDEAS record](https://ideas.repec.org/a/eee/jfinec/v106y2012i2p262-286.html); [SUFE abstract](https://academicnewsletter.sufe.edu.cn/info/356813). An earlier SSRN summary reported 1.47%/month risk-adjusted for the low-O/S decile ([Quantpedia, 2012](https://vvv.quantpedia.com/?p=527) [SECONDARY]).
- **OSAP metadata for Johnson-So:**
  - **OptionVolume1** (O/S): sample **1996–2010**, CAPM-alpha weekly decile sort (deciles 9+10 vs 1+2), recorded **t = 3.45**. Rated "1_clear" for predictability but only "2_fair" for replication quality.
  - **OptionVolume2** (O/S relative to its t−6 to t−1 average): **t = 2.45**, rated "2_likely". Filters: |price| > $1, share codes ≤ 11.

  — [OSAP SignalDoc.csv](https://raw.githubusercontent.com/OpenSourceAP/CrossSection/master/SignalDoc.csv)
- **Ge, Lin & Pearson [PEER-REVIEWED]:** Ge, L., Lin, T.-C. & Pearson, N. D. (2016), "Why Does the Option to Stock Volume Ratio Predict Stock Returns?", *JFE* 120(3), 601–622. Using signed option volume, they find **no evidence that synthetic-short-related trades are more informative than synthetic-long trades**. **Purchases of calls that open new positions are the strongest predictor**, followed by closing sales of previously bought calls. They conclude that **embedded leverage** is the most important channel through which option trading predicts stock returns. — [IDEAS record](https://ideas.repec.org/a/eee/jfinec/v120y2016i3p601-622.html); [Monash record](https://research.monash.edu/en/publications/why-does-the-option-to-stock-volume-ratio-predict-stock-returns/)
- **O/S vs P/C:** Blau, Nguyen & Whitby (2014, *Journal of Banking & Finance* 43, 179–187) find that **O/S ratios contain more predictive information than put–call ratios** at weekly and monthly horizons. — [IDEAS record](https://ideas.repec.org/a/eee/jbfina/v43y2014icp179-187.html)
- **Lineage:** Roll, Schwartz & Subrahmanyam (2010) introduced the O/S measure and argued its variation reflects informed option trading. — [Emerald JDQS 2023/24 article](https://www.emerald.com/insight/content/doi/10.1108/JDQS-11-2023-0036)
- **Out-of-market check:** a Korean-market study (*Journal of Derivatives and Quantitative Studies*) finds O/S **positively** related to future returns, opposite to the U.S. result. — [Emerald JDQS](https://www.emerald.com/insight/content/doi/10.1108/JDQS-11-2023-0036)
- **Recent sample [PREPRINT]:** Li & Wang (2026) include put–call volume and OI ratios in their signal set, but the retrieved text does not report their coefficients. No canonical hand-engineered signal ranked in the top five by permutation importance in their ML models. — [arXiv abstract](https://arxiv.org/abs/2608.26115)

### Inferences
- The publicly observable EOD put–call volume ratio (total put volume / call volume) is **not** the Pan-Poteshman signal. Their result relies on the open-buy classification, and the authors attribute the effect to non-public information. A retail app using raw public PCR should not expect Pan-Poteshman magnitudes.
- O/S can be computed from daily public volume data and was tested at weekly horizons. Its effect concentrates where short-sale costs are high, so it overlaps with the borrow-fee channel (Q6).
- Ge-Lin-Pearson implies the useful sub-signal is bullish leverage-seeking call buying (opening purchases). That needs open/close-classified data, which is a paid data product, not standard EOD bars.

### Gaps
- Pan-Poteshman's exact sample period was not re-verified in this session (my recollection is CBOE data 1990–2001). No post-publication replication of the open-buy PCR effect was found.
- No post-2010 out-of-sample test of Johnson-So O/S was found.
- Current availability and cost of CBOE/ISE open-close volume data were not verified.

---

## 5. Implied vs realized volatility spread (Bali & Hovakimian 2009)

### Takeaway
The realized-minus-implied volatility spread (RV − IV) **negatively** predicts stock returns. In the original 1996–2004 sample it earned about **0.73%/month** (value-weighted quintile spread, t = 2.9 per OSAP). A 2024 working paper reports that the predictability **does not hold** in its (more recent) sample, consistent with post-publication decay.

### Cited Findings
- **Original claim [PEER-REVIEWED]:** Bali & Hovakimian (2009), *Management Science* 55(11), 1797–1812, sample **1996–2004**. Portfolio sorts and firm-level cross-sectional regressions show a **negative and significant relation between expected returns and the realized-implied volatility spread**, which the authors interpret as a proxy for volatility risk. — [INFORMS](https://pubsonline.informs.org/doi/fpi/10.1287/mnsc.1090.1063); [CXO Advisory summary](https://www.cxoadvisory.com/volatility-effects/sources-of-volatilitys-predictive-power-for-stock-returns) [SECONDARY]
- **OSAP metadata, RIVolSpread:** realized volatility over the past 30 days minus ATM IV. The original reports **0.732%/month, t = 2.9** (value-weighted quintile, Table 3 Panel A), rated "1_clear". OSAP notes that all-stock (not NYSE-only) breakpoints come closer to the paper. — [OSAP SignalDoc.csv](https://raw.githubusercontent.com/OpenSourceAP/CrossSection/master/SignalDoc.csv)
- **Recent failure [WORKING PAPER]:** an EFMA 2024 (Lisbon) paper, "Stock Return Predictability of Realized-Implied Volatility Spread", states that RVol−IVol predictability **does not hold** for stocks in its sample and invokes McLean & Pontiff's post-publication decay. Full text could not be retrieved (TLS error), so the sample period and magnitudes are unknown. — [EFMA 2024 PDF](http://www.efmaefm.org/0EFMAMEETINGS/EFMA%20ANNUAL%20MEETINGS/2024-Lisbon/papers/ATR_RVolIVOl_Complete.pdf) (finding reported via search summary)
- **Market-level analogue:** Atilgan, Bali & Demirtas (2015, *Journal of Business & Economic Statistics*) find a significantly negative link between volatility spreads and expected **aggregate market** returns at daily and weekly frequencies. — [IDEAS record](https://ideas.repec.org/a/taf/jnlbes/v33y2015i1p87-101.html)
- **Earnings-announcement variant:** Atilgan (2014, *Journal of Banking & Finance* 38, 205–215), "Volatility spreads and earnings announcement returns". — [IDEAS record](https://ideas.repec.org/a/eee/jbfina/v38y2014icp205-215.html) (details not retrieved)

### Inferences
- RV − IV is the weakest of the original signals (t = 2.9 at origination) and the only one with a direct report of failure in recent data. It should be treated as decayed or unreliable for a retail app.
- RV can be computed from daily stock bars and IV from EOD option data, so the signal is fully daily-bar implementable. Implementability is not the problem; the evidence is.

### Gaps
- The EFMA 2024 paper's authors, sample and magnitudes could not be verified.

---

## 6. Have these effects weakened post-publication or in recent samples? What explains them?

### Takeaway
Yes, broadly. The strongest recent evidence is mechanistic: Muravyev, Pearson & Pollet (JFE 2025) show option-implied predictability (IV spread, skew and "similar" other option predictors) **falls by at least two-thirds when high-borrow-fee stocks are excluded**. That means most of the "alpha" sits in hard-to-short stocks whose borrow costs consume it. Within-sample decline was already documented by Cremers-Weinbaum (1996–2005). A 2026 preprint shows the skew effect insignificant at 1 month by 2023–26, while the call–put IV spread survives at about half strength.

### Cited Findings
- **Borrow-fee explanation [PEER-REVIEWED]:** Muravyev, D., Pearson, N. D. & Pollet, J. M. (2025), "Why Does Options Market Information Predict Stock Returns?", *Journal of Financial Economics* 172 (October 2025). They derive a formula linking the option-implied volatility spread to the stock borrow fee and find predictability consistent with IVs reflecting borrow fees, which are known to predict returns. **Predictability from the IV spread and skew decreases by at least two-thirds if high-fee stocks are excluded**, and patterns for other option-implied predictors are similar. — [IDEAS record](https://ideas.repec.org/a/eee/jfinec/v172y2025ics0304405x25001618.html); [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0304405X25001618); [Mendeley replication package](https://data.mendeley.com/datasets/n73cyx89gs/2)
- **Working-paper version (2022):** abnormal return predictability from option signals falls by **about two-thirds after adjusting returns for borrow fees**, and unadjusted returns fall by a similar amount when high-fee stocks are excluded. — [2022 Derivatives conference PDF](https://fmai.memberclicks.net/assets/docs/Derivatives2022/MuravyevPearsonPollet.pdf); [AEA 2023 program](https://www.aeaweb.org/conference/2023/program/paper/RsBt64RZ)
- **Context from the University of Illinois (Gies) press summary:** once the borrow fee is included, the strategies' performance moves "much closer to zero". **Only about 10% of stocks have a borrow fee of 2% or more**. CRSP does not include borrow-fee data, and retail investors cannot easily see the fee on platforms like Yahoo Finance. — [Gies news, Jan 2026](https://giesbusiness.illinois.edu/news/2026/01/07/study--borrowing-fee-is-the-variable-that-debunks-theory-that-options-predict-future-stock-returns)
- **Companion result:** in "Is There a Risk Premium in the Stock Lending Market? Evidence from Equity Options" (*Journal of Finance* 2022), the option-implied lending fee predicts future realized lending fees and stock returns better than actual lending fees. When both are included, the implied lending fee predicts returns but the **IV spread and skew do not**. A third paper, "Anomalies and Their Short-Sale Costs", appeared in JF in December 2025. — [search summary of MPP publications](https://giesbusiness.illinois.edu/profile/dmitriy-muravyev); [Mendeley package](https://data.mendeley.com/datasets/n73cyx89gs)
- **Contrast with original claim:** Cremers & Weinbaum (2010) had argued their result was *not* driven by hard-to-borrow stocks, based on rebate rates. MPP (2025) contradicts this using fuller borrow-fee data. — [IDEAS CW record](https://ideas.repec.org/a/cup/jfinqa/v45y2010i02p335-367_00.html) vs [IDEAS MPP record](https://ideas.repec.org/a/eee/jfinec/v172y2025ics0304405x25001618.html)
- **Within-sample decay:** Cremers-Weinbaum report that "the degree of predictability decreases over the sample period" (1996–2005). — [IDEAS record](https://ideas.repec.org/a/cup/jfinqa/v45y2010i02p335-367_00.html)
- **Regime evidence, 2015–2026 [PREPRINT, NOT PEER-REVIEWED]:**
  - **Skew:** the smirk-return relation "weakens over time and is insignificant in the latest regime" (2023–26).
  - **Survivors:** the Cremers-Weinbaum spread and risk-neutral skewness remain significant.
  - **Machine learning:** a boosted-tree model beats linear models for next-month returns **only in 2023–26**, with OOS R² of +1.29% vs +0.07% for linear models.
  - **Signal importance:** leading predictors differ by regime, and **no canonical hand-engineered signal ranks in the top five**. The authors call option-implied predictability "real but regime-dependent".

  — [arXiv 2608.26115](https://arxiv.org/abs/2608.26115)
- **Replication databases:** Chen & Zimmermann (2022, CFR) reproduce 319 characteristics. **98% of the 161 "clear" predictors reproduce with t > 1.96**, and those with mixed original evidence reproduce at t ≈ 2 on average. Option-based signals in OSAP and their original-paper classifications: SmileSlope, CPVolSpread, RIVolSpread, dVolCall and dCPVolSpread are "clear"; skew1, dVolPut and OptionVolume2 are "likely"; OptionVolume1 is "clear" with "fair" replication quality. OSAP replication covers the *original* sample periods and does not show post-publication performance. — [SSRN 3604626](https://papers.ssrn.com/abstract=3604626); [Federal Reserve FEDS page](https://www.federalreserve.gov/econres/feds/open-source-cross-sectional-asset-pricing.htm); [OSAP SignalDoc.csv](https://raw.githubusercontent.com/OpenSourceAP/CrossSection/master/SignalDoc.csv)

### Inferences
- The best current reading is that much of the documented option-signal "predictability" is compensation for, or a proxy of, short-sale costs. It is real in gross returns but largely unharvestable, especially by a retail user who cannot short hard-to-borrow names or would pay high borrow fees.
- Roughly one-third of the original predictability may survive among low-fee stocks (by implication of "at least two-thirds" reduction). Combined with post-2010 coefficient shrinkage of about 50% (CW spread) and to insignificance (XZZ skew at 1 month), the residual expected edge for a long-only, low-fee universe is plausibly small, perhaps a fraction of 1%/month gross before costs. This is an inference, not a measured number.
- The general post-publication decay literature (McLean & Pontiff 2016) is consistent with this pattern but was not directly verified here (see Gaps).

### Gaps
- MPP 2025's exact sample period, baseline and fee-adjusted long-short returns per signal, and subperiod splits were not retrievable. The PDFs downloaded as binary and could not be parsed (no PDF text tool was available in this environment); ScienceDirect returned 403.
- McLean & Pontiff (2016, JF) aggregate decay figures (my recollection: about 26% lower out-of-sample and about 58% lower post-publication) were not verified in this session.
- I believe Hou, Xue & Zhang (2020, RFS, "Replicating Anomalies") and Jensen, Kelly & Pedersen (2023, JF, "Is There a Replication Crisis in Finance?") use CRSP/Compustat-based characteristics and **do not include OptionMetrics-based signals**, so they provide no direct replication of these option signals. This was not verified in this session.
- No peer-reviewed study was found that tracks each option signal's performance post-2010 or post-2015 in a single consistent framework.

---

## 7. Do they work in large caps or only in small / illiquid / hard-to-short stocks?

### Takeaway
The evidence points to concentration where **stock liquidity is low, short-sale costs are high, information asymmetry is high, and option liquidity is high**. Those are typically smaller, harder-to-borrow names. Large-cap evidence exists but is thin and was not verified in detail.

### Cited Findings
- **Cremers & Weinbaum:** predictability is larger when **option liquidity is high and stock liquidity is low**, with little predictability when the reverse holds. Deviations are larger for stocks with more information risk (controlling for size). — [IDEAS record](https://ideas.repec.org/a/cup/jfinqa/v45y2010i02p335-367_00.html)
- **Johnson & So:** O/S predictability is **stronger when short-sale costs are high** or option leverage is low. — [SUFE abstract](https://academicnewsletter.sufe.edu.cn/info/356813)
- **Pan & Poteshman:** predictability is greater for stocks with **higher concentrations of informed traders**. — [NBER w10925](https://www.nber.org/papers/w10925)
- **Muravyev, Pearson & Pollet:** predictability falls by at least two-thirds when **high-fee stocks** (about 10% of stocks have fees ≥ 2%) are excluded. — [IDEAS record](https://ideas.repec.org/a/eee/jfinec/v172y2025ics0304405x25001618.html); [Gies news](https://giesbusiness.illinois.edu/news/2026/01/07/study--borrowing-fee-is-the-variable-that-debunks-theory-that-options-predict-future-stock-returns)
- **Option transaction costs:** around earnings announcements, option-implied volatility measures predict stock returns significantly more strongly for firms with **lower option relative bid-ask spreads**. There is no significant effect of option costs on randomly chosen non-event dates. — [HIT scholar record](https://scholar.hit.edu.cn/en/publications/the-effect-of-option-transaction-costs-on-informed-trading-in-the/); [vLex copy](https://law-journals-books.vlex.com/vid/the-effect-of-option-855679688) (authors/journal not verified)
- **Large-cap skew strategies:** an FAJ 2012 (68(4), 56–72) study reports significant returns and alphas for skew-based strategies in a liquid U.S. large-cap universe. Only an abstract excerpt was seen. — [IDEAS record](https://ideas.repec.org/a/taf/ufajxx/v68y2012i4p56-72.html)
- **Weighting matters (OSAP):** several of the headline original numbers are **equal-weighted** (Yan SmileSlope, An et al. dVolCall/dVolPut/dCPVolSpread, XZZ skew1, Johnson-So O/S). Bali-Hovakimian's CPVolSpread and RIVolSpread are **value-weighted** quintiles. — [OSAP SignalDoc.csv](https://raw.githubusercontent.com/OpenSourceAP/CrossSection/master/SignalDoc.csv)
- **Recent preprint:** no size split; only a price ≥ $5 filter. — [arXiv HTML](https://arxiv.org/html/2608.26115v1)

### Inferences
- Equal-weighted headline numbers and conditioning on low stock liquidity and high short-sale costs suggest effects are materially weaker in mega/large caps. The value-weighted Bali-Hovakimian CIV−PIV result (1.045%/month, 1996–2004) is the main counterexample from the original era.
- The 2023–26 "AI/mega-cap concentration" regime is where the preprint finds the smirk dead at one month. That is weakly consistent with large-cap-dominated markets not supporting the skew effect, but the preprint did not test size directly.

### Gaps
- No source directly compared S&P 500 vs small-cap predictability for each signal in post-2010 data.
- The size-subsample tables of XZZ, CW, An et al. and Johnson-So were not retrieved.

---

## 8. Holding horizons and whether end-of-day (daily-bar) data suffices

### Takeaway
IV-based signals (skew, call–put spread, IV changes, RV−IV) were all built from **end-of-day OptionMetrics** data and tested at **weekly to monthly** horizons, so they are implementable with daily bars plus EOD option quotes or IV surfaces. Volume-based signals with the largest effects (Pan-Poteshman open-buy PCR; Ge-Lin-Pearson opening call purchases) need **signed open/close-classified volume**, not just public EOD volume. Their horizons are **1 day to 1 week**.

### Cited Findings
| Signal (paper) | Data used | Rebalance / horizon | Original effect | Source |
|---|---|---|---|---|
| Smirk (XZZ 2010) | Daily OptionMetrics, 1996–2005 | Weekly rebalance; persists ~6 months | 10.9%/yr risk-adj. (pub.); ~15%/yr decile (WP) | [IDEAS](https://ideas.repec.org/a/cup/jfinqa/v45y2010i03p641-662_00.html); [CXO](https://www.cxoadvisory.com/?p=1798) |
| Smile slope (Yan 2011) | OptionMetrics 30-day, delta ±0.5, month-end | Monthly | 1.8%/mo EW quintile, t=8.17 | [OSAP](https://raw.githubusercontent.com/OpenSourceAP/CrossSection/master/SignalDoc.csv) |
| Call–put IV spread (CW 2010) | Matched call/put pairs, 1996–2005 | Weekly | 50 bps/week | [IDEAS](https://ideas.repec.org/a/cup/jfinqa/v45y2010i02p335-367_00.html) |
| CIV−PIV (BH 2009) | ATM IVs, 1996–2004 | Monthly | 1.045%/mo VW quintile, t=4.2 | [OSAP](https://raw.githubusercontent.com/OpenSourceAP/CrossSection/master/SignalDoc.csv) |
| RV−IV (BH 2009) | 30-day RV minus ATM IV | Monthly | 0.732%/mo VW quintile, t=2.9 | [OSAP](https://raw.githubusercontent.com/OpenSourceAP/CrossSection/master/SignalDoc.csv) |
| ΔCall IV / ΔPut IV (AABC 2014) | OptionMetrics surface, 30-day delta 0.5, 1996–2011 | Monthly; persists up to 6 months | ~1%/mo decile; dCPVolSpread 1.68%/mo t=6.77 | [SSRN](https://papers.ssrn.com/abstract=2008902); [OSAP](https://raw.githubusercontent.com/OpenSourceAP/CrossSection/master/SignalDoc.csv) |
| Open-buy PCR (PP 2006) | Proprietary CBOE open/close signed volume | Next day / next week | >40 bps next day; >1% next week | [NBER](https://www.nber.org/papers/w10925) |
| O/S (JS 2012) | Option and stock volume, 1996–2010 | Weekly | ~0.34%/week decile (~19.3%/yr) | [IDEAS](https://ideas.repec.org/a/eee/jfinec/v106y2012i2p262-286.html) |
| Signed volume (GLP 2016) | Signed open/close option volume | — | Opening call buys strongest | [IDEAS](https://ideas.repec.org/a/eee/jfinec/v120y2016i3p601-622.html) |

- **EOD data in recent replication:** the 2026 preprint uses only an **end-of-day OPRA snapshot** (no intraday, order book or signed trades). It still finds significant next-day and next-week smirk coefficients in 2023–26 (h=1: −0.0032, t −4.1; h=5: −0.0053, t −2.9) while the monthly effect has vanished. The IV spread remains significant at one month. The authors list the lack of intraday or signed-trade data as a limitation. — [arXiv HTML](https://arxiv.org/html/2608.26115v1)

### Inferences
- Daily-bar implementation is adequate for IV-surface-based signals, which were all originally built from EOD data at weekly or monthly rebalancing. Intraday data is not required. For a retail app, the binding constraints are borrow fees and short-side access (Q6), decay (Q6) and transaction costs, not data frequency.
- Where an effect survives in recent data, it is shifting toward shorter horizons (days to a week rather than a month, per the preprint). That raises turnover and the relative weight of trading costs, and it raises the risk that EOD "next-day" predictability is partly an artifact of non-synchronous option vs stock closing times. Standard practice is to skip a day between signal and return measurement; whether the preprint did so was not verified.
- Public EOD total put–call volume ratios are not equivalent to Pan-Poteshman's signal. A retail app cannot replicate the >40 bps/day result without paid open/close-classified volume, and even then the original authors attribute it to non-public information.

### Gaps
- The non-synchronous-close bias in EOD option data (option markets historically closing minutes after equities) is widely discussed in the literature (e.g., Battalio & Schultz 2006 on put–call parity), but it was not verified in this session.
- No source was found reporting net-of-transaction-cost returns for any of these signals in post-2010 data.
- Whether the preprint's h=1 results skip a day after signal formation was not determined.
