ADULT_TERMS = {
    "adult",
    "adults",
    "adult woman",
    "adult women",
    "adult man",
    "adult men",
    "adult female",
    "adult male",
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
    # "Young woman/man" denotes an adult ~18-30 in modern English usage —
    # not age-ambiguous. Treating it as ambiguous causes false positives on
    # standard fashion/swimwear/editorial prompts and is the #1 over-flag
    # source flagged by audit. Move here so the analyzer reads CLEAR_ADULT.
    "young woman",
    "young women",
    "young man",
    "young men",
    "young adult",
    "young adults",
    # Common adult-age phrasings that previously fell through to UNKNOWN
    # and got upgraded to AMBIGUOUS by adjacent youth signals.
    "in her twenties",
    "in his twenties",
    "in her thirties",
    "in his thirties",
    "in her forties",
    "in his forties",
    "twenty something",
    "thirty something",
    "twentysomething",
    "thirtysomething",
    "girlfriend",
    "boyfriend",
    "wife",
    "husband",
}

# Truly age-ambiguous referents — the analyzer should escalate to AI vision
# review rather than hard-blocking, since these *can* mean adults but also
# carry legitimate minor-risk that a vision model can resolve from the image.
AMBIGUOUS_YOUTH_TERMS = {
    "girl",
    "girls",
    "boy",
    "boys",
    "young girl",
    "young girls",
    "young boy",
    "young boys",
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
