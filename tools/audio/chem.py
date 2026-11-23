"""Biochem narration text: makes acronyms, molecules and symbols come out the way a
professor would say them. Kokoro reads an all-caps word like "ATP" or "NADH" as a
made-up word ("atp", "nad"), so acronyms get spelled letter by letter here.

Use it like scripts.py:  SET=... python3 chem.py > transcripts.txt  (read it over!)
gen.py picks it up with  SCRIPTS=chem  (see README).

Adding a word: if a term still sounds wrong, add it to SAY (exact spoken form) or to
WORDS (all-caps words that should be read as words, not spelled).
"""
import json, os, re

SET = os.environ.get("SET", "/home/claude/study-decks/sets/chem-481/exam-3.json")

# letter names Kokoro says correctly ("ay" comes out as "eye", "eff" gets mangled)
LETTER = {"A": "eigh", "B": "bee", "C": "see", "D": "dee", "E": "ee", "F": "ef", "G": "gee", "H": "aitch",
          "I": "eye", "J": "jay", "K": "kay", "L": "el", "M": "em", "N": "en", "O": "oh", "P": "pee", "Q": "cue",
          "R": "ar", "S": "ess", "T": "tee", "U": "you", "V": "vee", "W": "double you", "X": "ex", "Y": "why", "Z": "zee"}

# all-caps words that are just emphasis (or are said as a word), not acronyms
WORDS = {"ON", "OFF", "AND", "OR", "NOT", "ONE", "TWO", "THREE", "ANY", "HOW", "BELOW", "ABOVE", "DOWN", "UP", "IN",
         "OUT", "BUILDING", "BURNING", "ALL", "NO", "YES", "ONLY", "MORE", "LESS", "BOTH", "NEVER", "ALWAYS", "WHY",
         "WHAT", "WHEN", "WHERE", "THE", "IS", "ARE", "BEFORE", "AFTER", "FED", "FASTING", "HIGH", "LOW", "STOP", "GO",
         "PEP", "GAP"}            # PEP and GAP: biochem people say these as words

