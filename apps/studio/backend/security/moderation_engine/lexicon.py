ADULT_TERMS = {
    "adult",
    "adults",
    "adult woman",
    "adult women",
    "adult man",
    "adult men",
    "grown woman",
    "grown man",
    "mature woman",
    "mature man",
    "woman",
    "women",
    "man",
    "men",
    "female model",
    "male model",
}

AMBIGUOUS_YOUTH_TERMS = {
    "girl",
    "girls",
    "boy",
    "boys",
    "young girl",
    "young girls",
    "young boy",
    "young boys",
    "young woman",
    "young women",
    "young man",
    "young men",
    "young model",
    "young models",
}

EXPLICIT_MINOR_TERMS = {
    "child",
    "children",
    "kid",
    "kids",
    "minor",
    "minors",
    "teen",
    "teens",
    "teenager",
    "teenagers",
    "underage",
    "schoolgirl",
    "schoolgirls",
    "schoolboy",
    "schoolboys",
    "little girl",
    "little girls",
    "little boy",
    "little boys",
    "toddler",
    "toddlers",
}

SWIMWEAR_TERMS = {
    "bikini",
    "swimsuit",
    "swimwear",
    "beachwear",
    "one piece swimsuit",
    "two piece swimsuit",
}

LINGERIE_TERMS = {
    "lingerie",
    "lace lingerie",
    "lace bra",
    "bra",
    "bralette",
    "panties",
    "underwear",
    "intimate wear",
    "boudoir",
}

FASHION_TERMS = {
    "fashion",
    "editorial",
    "portrait",
    "lookbook",
    "runway",
    "style",
    "styled",
    "summer fashion",
    "beach portrait",
}

SUGGESTIVE_TERMS = {
    "sexy",
    "sensual",
    "seductive",
    "sultry",
    "cleavage",
    "provocative",
    "alluring",
    "romantic bedroom",
}

ROMANTIC_TERMS = {
    "romantic",
    "intimate",
    "bedroom",
    "candlelit",
}

EXPLICIT_SEXUAL_TERMS = {
    "porn",
    "pornographic",
    "xxx",
    "hardcore",
    "blowjob",
    "handjob",
    "cumshot",
    "creampie",
    "orgasm",
    "ejaculate",
    "penetration",
    "penetrate",
    "anal sex",
    "oral sex",
    "sex scene",
    "fully nude",
    "completely nude",
    "genitals visible",
    "spread legs",
    "topless",
    "nude",
    "naked",
}

NON_CONSENSUAL_TERMS = {
    "rape",
    "sexual assault",
    "forced sex",
    "forced nudity",
    "non consensual",
    "revenge porn",
    "deepfake porn",
    "celeb sex tape",
}

GRAPHIC_VIOLENCE_TERMS = {
    "graphic gore",
    "dismember",
    "beheading",
    "guts exposed",
    "bloodbath",
    "snuff",
    "terrorist execution",
    "execution video",
}

SELF_HARM_TERMS = {
    "suicide tutorial",
    "self harm instructions",
}

RISK_LEXICON = (
    ADULT_TERMS
    | AMBIGUOUS_YOUTH_TERMS
    | EXPLICIT_MINOR_TERMS
    | SWIMWEAR_TERMS
    | LINGERIE_TERMS
    | FASHION_TERMS
    | SUGGESTIVE_TERMS
    | ROMANTIC_TERMS
    | EXPLICIT_SEXUAL_TERMS
    | NON_CONSENSUAL_TERMS
    | GRAPHIC_VIOLENCE_TERMS
    | SELF_HARM_TERMS
)
