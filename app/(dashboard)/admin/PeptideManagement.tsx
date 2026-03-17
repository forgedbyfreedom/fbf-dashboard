'use client'

import { useState } from 'react'

interface PeptideSize {
  label: string
  price: number
}

interface Peptide {
  name: string
  category: string
  sizes: PeptideSize[]
  short: string
  full: string
}

const PEPTIDES: Peptide[] = [
  {
    name: 'RETATRUTIDE',
    category: 'GLP/Fat Loss',
    sizes: [
      { label: '30mg', price: 125 },
      { label: '40mg', price: 150 },
    ],
    short: 'Triple-agonist targeting GLP-1, GIP, and Glucagon receptors. Most powerful weight-loss peptide ever studied.',
    full: `Mechanism of Action: Retatrutide is a first-in-class triple incretin receptor agonist that simultaneously activates three distinct receptor pathways — GLP-1 (glucagon-like peptide-1), GIP (glucose-dependent insulinotropic polypeptide), and Glucagon receptors. GLP-1 activation suppresses appetite at the hypothalamic level and slows gastric emptying. GIP activation enhances nutrient-sensing insulin secretion and promotes favorable lipid metabolism and fat redistribution. Glucagon receptor activation increases hepatic glucose output and, crucially, ramps up energy expenditure and thermogenesis — this is the differentiator from dual-agonists like tirzepatide.

Clinical Data: In the Phase 2 trial (Jastreboff et al., NEJM 2023), participants on the highest dose (12mg) achieved an average of 24.2% total body weight loss at 48 weeks — the highest ever recorded for an anti-obesity medication. 100% of participants on this dose lost at least 5% body weight, 93% lost at least 10%, and 83% lost at least 15%. Phase 3 trials are ongoing with expected completion in 2025-2026. The glucagon component appears to provide metabolic benefits beyond weight loss, including improved lipid profiles and potential NASH/MAFLD benefits.

Dosing Protocol: Administered as a once-weekly subcutaneous injection. Titration schedule: start at 0.5mg/week for weeks 1-2, increase to 1mg weeks 3-4, then escalate monthly up to target dose. Typical maintenance dose: 4-5mg/week for males, 2-4mg/week for females, adjusted based on tolerability and response. Half-life is approximately 6 days, supporting weekly dosing. Common side effects include nausea (usually transient during titration), decreased appetite, diarrhea, and injection site reactions. Contraindicated in patients with personal or family history of medullary thyroid carcinoma or MEN2. Stacking: pairs well with Tesofensine for CNS appetite control via a different pathway. Can be combined with GH secretagogues for body composition optimization. Store lyophilized powder at room temperature; reconstituted solution must be refrigerated at 36-46°F (2-8°C) and used within 30 days.`,
  },
  {
    name: 'TESOFENSINE',
    category: 'CNS/Fat Loss',
    sizes: [{ label: 'capsule', price: 90 }],
    short: 'Triple monoamine reuptake inhibitor. CNS appetite suppression + energy boost.',
    full: `Mechanism of Action: Tesofensine is a novel triple monoamine reuptake inhibitor that blocks the reuptake of serotonin (5-HT), dopamine (DA), and norepinephrine (NE) at presynaptic transporters. Originally developed by NeuroSearch for Alzheimer's and Parkinson's disease, significant weight loss was observed as a "side effect" in neurological trials, prompting its repositioning as an anti-obesity agent. Serotonin reuptake inhibition reduces appetite and cravings; dopamine reuptake inhibition increases motivation, reward from smaller meals, and energy; norepinephrine reuptake inhibition boosts metabolic rate and thermogenesis.

Clinical Data: In the TIPO-1 Phase 2 trial, tesofensine produced dose-dependent weight loss of 6.7% (0.25mg), 11.3% (0.5mg), and 12.8% (1.0mg) at 24 weeks vs. 2.2% for placebo — all while patients were on a controlled diet. Notably, it reduced visceral fat disproportionately. Heart rate increased modestly (7-8 bpm) at higher doses. The 0.5mg dose showed the best risk-benefit profile. The compound has also shown improvements in quality of life scores and eating behavior metrics.

Dosing Protocol: Oral capsule taken once daily in the morning with or without food. Standard dose: 0.25-0.5mg daily. Do NOT exceed 1.0mg/day. Half-life is approximately 8-9 days, meaning it builds to steady-state over several weeks and effects persist even after discontinuation. This makes it ideal for use during receptor reset phases when injectable peptides are paused. Side effects: dry mouth, insomnia, constipation, mild heart rate elevation. Monitor blood pressure and heart rate. Contraindicated in uncontrolled hypertension, tachycardia, history of stroke/TIA, or concurrent use of MAOIs/SSRIs/SNRIs. Stacking: works through a completely different mechanism than GLP-1/GIP/Glucagon agonists, making it an excellent complement to Retatrutide. Can be used continuously through peptide cycling periods. Store at room temperature in original packaging, away from moisture.`,
  },
  {
    name: 'CAGRILINTIDE',
    category: 'Satiety',
    sizes: [{ label: '10mg', price: 100 }],
    short: 'Long-acting amylin receptor agonist. Extends satiety between meals.',
    full: `Mechanism of Action: Cagrilintide is a long-acting acylated analog of amylin, a 37-amino-acid peptide hormone co-secreted with insulin by pancreatic beta cells in response to nutrient intake. It activates the amylin receptor (a heterodimer of the calcitonin receptor with RAMP1, RAMP2, or RAMP3) in the area postrema and nucleus tractus solitarius of the brainstem. This activation promotes meal-ending satiation, slows gastric emptying, and suppresses post-meal glucagon secretion. Unlike GLP-1 agonists, amylin signaling primarily governs inter-meal satiety and portion control — the sensation of "being done" and staying satisfied between meals.

Clinical Data: Cagrilintide is the amylin component of Novo Nordisk's CagriSema (cagrilintide + semaglutide), which achieved up to 15.6% body weight loss in Phase 2 trials at 32 weeks. In monotherapy studies, cagrilintide 4.5mg produced approximately 10.8% weight loss at 26 weeks. The REDEFINE trials (Phase 3 for CagriSema) demonstrated the additive benefit of amylin agonism on top of GLP-1 agonism, confirming that these are complementary, non-overlapping pathways. Cagrilintide alone also improved glycemic control in type 2 diabetes.

Dosing Protocol: Weekly subcutaneous injection. Titrate from 0.25mg weekly, increasing every 4 weeks through 0.5mg, 1.0mg, 1.7mg, to a target of 2.4mg/week. In the FBF protocol, introduced at Week 9 after GLP-1 pathway adaptation. Half-life is approximately 7 days (160 hours), supporting weekly dosing. Side effects: nausea (usually mild and transient), injection site reactions, headache. Generally very well tolerated with milder GI side effects than GLP-1 agonists. Contraindicated in gastroparesis or severe gastrointestinal motility disorders. Stacking: specifically designed to complement Retatrutide — activates a fourth receptor system (amylin) that Retatrutide does not engage. This four-receptor approach (GLP-1 + GIP + Glucagon + Amylin) provides the most comprehensive appetite and metabolic signaling coverage available. Store lyophilized at room temperature; reconstituted at 36-46°F (2-8°C), use within 30 days.`,
  },
  {
    name: 'CJC-1295 (DAC)',
    category: 'Growth Hormone',
    sizes: [{ label: '10mg', price: 65 }],
    short: 'GHRH analog with extended half-life. Sustained GH elevation for days.',
    full: `Mechanism of Action: CJC-1295 with DAC (Drug Affinity Complex) is a synthetic analog of Growth Hormone Releasing Hormone (GHRH, also known as GHRF or somatoliberin) with a covalently attached maleimidopropionic acid-lysine linker that binds to serum albumin in vivo. This albumin conjugation extends the half-life from minutes (native GHRH) to approximately 6-8 days. It binds to the GHRH receptor (GHRHR) on somatotroph cells in the anterior pituitary, stimulating the synthesis and secretion of growth hormone via the cAMP/PKA signaling cascade. Unlike exogenous HGH, CJC-1295 works within the body's feedback system, producing elevated but physiologically patterned GH secretion.

Clinical Data: In clinical studies by ConjuChem (the original developer), a single subcutaneous dose of CJC-1295 DAC increased mean plasma GH levels 2-10 fold for 6+ days and increased IGF-1 levels 1.5-3 fold for 9-11 days. In a multi-dose study (30, 60, or 90 mcg/kg weekly for 4 weeks), GH and IGF-1 levels were elevated in a dose-dependent manner with no serious adverse effects. No tachyphylaxis (tolerance) was observed over the study period. The sustained GH elevation profile is distinct from the pulsatile pattern seen with GHRP-type secretagogues.

Dosing Protocol: Subcutaneous injection 1-2 times per week due to the extended half-life. Typical dose: 1-2mg per injection, administered before bedtime to augment the natural nocturnal GH surge. Half-life: 6-8 days. Onset of meaningful IGF-1 elevation: 3-5 days after first dose. Full steady-state: 2-3 weeks. Side effects: water retention (usually transient), tingling/numbness in extremities, fatigue during initial adaptation, injection site reactions. Fasting for 1-2 hours before and after injection is recommended but less critical than with non-DAC variants. Contraindicated in active malignancy or history of pituitary tumors. Stacking: synergistic with Ipamorelin — CJC-1295 raises the baseline GH "tide" while Ipamorelin triggers acute GH "waves" on top, producing superior total GH output compared to either alone. This is the most popular GH secretagogue stack. Can also pair with Tesamorelin for targeted visceral fat reduction. Store lyophilized at room temperature; reconstituted at 36-46°F (2-8°C), use within 30 days.`,
  },
  {
    name: 'IPAMORELIN',
    category: 'Growth Hormone',
    sizes: [{ label: '10mg', price: 45 }],
    short: 'Selective GH secretagogue. Clean GH pulses without side effects.',
    full: `Mechanism of Action: Ipamorelin is a pentapeptide (Aib-His-D-2Nal-D-Phe-Lys-NH2) ghrelin/growth hormone secretagogue receptor (GHS-R1a) agonist. It triggers the release of growth hormone from the anterior pituitary by mimicking ghrelin's action at the GHS-R. What distinguishes Ipamorelin from earlier secretagogues (GHRP-6, GHRP-2, Hexarelin) is its extraordinary selectivity — it produces a dose-dependent GH release WITHOUT significantly elevating cortisol, prolactin, ACTH, or aldosterone at therapeutic doses. It also does not stimulate appetite via ghrelin pathways at standard doses, making it the "cleanest" secretagogue available.

Clinical Data: In Phase 2 clinical trials for post-surgical ileus (bowel recovery), Ipamorelin demonstrated GH-releasing activity comparable to GHRP-6 but with a markedly better side-effect profile. Pharmacokinetic studies show peak GH release occurs 30-40 minutes after subcutaneous injection, with GH levels returning to baseline within 3-4 hours. Repeated dosing studies showed no desensitization of the GH response. In preclinical models, chronic Ipamorelin administration increased bone mineral density, lean body mass, and preferentially reduced visceral adipose tissue.

Dosing Protocol: Subcutaneous injection, typically 200-300mcg per dose, administered 1-3 times daily. Most common protocol: 200-300mcg before bed on an empty stomach (2+ hours fasted). Half-life: approximately 2 hours. For maximum effect, avoid eating for 30-60 minutes after injection to prevent insulin-mediated blunting of GH release. Side effects are minimal — occasional mild headache, transient head rush at injection, water retention during initial days. Contraindicated in active malignancy. Stacking: the gold standard is Ipamorelin + CJC-1295 DAC for comprehensive GH optimization. The CJC-1295 elevates baseline GH/IGF-1 continuously while Ipamorelin adds discrete GH pulses, mimicking youthful GH secretion patterns. Can also combine with BPC-157/TB-500 for enhanced recovery protocols or with Tesamorelin for visceral fat targeting. Store lyophilized at room temperature; reconstituted at 36-46°F (2-8°C), use within 30 days.`,
  },
  {
    name: 'TESAMORELIN',
    category: 'Growth Hormone',
    sizes: [{ label: '10mg', price: 60 }],
    short: 'FDA-approved GHRH analog. Specifically targets visceral abdominal fat.',
    full: `Mechanism of Action: Tesamorelin (brand name Egrifta) is a synthetic analog of human GHRH(1-44) with the addition of a trans-3-hexenoic acid group at the N-terminus, which protects against enzymatic degradation and extends biological activity. It binds to GHRH receptors on anterior pituitary somatotrophs, stimulating GH synthesis and release through the cAMP/PKA pathway. Unlike CJC-1295 DAC, Tesamorelin maintains a more pulsatile GH release pattern closer to physiological secretion. Its unique clinical distinction is that it has been specifically studied and FDA-approved for the reduction of excess visceral abdominal fat (lipodystrophy) — it is the only GHRH analog with this specific regulatory approval.

Clinical Data: Tesamorelin received FDA approval in 2010 based on two Phase 3 trials (n=816 total) in HIV-associated lipodystrophy. At 26 weeks, Tesamorelin reduced trunk fat by 15.2% vs. 5% for placebo (p<0.0001) and visceral adipose tissue (VAT) by 18% as measured by CT scan. It also improved triglycerides by -50 mg/dL and total cholesterol. In extension studies, benefits were maintained for 52 weeks of treatment. IGF-1 levels increased by approximately 80% from baseline. Importantly, it did not impair glucose tolerance or HbA1c despite increasing GH/IGF-1.

Dosing Protocol: Subcutaneous injection, standard dose 1-2mg daily, administered before bed. In clinical trials the dose was 2mg daily. Half-life: approximately 26-38 minutes for the peptide itself, but GH elevation lasts several hours due to the amplification cascade. For best results, inject on empty stomach and avoid eating for 30-60 minutes after. Side effects: injection site reactions (erythema, pruritus), arthralgia, peripheral edema, myalgia, paresthesias — most are mild and transient. Contraindicated in active malignancy, pituitary surgery/disease/tumor, or pregnancy. Stacking: can be combined with Ipamorelin for comprehensive GH optimization — Tesamorelin handles the GHRH (release signal) component while Ipamorelin provides the GHRP (amplification) component. This is a premium GH stack. For body composition, pairs well with fat-loss peptides (Retatrutide/Tesofensine). Store lyophilized at room temperature (controlled, 68-77°F); reconstituted at 36-46°F (2-8°C), use within 30 days.`,
  },
  {
    name: 'BPC-157',
    category: 'Recovery/Healing',
    sizes: [{ label: '10mg', price: 50 }],
    short: 'Body Protection Compound. Accelerates healing of gut, tendons, ligaments, muscles.',
    full: `Mechanism of Action: BPC-157 (Body Protection Compound-157) is a synthetic pentadecapeptide (15 amino acids: Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val) derived from a partial sequence of human gastric juice protein. Its mechanism involves multiple pathways: upregulation of growth factor expression (VEGF, EGF, FGF-2) promoting angiogenesis and tissue repair; modulation of the nitric oxide (NO) system; activation of the FAK-paxillin signaling pathway for cell migration; upregulation of growth hormone receptor expression in injured tissue; and interaction with the dopaminergic, serotonergic, and GABAergic systems. It has been shown to counteract the effects of NSAIDs on the GI tract and to promote mucosal integrity.

Clinical Data: While human clinical trials remain limited (Phase 2 trials for inflammatory bowel disease have been initiated), BPC-157 has an extensive preclinical evidence base spanning 100+ published studies. Animal studies demonstrate accelerated healing of muscle tears (50-70% faster), tendon-to-bone healing, ligament repair, bone fracture healing, and peripheral nerve regeneration. It has shown protective effects against NSAID-induced gastric ulcers, alcohol-induced liver damage, and various forms of organ damage. In tendon healing models, BPC-157 increased collagen organization and biomechanical strength of healing tissue by 2-3x compared to controls.

Dosing Protocol: Subcutaneous injection, 250-500mcg per dose, 1-2 times daily. For localized injuries, inject as close to the injury site as practical (e.g., near the shoulder for rotator cuff issues). For systemic healing or gut repair, inject subcutaneously in the abdominal area. Half-life: approximately 4 hours, supporting twice-daily dosing for optimal tissue levels. Typical protocol duration: 4-8 weeks for injury recovery, can be used longer for chronic conditions. Side effects are remarkably minimal — occasional injection site irritation. No significant adverse effects reported in preclinical literature even at very high doses. Contraindicated in active cancer (due to angiogenic properties). Stacking: the classic "Wolverine Stack" is BPC-157 + TB-500, providing complementary healing pathways (BPC-157 for localized repair and growth factor upregulation, TB-500 for systemic anti-inflammation and tissue remodeling). Can also pair with GH secretagogues for enhanced recovery. Oral administration (capsules) is an option specifically for gut healing. Store lyophilized at room temperature; reconstituted at 36-46°F (2-8°C), use within 30 days.`,
  },
  {
    name: 'TB-500',
    category: 'Recovery/Healing',
    sizes: [{ label: '10mg', price: 50 }],
    short: 'Thymosin Beta-4 fragment. Tissue repair, reduced inflammation, improved flexibility.',
    full: `Mechanism of Action: TB-500 is a synthetic version of the active region (amino acids 17-23: LKKTETQ) of Thymosin Beta-4 (Tb4), a 43-amino-acid peptide naturally expressed in virtually all human cells. Its primary mechanism involves binding to and sequestering G-actin (globular actin) monomers, which regulates actin polymerization — the fundamental process of cell structure, migration, and tissue repair. This promotes cell migration to sites of injury, new blood vessel formation (angiogenesis via VEGF upregulation), reduced scar tissue formation by downregulating myofibroblast differentiation, and decreased inflammation through suppression of inflammatory cytokines (IL-1beta, TNF-alpha). TB-500 also upregulates Laminin-5 expression, promoting keratinocyte migration and wound re-epithelialization.

Clinical Data: Thymosin Beta-4 has been studied in multiple clinical trials. RegeneRx Biopharmaceuticals conducted Phase 2 trials for chronic non-healing diabetic foot ulcers, demonstrating improved healing rates. Ophthalmic formulations have been tested for corneal wound healing and dry eye syndrome. In preclinical cardiac studies, Tb4 administration after myocardial infarction reduced infarct size, improved cardiac function, and activated resident cardiac progenitor cells. In equine veterinary medicine, TB-500 has extensive use records demonstrating improved soft tissue healing and reduced recovery time from tendon/ligament injuries.

Dosing Protocol: Subcutaneous injection. Loading phase (weeks 1-4): 5mg twice per week (total 10mg/week). Maintenance phase (weeks 5+): 2.5-5mg once per week. TB-500 has a relatively long half-life of approximately 5-7 days due to its strong albumin binding, so less frequent dosing is effective. Injection site is not critical — TB-500 is systemically active regardless of injection location (unlike BPC-157 which benefits from local injection). Side effects: occasional transient head rush or fatigue, rare injection site reactions. Very well tolerated overall. Contraindicated in active cancer (angiogenic properties). Stacking: the BPC-157 + TB-500 combination ("Wolverine Stack") is the gold standard recovery protocol — BPC-157 provides localized, growth-factor-driven healing while TB-500 provides systemic anti-inflammatory and tissue remodeling effects. Can be further enhanced with GHK-Cu for skin/connective tissue healing or with GH secretagogues for comprehensive recovery. Store lyophilized at room temperature; reconstituted at 36-46°F (2-8°C), use within 30 days.`,
  },
  {
    name: 'GHK-Cu',
    category: 'Skin/Anti-Aging',
    sizes: [{ label: '100mg', price: 40 }],
    short: 'Copper peptide. Skin regeneration, collagen synthesis, anti-aging.',
    full: `Mechanism of Action: GHK-Cu (glycyl-L-histidyl-L-lysine copper(II)) is a naturally occurring tripeptide-copper complex first isolated from human plasma by Dr. Loren Pickart in 1973. It functions as a potent signaling molecule that modulates the expression of over 4,000 genes — approximately 6% of the human genome. Key mechanisms include: stimulation of collagen I, III, and V synthesis; increased production of elastin, proteoglycans, and glycosaminoglycans (including hyaluronic acid); activation of metalloproteinases (MMPs) for controlled tissue remodeling; promotion of angiogenesis for improved tissue perfusion; recruitment of mast cells for wound healing; and powerful antioxidant activity via superoxide dismutase (SOD) induction. The copper ion serves as a cofactor for lysyl oxidase, critical for collagen and elastin cross-linking.

Clinical Data: Multiple controlled clinical studies demonstrate GHK-Cu's efficacy. In a 12-week facial cream trial, GHK-Cu improved skin elasticity, firmness, and thickness while reducing fine lines and wrinkles — outperforming vitamin C and retinoic acid in several metrics. Studies show it increases dermal collagen by 70% and skin thickness by 30% over 12 weeks of topical application. Gene expression studies (Broad Institute) confirmed it reverses expression of 54% of genes associated with tissue destruction in COPD and 70% of genes overexpressed in metastatic colon cancer, suggesting broad tissue-protective effects beyond skin.

Dosing Protocol: Topical: apply GHK-Cu serum or cream to target areas 1-2 times daily. Subcutaneous injection: 1-2mg daily or 200mcg/mL concentration in a micro-dosing protocol for facial rejuvenation (mesotherapy). Half-life: approximately 1 hour for systemic clearance, but tissue-level effects persist due to gene expression changes that last 24-48+ hours. Treatment duration: 8-12 weeks for visible skin improvements, ongoing for maintenance. Side effects: topical — rare irritation. Injectable — occasional injection site redness (due to mast cell activation, resolves in hours), mild transient flushing. Contraindicated in Wilson's disease or copper metabolism disorders. Stacking: excellent combination with BPC-157 for post-surgical or wound healing. Pairs well with NAD+ for comprehensive anti-aging protocol. Can be combined with microneedling for enhanced topical penetration. Store lyophilized at room temperature protected from light; reconstituted at 36-46°F (2-8°C), use within 14-21 days (shorter stability than most peptides due to copper oxidation).`,
  },
  {
    name: 'MOTS-C',
    category: 'Metabolic/Longevity',
    sizes: [{ label: '40mg', price: 90 }],
    short: 'Mitochondrial peptide. Enhances metabolism, exercise capacity, insulin sensitivity.',
    full: `Mechanism of Action: MOTS-c (Mitochondrial Open Reading Frame of the 12S rRNA Type-c) is a 16-amino-acid peptide encoded within the mitochondrial genome (the first mitochondrial-derived peptide, or "mitokine," discovered by Dr. Pinchas Cohen at USC in 2015). It activates the AMPK (AMP-activated protein kinase) pathway, the master metabolic sensor and regulator. MOTS-c translocates to the nucleus during metabolic stress where it directly regulates nuclear gene expression via interaction with AARE (antioxidant response elements). Key downstream effects include: enhanced glucose uptake independent of insulin (via GLUT4 translocation), increased fatty acid oxidation, improved mitochondrial biogenesis and function, prevention of age-related insulin resistance, and activation of the AICAR pathway mimicking exercise-induced metabolic benefits.

Clinical Data: Dr. Cohen's original 2015 study (Cell Metabolism) demonstrated that MOTS-c prevents age-dependent and high-fat-diet-induced insulin resistance in mice and improved exercise capacity. A 2020 study showed MOTS-c levels naturally increase during exercise in humans, establishing it as an "exercise mimetic." Notably, circulating MOTS-c levels decline with age and are lower in individuals with type 2 diabetes, suggesting a role in metabolic aging. In a 2021 clinical study, MOTS-c administration improved glucose metabolism and insulin sensitivity in older adults. Genetic variants in the MOTS-c encoding region are associated with longevity in Japanese centenarian populations.

Dosing Protocol: Subcutaneous injection, 5mg per dose, 3-5 times per week. Often administered in the morning or pre-workout to leverage its exercise-enhancing and metabolic effects. Half-life: approximately 4-6 hours. Some protocols use a loading phase of 10mg daily for the first week. Treatment cycles: 8-12 weeks on, 4 weeks off, though long-term continuous use appears well tolerated in preclinical studies. Side effects: generally very well tolerated — occasional mild injection site reaction, rare transient nausea. No significant adverse effects reported. Contraindicated in active malignancy (AMPK modulation effects). Stacking: synergistic with SS-31/Elamipretide (MOTS-c for mitochondrial signaling, SS-31 for mitochondrial membrane protection). Pairs excellently with NAD+ for comprehensive mitochondrial anti-aging. Also combines well with SLUPP332 for enhanced metabolic performance. Store lyophilized at -20°C for long-term or room temperature for short-term; reconstituted at 36-46°F (2-8°C), use within 30 days.`,
  },
  {
    name: 'PT-141',
    category: 'Sexual Health',
    sizes: [{ label: '10mg', price: 30 }],
    short: 'Bremelanotide. Treats sexual dysfunction in both men and women via CNS pathway.',
    full: `Mechanism of Action: PT-141 (Bremelanotide, brand name Vyleesi) is a cyclic heptapeptide melanocortin receptor agonist, specifically targeting the MC3R and MC4R (melanocortin 3 and 4 receptors) in the hypothalamus and limbic system. Unlike PDE5 inhibitors (Viagra/Cialis) which work peripherally on vascular smooth muscle, PT-141 acts centrally in the brain to modulate the neural pathways governing sexual desire and arousal. MC4R activation in the paraventricular nucleus and medial preoptic area triggers downstream signaling through oxytocin and dopamine pathways, directly stimulating the desire/arousal circuit. This makes it effective for desire-based dysfunction, not just mechanical erectile function.

Clinical Data: PT-141 received FDA approval in June 2019 as Vyleesi for hypoactive sexual desire disorder (HSDD) in premenopausal women — the first melanocortin-based drug approved for any indication. In the RECONNECT Phase 3 trials (n=1,247), bremelanotide significantly increased sexual desire score (p<0.0001) and reduced distress related to low sexual desire (p<0.0001) vs. placebo. Approximately 25% of patients achieved clinically meaningful improvement. In male studies (Phase 2), PT-141 produced erections in 8 of 10 men with erectile dysfunction, including those who had failed sildenafil. Response rate for psychogenic ED (anxiety-related) is particularly high.

Dosing Protocol: Subcutaneous injection, 1-2mg per dose, administered 45-60 minutes before anticipated sexual activity. Do NOT use more than once in 24 hours and no more than 8 doses per month (per FDA labeling). Half-life: approximately 2.7 hours, but effects can last 6-12 hours due to downstream signaling cascade. Start with 1mg to assess tolerance, increase to 1.5-2mg if needed. Side effects: nausea (40% in clinical trials — taking with ondansetron or ginger helps), flushing, headache, transient blood pressure elevation. The nausea typically improves with subsequent uses. Skin hyperpigmentation can occur with frequent/high doses (melanocortin system). Contraindicated in uncontrolled hypertension, cardiovascular disease, or concurrent use with naltrexone. Stacking: can be used alongside HRT/TRT for comprehensive sexual health optimization. Does not interact with PDE5 inhibitors but concurrent use is generally unnecessary. Store lyophilized at room temperature; reconstituted at 36-46°F (2-8°C), use within 30 days.`,
  },
  {
    name: 'SLUPP332',
    category: 'Metabolic/Performance',
    sizes: [{ label: '5mg', price: 50 }],
    short: 'REV-ERB agonist. Enhances endurance, fat oxidation, and circadian rhythm.',
    full: `Mechanism of Action: SLUPP332 (also known as SR9011 in related compound class) is a synthetic agonist of REV-ERBalpha and REV-ERBbeta, which are nuclear receptors that function as key components of the molecular circadian clock and metabolic regulators. REV-ERBs act as transcriptional repressors — when activated, they suppress the expression of genes involved in fat storage (lipogenesis), gluconeogenesis, and inflammatory responses while enhancing expression of genes involved in fatty acid oxidation, mitochondrial biogenesis, and oxidative metabolism. REV-ERB activation effectively reprograms skeletal muscle metabolism toward an endurance phenotype, increases mitochondrial content, and shifts the fuel preference toward fat oxidation.

Clinical Data: SLUPP332 and related REV-ERB agonists have been studied primarily in preclinical models, where results have been remarkable. In the landmark Woldt et al. (2013, Nature Medicine) study, REV-ERB agonist treatment increased running endurance by 50% in mice without exercise training. Treated animals showed increased mitochondrial number and function in skeletal muscle, enhanced fatty acid oxidation, and reduced fat mass. REV-ERB agonism also demonstrated anti-inflammatory effects by suppressing macrophage activation and IL-6 production. These compounds are sometimes referred to as "exercise in a bottle" in the research community, though this is an oversimplification.

Dosing Protocol: This is a research compound with limited human dosing data. Reported protocols use 5-10mg subcutaneous injection, administered in the morning (aligned with circadian REV-ERB expression peaks). Half-life is estimated at 4-8 hours based on structural analogs. Typical protocol: 5mg daily for 4-8 week cycles. Best results are seen when combined with actual exercise training — the compound appears to amplify training adaptations rather than replace them. Side effects (reported anecdotally): mild GI discomfort, sleep pattern changes (expected given circadian mechanism), transient energy fluctuations. Long-term safety data in humans is not available. Contraindicated in shift workers or individuals with circadian rhythm disorders until more is known. Stacking: pairs logically with MOTS-c for dual metabolic pathway activation (AMPK + REV-ERB). Can complement Retatrutide for enhanced fat oxidation. Store lyophilized at -20°C or 36-46°F (2-8°C); reconstituted solution at 36-46°F, use within 14 days due to limited stability data.`,
  },
  {
    name: 'SS-31 (Elamipretide)',
    category: 'Mitochondrial/Anti-Aging',
    sizes: [
      { label: '10mg', price: 45 },
      { label: '50mg', price: 210 },
    ],
    short: 'Mitochondrial-targeted peptide. Protects and restores mitochondrial function.',
    full: `Mechanism of Action: SS-31 (D-Arg-Dmt-Lys-Phe-NH2), also known as Elamipretide or Bendavia, is a cell-permeable tetrapeptide that selectively concentrates 1,000-5,000 fold in the inner mitochondrial membrane (IMM). It binds to cardiolipin, a unique phospholipid found exclusively in the IMM that is essential for the structural integrity and function of electron transport chain (ETC) complexes. By stabilizing cardiolipin-protein interactions, SS-31 optimizes ETC complex organization into supercomplexes ("respirasomes"), improving electron transfer efficiency, increasing ATP production by 20-30%, and reducing electron leak that generates reactive oxygen species (ROS). This makes it a "mitochondrial medicine" that addresses the root cause of cellular aging — mitochondrial dysfunction.

Clinical Data: Elamipretide has been studied in multiple Phase 2/3 clinical trials. In the EMBRACE trial for heart failure (HFrEF), a single infusion improved left ventricular volumes within 24 hours. The TAZPOWER trial for Barth syndrome (a genetic cardiolipin disorder) showed significant improvement in a 6-minute walk test. In the MMPOWER-3 trial for primary mitochondrial myopathy, while the primary endpoint was not met, secondary endpoints showed trends toward improved functional capacity. In preclinical aging studies, SS-31 reversed age-related declines in cardiac function, skeletal muscle energetics, and insulin sensitivity in aged animals. It is one of the most extensively studied mitochondrial-targeted therapeutics.

Dosing Protocol: Subcutaneous injection, 5-40mg per dose depending on goals. Conservative longevity protocol: 5-10mg daily. Aggressive mitochondrial recovery: 20-40mg daily for defined periods. Half-life: approximately 4 hours with rapid mitochondrial uptake and accumulation. The 50mg vial option is for clients on higher-dose protocols or extended use. No fasting requirements as SS-31 uptake is not insulin-dependent. Side effects: injection site reactions, rare headache, transient mild kidney function changes at very high doses (monitor in long-term use). Well tolerated overall in clinical trials. Contraindicated in severe renal impairment. Stacking: the ultimate mitochondrial stack is SS-31 + MOTS-c + NAD+ — SS-31 protects mitochondrial membranes and ETC, MOTS-c enhances mitochondrial signaling via AMPK, and NAD+ fuels the ETC and sirtuin-mediated mitochondrial biogenesis. This three-compound approach addresses mitochondrial aging from every angle. Store lyophilized at -20°C for long-term or refrigerated for short-term; reconstituted at 36-46°F (2-8°C), use within 30 days.`,
  },
  {
    name: 'NAD+',
    category: 'Longevity/Energy',
    sizes: [
      { label: '500mg', price: 60 },
      { label: '1000mg', price: 100 },
    ],
    short: 'Nicotinamide adenine dinucleotide. Essential coenzyme for cellular energy and DNA repair.',
    full: `Mechanism of Action: NAD+ (Nicotinamide Adenine Dinucleotide) is a coenzyme present in every living cell, functioning as a critical electron carrier in mitochondrial oxidative phosphorylation (Complex I and II of the ETC) and as an essential substrate for three major enzyme families: Sirtuins (SIRT1-7, deacetylases involved in DNA repair, gene silencing, and metabolic regulation), PARPs (poly-ADP-ribose polymerases, critical for DNA damage repair), and CD38/CD157 (cyclic ADP-ribose hydrolases involved in calcium signaling and immune function). NAD+ levels decline approximately 50% between ages 40-60, which impairs all of these critical functions simultaneously. Direct NAD+ supplementation bypasses the multi-step conversion required from precursors like NMN or NR, providing immediate bioavailability to all NAD+-dependent processes.

Clinical Data: A 2020 study (Remie et al., Nature Aging) demonstrated that boosting NAD+ levels in humans improved mitochondrial function in skeletal muscle. The ChromaDex NRPT clinical trial showed increased NAD+ levels correlated with improved walking speed and grip strength in older adults. IV NAD+ therapy studies have demonstrated acute improvements in cognitive function, mental clarity, and fatigue reduction. Research from the Sinclair Lab (Harvard) has extensively documented NAD+ decline as a hallmark of aging and demonstrated that restoring NAD+ levels in aged mice reverses markers of aging in muscle, brain, and cardiovascular tissue. Human trials of NAD+ precursors have confirmed safety and dose-dependent NAD+ elevation in blood and tissue.

Dosing Protocol: Subcutaneous injection: 100-250mg daily or 500mg 2-3x per week. IV infusion: 250-1000mg per session (requires clinical setting, takes 2-4 hours). Intramuscular injection: 100-200mg daily. Half-life: approximately 1-4 hours for circulating NAD+ (varies by route), but cellular effects persist 12-24+ hours due to downstream sirtuin and PARP activation. The 500mg vial is suited for standard protocols; the 1000mg vial for aggressive protocols or IV preparation. Side effects: subcutaneous — injection site discomfort/burning (common, NAD+ is acidic), nausea at higher doses, chest tightness, flushing. IV — potential for anxiety, chest pressure, nausea during infusion (rate-dependent, slow infusion reduces these). Generally well tolerated. No absolute contraindications known, though caution in active cancer (some tumors upregulate NAD+ pathways). Stacking: the longevity trifecta is NAD+ + SS-31 + MOTS-c for comprehensive mitochondrial and cellular anti-aging. NAD+ also pairs well with GHK-Cu for anti-aging skin protocols. Resveratrol or fisetin can be added orally to further activate sirtuins. Store lyophilized at room temperature protected from light and moisture; reconstituted at 36-46°F (2-8°C), use within 14 days. The 1000mg concentration should be reconstituted with 2mL bacteriostatic water to avoid excessive osmolality.`,
  },
]