# exact spellings -> how to say them (regexes, checked in order, before anything else)
SAY = [
    (r"\bCoA-SH\b", "co-A S H"), (r"-CoA\b", " co-A"), (r"\bCoA\b", "co-A"),
    (r"\bNADP⁺", "NADP plus"), (r"\bNAD⁺", "NAD plus"), (r"\bFADH₂", "FADH 2"), (r"\bFADH2\b", "FADH 2"),
    (r"\bHCO₃⁻", "bicarbonate"), (r"\bCO₂", "C O 2"), (r"\bH₂O\b", "water"), (r"\bCH₂OH\b", "C H 2 O H"),
    (r"\bCH₃\b", "C H 3"), (r"\bCOO⁻", "carboxylate"), (r"\bB₁₂", "B 12"), (r"\bMgATP\b", "magnesium ATP"),
    (r"\bcAMP\b", "cyclic AMP"), (r"\bpKa\b", "P K A"), (r"\bpH\b", "P H"), (r"\bkJ/mol\b", "kilojoules per mole"),
    (r"\bkJ\b", "kilojoules"), (r"\bGLUT4\b", "glute 4"), (r"\bApoC-II\b", "apo C 2"),
    (r"C═O", "C double bond O"), (r"\bHK IV\b", "HK 4"), (r"(?i)\bhexokinase IV\b", "hexokinase 4"), (r"(?i)\bhexokinase I\b", "hexokinase 1"),
    (r"\bPi\b", "pee eye"), (r"\bGlc\b", "glucose"), (r"\bGal\b", "galactose"), (r"(\d)([αβγ])", r"\1 \2"),
    (r"\bComplex IV\b", "Complex 4"), (r"\bComplex III\b", "Complex 3"), (r"\bComplex II\b", "Complex 2"),
    (r"\bComplex I\b", "Complex 1"), (r"\bG6Pase\b", "G6P-ase"), (r"\bFBPase", "FBP-ase"), (r"\bPEPCK\b", "pep C K"), (r"\bSN2\b", "S N 2"),
    (r"\bSN1\b", "S N 1"), (r"\bRT ln\b", "R T times the natural log of"), (r"\bln\b", "the natural log of"),
    (r"ZFΔψ", "Z F delta psi"), (r"Δψ", "delta psi"), (r"ΔG′°", "delta G prime naught"), (r"ΔG′", "delta G prime"),
    (r"ΔG°", "delta G naught"), (r"ΔG", "delta G"), (r"trans-Δ²", "trans delta 2"), (r"trans-Δ", "trans delta"),
    (r"Δ", "delta "), (r"([αβγ])-", r"\1 "), (r"\bCh (\d)", r"Chapter \1"), (r"\b(\d)-P\b", r"\1 phosphate"), (r"\bGal-1-P\b", "galactose 1 phosphate"),
    (r"(\d),(\d)BP\b", r"\1 \2 bisphosphate"), (r"(\d),(\d)-bisphosphate", r"\1 \2 bisphosphate"),
    (r"\b(\d)-BPG\b", r"\1 B P G"), (r"\bD/L\b", "D or L"), (r"α/β", "alpha or beta"),
]
SYMBOLS = [("α", "alpha "), ("β", "beta "), ("γ", "gamma "), ("ψ", "psi"), ("⁺", " plus"), ("⁻", " minus"),
           ("′", " prime"), ("°", " naught"), ("²", " 2"), ("³", " 3"),
           ("₀", "0"), ("₁", "1"), ("₂", "2"), ("₃", "3"), ("₄", "4"), ("₅", "5"), ("₆", "6"), ("₇", "7"), ("₈", "8"), ("₉", "9"),
           ("⇌", " goes back and forth with "), ("⇄", " goes back and forth with "), ("↔", " goes back and forth with "),
           ("−", " minus "), ("¹", " 1"), ("_", " "), (" / ", " or "), ("═", " "), ("→", " to "), ("←", " from "), ("↑", " more "), ("↓", " less "),
           ("×", " times "), ("≈", " about "), ("~", "about "), ("·", ", "), ("–", " to "), ("—", ", "), ("≥", " at least "),
           ("≤", " at most "), ("%", " percent"), ("&", " and "), ("e.g.", "for example"), ("i.e.", "that is"), ("vs.", "versus"),
           (" vs ", " versus ")]

def spell(tok):
    """ATP -> 'eigh tee pee', GSK3 -> 'gee ess kay 3', PPi -> 'pee pee eye', FBP-ase -> 'ef bee pee-ase'"""
    out = []
    for ch in tok:
        if ch.isdigit():
            if out and out[-1].isdigit(): out[-1] += ch
            else: out.append(ch)
        elif ch.upper() in LETTER: out.append(LETTER[ch.upper()])
    return " ".join(out)

def acronyms(s):
    def fix(m):
        w = m.group(0)
        if w in WORDS: return w.lower()
        if re.fullmatch(r"[IVX]+", w) and len(w) <= 4: return w      # roman numerals left for context rules
        return spell(w)
    # 2+ letters with at least two capitals (ATP, NADH, PPi, G6P, F6P, PFK, C4 handled below) -> spell
    s = re.sub(r"(?<![A-Za-z])(?=[A-Za-z0-9]*[A-Z][A-Za-z0-9]*[A-Z])[A-Za-z0-9]*[A-Z][A-Za-z0-9]*(?![A-Za-z])", fix, s)
    # one capital stuck to a number: C4, C16, F1, G1, B12 -> "see 4"
    s = re.sub(r"(?<![A-Za-z])([A-Z])(\d+)(?![A-Za-z])", lambda m: LETTER[m.group(1)] + " " + m.group(2), s)
    # number stuck to capitals: 2PG, 3PG -> "2 pee gee"
    s = re.sub(r"(?<![A-Za-z\d])(\d+)([A-Z]{1,3})(?![A-Za-z])", lambda m: m.group(1) + " " + spell(m.group(2)), s)
    return s

