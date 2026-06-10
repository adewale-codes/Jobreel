import spacy
from spacy.matcher import PhraseMatcher

from services.skills_taxonomy import SKILLS

nlp = spacy.load("en_core_web_sm")
matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
patterns = [nlp.make_doc(skill.lower()) for skill in SKILLS]
matcher.add("SKILLS", patterns)

SKILLS_MAP = {skill.lower(): skill for skill in SKILLS}


def extract_skills(text: str) -> list[str]:
    if not text:
        return []
    doc = nlp(text[:10000])
    matches = matcher(doc)
    found = set()
    for match_id, start, end in matches:
        span_text = doc[start:end].text.lower()
        canonical = SKILLS_MAP.get(span_text)
        if canonical:
            found.add(canonical)
    return sorted(found)