const CATEGORIES = [
  'All',
  'GLP/Fat Loss',
  'CNS/Fat Loss',
  'Growth Hormone',
  'Recovery/Healing',
  'Satiety',
  'Metabolic',
  'Longevity',
  'Other',
]

const CATEGORY_COLORS: Record<string, string> = {
  'GLP/Fat Loss': '#FF6A00',
  'CNS/Fat Loss': '#FF6A00',
  'Growth Hormone': '#22c55e',
  'Recovery/Healing': '#3b82f6',
  'Satiety': '#a855f7',
  'Skin/Anti-Aging': '#ec4899',
  'Metabolic/Longevity': '#14b8a6',
  'Metabolic/Performance': '#14b8a6',
  'Mitochondrial/Anti-Aging': '#ec4899',
  'Longevity/Energy': '#14b8a6',
  'Sexual Health': '#f43f5e',
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#6b7280'
}

function matchesFilter(peptide: Peptide, filter: string): boolean {
  if (filter === 'All') return true
  if (filter === 'Metabolic') {
    return peptide.category.startsWith('Metabolic')
  }
  if (filter === 'Longevity') {
    return peptide.category.includes('Longevity') || peptide.category.includes('Anti-Aging')
  }
  if (filter === 'Other') {
    const knownFilters = ['GLP/Fat Loss', 'CNS/Fat Loss', 'Growth Hormone', 'Recovery/Healing', 'Satiety']
    const metabolicOrLongevity = peptide.category.startsWith('Metabolic') || peptide.category.includes('Longevity') || peptide.category.includes('Anti-Aging')
    return !knownFilters.includes(peptide.category) && !metabolicOrLongevity
  }
  return peptide.category === filter
}