def say(s):
    s = s.replace("**", "").replace("*", "")
    for a, b in SAY: s = re.sub(a, b, s)
    for a, b in SYMBOLS: s = s.replace(a, b)
    s = re.sub(r"(\w)-(\d)", r"\1 \2", s)                    # PFK-1 -> PFK 1, glucose-6 -> glucose 6
    s = re.sub(r"(\d)-(\w)", r"\1 \2", s)                    # 6-phosphate -> 6 phosphate
    s = re.sub(r"(\S)/(\S+) ratio", r"\1 to \2 ratio", s)
    s = re.sub(r"\b(mol)\b", "mole", s)
    s = acronyms(s)
    s = re.sub(r"([A-Za-z])/([A-Za-z0-9])", r"\1 or \2", s)  # malate/pyruvate -> malate or pyruvate
    s = re.sub(r"(\d)/(\d)", r"\1 over \2", s)
    s = re.sub(r"\s*/\s*", " over ", s)
    s = re.sub(r"(?<![\w.])\+(\d)", r"plus \1", s)
    s = re.sub(r"(?<![\w.])-(\d)", r"negative \1", s)
    s = s.replace(" = ", " equals ").replace(" + ", " plus ").replace(" - ", ", ")
    s = s.replace("(", ", ").replace(")", ", ").replace("[", ", ").replace("]", ", ").replace('"', "")
    for _ in range(3):
        for a, b in [(" ,", ","), (",,", ","), (", .", "."), (",.", "."), (".,", "."), (", :", ":"), (",:", ":"), ("..", "."),
                     ("?.", "?"), ("!.", "!"), (":,", ":"), (", ;", ";")]:
            s = s.replace(a, b)
    s = re.sub(r"\s+", " ", s).strip().strip(",").strip()
    s = re.sub(r"(^|[.?!:] )([a-z])", lambda m: m.group(1) + m.group(2).upper(), s)
    return s

def lesson_text(cat, l):
    out = [f"{cat}. {l['title']}."]
    for b in l["blocks"]:
        if "h" in b: out.append(f"\n{b['h']}.")
        elif "p" in b: out.append(b["p"])
        elif "list" in b: out += [x for x in b["list"]]
        elif "steps" in b:
            words = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"]
            out += [f"{words[i] if i < len(words) else 'Next'}, {x}" for i, x in enumerate(b["steps"])]
        elif "tip" in b: out.append("Heads up. " + b["tip"])
        elif "key" in b: out.append("Here's the exam takeaway. " + b["key"])
        elif "table" in b:
            hd = b["table"]["head"]
            for row in b["table"]["rows"]:
                rest = [f"{hd[i]}: {row[i]}" if hd[i] else row[i] for i in range(1, len(row))]
                out.append(f"{row[0]}. " + ". ".join(rest) + ".")
        elif "img" in b and b.get("cap"):                    # read the picture's caption, minus the "tap to zoom" hint
            cap = re.sub(r"\s*(Tap|Click)[^.]*zoom[^.]*\.?", "", b["cap"]).strip()
            if cap: out.append("In the picture: " + cap)
        elif "example" in b:
            out.append("Try this one. " + b["example"]["q"])
            out.append("[PAUSE]")
            out.append("Here's how it works out. " + b["example"]["a"])
    return [say(x) if x != "[PAUSE]" else x for x in out]

def tracks():
    d = json.load(open(SET, encoding="utf-8"))
    T = []
    for c in d["categories"]:
        cat = re.sub(r"^Ch (\d+):", r"Chapter \1:", c["category"])
        for l in c.get("lessons", []):
            T.append({"id": l["id"], "title": l["title"], "parts": lesson_text(cat, l)})
    return d, T

OVERVIEW = []   # overview tracks for a deck go here (see scripts.py for the shape)

if __name__ == "__main__":
    _, T = tracks()
    for t in T:
        print("=" * 8, t["id"], t["title"])
        for p in t["parts"]: print(p)