/* ───────────────────────────────────────────
   Syringe Scale Visual Component
   ─────────────────────────────────────────── */
function SyringeScale({ concentration, fillUnits = 0 }: { concentration: number; fillUnits?: number }) {
  const markings = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  const fillPct = Math.min(Math.max((fillUnits / 100) * 100, 0), 100)
  const fillMg = (fillUnits / 100) * concentration

  return (
    <div className="mt-4">
      <h4 className="text-sm font-bold text-white mb-3">Syringe Scale</h4>
      <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <div className="relative mx-auto" style={{ maxWidth: 420 }}>
          {/* Syringe container */}
          <div className="relative mx-10">
            {/* Plunger handle */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-10 w-10 h-3 bg-[#3a3a3a] border border-[#4a4a4a] rounded-l-md" />
            {/* Barrel outer */}
            <div className="relative h-10 bg-[#1e1e1e] border-2 border-[#444] rounded-full overflow-hidden">
              {/* Orange fluid fill */}
              {fillPct > 0 && (
                <div
                  className="absolute top-0 bottom-0 left-0 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${fillPct}%`,
                    background: 'linear-gradient(180deg, #FF8533 0%, #FF6A00 40%, #CC5500 100%)',
                    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3)',
                  }}
                />
              )}
              {/* Fill level indicator line */}
              {fillPct > 0 && fillPct < 100 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
                  style={{ left: `${fillPct}%` }}
                />
              )}
              {/* Dose label on the syringe */}
              {fillPct > 0 && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 z-20 px-2 py-0.5 rounded text-xs font-black"
                  style={{
                    left: `${Math.max(fillPct / 2, 8)}%`,
                    transform: 'translate(-50%, -50%)',
                    color: fillPct > 15 ? '#000' : '#FF6A00',
                    textShadow: fillPct > 15 ? 'none' : '0 0 4px rgba(0,0,0,0.8)',
                  }}
                >
                  {fillMg.toFixed(1)}mg ({fillUnits.toFixed(0)}u)
                </div>
              )}
            </div>
            {/* Needle */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1">
              <div className="w-10 h-0.5 bg-gradient-to-r from-gray-400 to-gray-300" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-0 w-0 h-0 border-l-[6px] border-l-gray-300 border-t-[1.5px] border-t-transparent border-b-[1.5px] border-b-transparent" />
            </div>
          </div>
          {/* Tick marks below */}
          <div className="relative mt-1 mx-10">
            {markings.map((units) => {
              const pct = (units / 100) * 100
              const mg = (units / 100) * concentration
              const isAtFill = Math.abs(units - fillUnits) < 3
              return (
                <div
                  key={units}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                >
                  <div className={`w-px h-3 ${isAtFill ? 'bg-[#FF6A00]' : 'bg-gray-600'}`} />
                  <span className={`text-[10px] mt-0.5 whitespace-nowrap font-semibold ${isAtFill ? 'text-[#FF6A00]' : 'text-gray-500'}`}>{units}</span>
                  <span className={`text-[10px] whitespace-nowrap font-bold ${isAtFill ? 'text-white' : 'text-gray-600'}`}>{mg.toFixed(1)}mg</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="h-12" />
        {fillUnits > 0 && (
          <div className="text-center mt-2">
            <span className="text-[#FF6A00] font-bold text-lg">{fillMg.toFixed(2)}mg</span>
            <span className="text-gray-500 text-sm ml-2">= {fillUnits.toFixed(1)} units on syringe</span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────
   Reconstitution Instructions Card
   ─────────────────────────────────────────── */
function ReconstitutionInstructions({ concentration }: { concentration: number }) {
  const ratio = concentration > 0 ? concentration : 10
  const syringeReadings = [
    { units: 10, mg: (10 / 100) * ratio },
    { units: 15, mg: (15 / 100) * ratio },
    { units: 20, mg: (20 / 100) * ratio },
    { units: 24, mg: (24 / 100) * ratio },
    { units: 25, mg: (25 / 100) * ratio },
    { units: 30, mg: (30 / 100) * ratio },
    { units: 50, mg: (50 / 100) * ratio },
    { units: 100, mg: (100 / 100) * ratio },
  ]

  return (
    <div className="bg-[#0f1a0f] border border-[#22c55e]/30 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h4 className="text-[#22c55e] font-bold text-sm tracking-wide uppercase">
          Recommended Reconstitution — 1mL per 10mg (10:1 Ratio)
        </h4>
      </div>

      <ol className="space-y-2 text-sm text-gray-300 mb-5">
        <li className="flex gap-2"><span className="text-[#22c55e] font-bold min-w-[24px]">1.</span> Remove flip-off cap from peptide vial</li>
        <li className="flex gap-2"><span className="text-[#22c55e] font-bold min-w-[24px]">2.</span> Wipe rubber stopper with alcohol swab</li>
        <li className="flex gap-2"><span className="text-[#22c55e] font-bold min-w-[24px]">3.</span> Draw 1mL (100 units) of bacteriostatic water into insulin syringe</li>
        <li className="flex gap-2"><span className="text-[#22c55e] font-bold min-w-[24px]">4.</span> Insert needle into vial at an angle, let water run down the side (do NOT spray directly onto powder)</li>
        <li className="flex gap-2"><span className="text-[#22c55e] font-bold min-w-[24px]">5.</span> Gently swirl vial — do NOT shake</li>
        <li className="flex gap-2"><span className="text-[#22c55e] font-bold min-w-[24px]">6.</span> Allow to fully dissolve (1-2 minutes)</li>
        <li className="flex gap-2"><span className="text-[#22c55e] font-bold min-w-[24px]">7.</span> Store reconstituted peptide in refrigerator (36-46°F / 2-8°C)</li>
        <li className="flex gap-2"><span className="text-[#22c55e] font-bold min-w-[24px]">8.</span> Use within 30 days of reconstitution</li>
      </ol>

      <div className="border-t border-[#22c55e]/20 pt-4">
        <h5 className="text-[#22c55e] font-bold text-xs tracking-wide uppercase mb-3">
          Reading Your Syringe (at {ratio.toFixed(0)}mg/mL concentration)
        </h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {syringeReadings.map((r) => (
            <div key={r.units} className="bg-[#141414] border border-[#2a2a2a] rounded px-3 py-2 text-center">
              <span className="text-gray-400 text-xs">{r.units} units</span>
              <span className="text-white font-bold text-sm block">{r.mg.toFixed(1)} mg</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────
   Peptide Calculator Section
   ─────────────────────────────────────────── */
function PeptideCalculator() {
  const [peptideMg, setPeptideMg] = useState(10)
  const [waterMl, setWaterMl] = useState(1)
  const [desiredDose, setDesiredDose] = useState(1)

  const concentration = waterMl > 0 ? peptideMg / waterMl : 0
  const unitsToDraw = concentration > 0 ? (desiredDose / concentration) * 100 : 0
  const mlToDraw = concentration > 0 ? desiredDose / concentration : 0

  return (
    <div className="mb-10">
      <h2 className="text-2xl font-bold text-white mb-6 tracking-wide">Peptide Calculator</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Reconstitution Calculator */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-5">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#FF6A00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Reconstitution Calculator
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Peptide Amount in Vial (mg)</label>
              <input
                type="number"
                value={peptideMg}
                onChange={(e) => setPeptideMg(Number(e.target.value) || 0)}
                min={0}
                step={1}
                className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-[#FF6A00] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Bacteriostatic Water to Add (mL)</label>
              <input
                type="number"
                value={waterMl}
                onChange={(e) => setWaterMl(Number(e.target.value) || 0)}
                min={0}
                step={0.5}
                className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-[#FF6A00] transition-colors"
              />
            </div>

            <div className="bg-[#FF6A00]/10 border border-[#FF6A00]/30 rounded-lg p-4">
              <div className="text-sm text-gray-400">Concentration</div>
              <div className="text-3xl font-black text-[#FF6A00]">
                {concentration.toFixed(2)} <span className="text-lg">mg/mL</span>
              </div>
              {concentration > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  At {waterMl}mL per {peptideMg}mg: 10 units on syringe = {(10 / 100 * concentration).toFixed(2)}mg, 20 units = {(20 / 100 * concentration).toFixed(2)}mg, etc.
                </p>
              )}
            </div>
          </div>

          <SyringeScale concentration={concentration} fillUnits={unitsToDraw} />
        </div>

        {/* Dosing Calculator */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg p-5">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#FF6A00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Dosing Calculator
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Desired Dose (mg)</label>
              <input
                type="number"
                value={desiredDose}
                onChange={(e) => setDesiredDose(Number(e.target.value) || 0)}
                min={0}
                step={0.1}
                className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm focus:outline-none focus:border-[#FF6A00] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Concentration (mg/mL) — auto-filled from reconstitution</label>
              <input
                type="number"
                value={concentration}
                readOnly
                className="w-full px-4 py-2.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-gray-400 text-sm cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#FF6A00]/10 border border-[#FF6A00]/30 rounded-lg p-4">
                <div className="text-sm text-gray-400">Units to Draw</div>
                <div className="text-3xl font-black text-[#FF6A00]">
                  {concentration > 0 ? unitsToDraw.toFixed(1) : '—'}
                  <span className="text-lg ml-1">units</span>
                </div>
              </div>
              <div className="bg-[#FF6A00]/10 border border-[#FF6A00]/30 rounded-lg p-4">
                <div className="text-sm text-gray-400">mL to Draw</div>
                <div className="text-3xl font-black text-[#FF6A00]">
                  {concentration > 0 ? mlToDraw.toFixed(3) : '—'}
                  <span className="text-lg ml-1">mL</span>
                </div>
              </div>
            </div>

            {concentration > 0 && unitsToDraw > 100 && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-300 text-sm font-medium">
                  Warning: {unitsToDraw.toFixed(1)} units exceeds a standard 100-unit insulin syringe. Consider using a higher concentration or splitting into multiple injections.
                </p>
              </div>
            )}

            {concentration > 0 && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                <h4 className="text-sm font-bold text-white mb-2">Quick Reference — Doses per Vial</h4>
                <div className="text-xs text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Total in vial:</span>
                    <span className="text-white">{peptideMg}mg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Doses at {desiredDose}mg each:</span>
                    <span className="text-white">{desiredDose > 0 ? Math.floor(peptideMg / desiredDose) : '—'} doses</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Days supply (1x daily):</span>
                    <span className="text-white">{desiredDose > 0 ? Math.floor(peptideMg / desiredDose) : '—'} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weeks supply (1x weekly):</span>
                    <span className="text-white">{desiredDose > 0 ? Math.floor(peptideMg / desiredDose) : '—'} weeks</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reconstitution Instructions — always visible */}
      <ReconstitutionInstructions concentration={concentration} />
    </div>
  )
}

/* ───────────────────────────────────────────
   Main Component
   ─────────────────────────────────────────── */
export default function PeptideManagement() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [expandedFull, setExpandedFull] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = PEPTIDES.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = matchesFilter(p, activeFilter)
    return matchSearch && matchCat
  })

  const toggleCard = (name: string) => {
    if (expandedCard === name) {
      setExpandedCard(null)
      setExpandedFull(null)
    } else {
      setExpandedCard(name)
      setExpandedFull(null)
    }
  }

  const toggleFull = (e: React.MouseEvent, name: string) => {
    e.stopPropagation()
    setExpandedFull(expandedFull === name ? null : name)
  }

  return (
    <div className="mt-12">
      {/* Confidential Banner */}
      <div className="bg-red-900/60 border border-red-500 rounded-lg px-4 py-3 mb-6 text-center">
        <span className="text-red-200 font-bold text-sm tracking-wide">
          CONFIDENTIAL — Internal Pricing Only — Do Not Share
        </span>
      </div>

      {/* Peptide Calculator Section */}
      <PeptideCalculator />

      <h2 className="text-2xl font-bold text-white mb-6 tracking-wide">Peptide Catalog</h2>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search peptides..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#FF6A00] transition-colors"
        />
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeFilter === cat
                ? 'bg-[#FF6A00] text-white'
                : 'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a] hover:border-[#FF6A00] hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Peptide Cards */}
      <div className="space-y-3">
        {filtered.map((peptide) => {
          const isExpanded = expandedCard === peptide.name
          const isFullExpanded = expandedFull === peptide.name
          const catColor = getCategoryColor(peptide.category)

          return (
            <div
              key={peptide.name}
              onClick={() => toggleCard(peptide.name)}
              className={`bg-[#141414] border rounded-lg cursor-pointer transition-all duration-200 ${
                isExpanded ? 'border-[#FF6A00]/50' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
              }`}
            >
              {/* Collapsed Header - Always Visible */}
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <h3 className="text-white font-bold text-lg tracking-wide whitespace-nowrap">
                    {peptide.name}
                  </h3>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{
                      backgroundColor: `${catColor}20`,
                      color: catColor,
                      border: `1px solid ${catColor}40`,
                    }}
                  >
                    {peptide.category}
                  </span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    {peptide.sizes.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 justify-end">
                        <span className="text-gray-500 text-xs">{s.label}</span>
                        <span className="text-[#FF6A00] font-bold text-sm">${s.price}</span>
                      </div>
                    ))}
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-[#2a2a2a] pt-4">
                  <p className="text-gray-300 text-sm leading-relaxed">{peptide.short}</p>

                  {!isFullExpanded ? (
                    <button
                      onClick={(e) => toggleFull(e, peptide.name)}
                      className="mt-3 text-[#FF6A00] text-xs font-semibold hover:text-[#ff8533] transition-colors"
                    >
                      Read More →
                    </button>
                  ) : (
                    <div className="mt-3">
                      <div className="text-gray-400 text-sm leading-relaxed space-y-3">
                        {peptide.full.split('\n\n').map((para, i) => (
                          <p key={i}>{para}</p>
                        ))}
                      </div>
                      <button
                        onClick={(e) => toggleFull(e, peptide.name)}
                        className="mt-3 text-[#FF6A00] text-xs font-semibold hover:text-[#ff8533] transition-colors"
                      >
                        Show Less
                      </button>
                    </div>
                  )}

                  {/* Price summary in expanded view */}
                  <div className="mt-4 pt-3 border-t border-[#2a2a2a]">
                    <div className="flex flex-wrap gap-3">
                      {peptide.sizes.map((s, i) => (
                        <div
                          key={i}
                          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-4 py-2 flex items-center gap-2"
                        >
                          <span className="text-gray-400 text-sm">{s.label}</span>
                          <span className="text-[#FF6A00] font-bold text-lg">${s.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {filtered.length} of {PEPTIDES.length} peptides
        </span>
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-2">
          <span className="text-gray-400">Flat rate shipping: </span>
          <span className="text-[#FF6A00] font-bold">$15</span>
        </div>
      </div>
    </div>
  )
}
