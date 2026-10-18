"""Turn lesson blocks into narration text, plus two overview tracks."""
import json, re

SET = "/home/claude/study-decks/sets/exsc-362/midterm.json"

# exact formula strings -> spoken (checked first)
FORM = {
 "W = mg": "W equals m g", "F = μN": "F equals mu times N", "c = √(a² + b²)": "c equals the square root of a squared plus b squared",
 "θ = tan⁻¹(opposite / adjacent)": "theta equals inverse tangent of opposite over adjacent",
 "F_Slope = -mg sin θ": "F slope equals negative m g sine theta",
 "F_slope = mg x sin(θ)": "m g times sine of theta", "N = mg x cos(θ)": "m g times cosine of theta",
 "a = Δv / Δt": "a equals change in v over change in t", "d = vᵢt + ½at²": "d equals v initial times t, plus one half a t squared",
 "v = vᵢ + at": "v equals v initial plus a t",
 "X = X₀ + vₓt": "X equals X naught plus v x times t", "Y = Y₀ + vᵧt + ½gt²": "Y equals Y naught plus v y t plus one half g t squared",
 "vᵧ = v sin θ": "v y equals v sine theta", "vₓ = v cos θ": "v x equals v cosine theta",
 "MH = vᵧ² / (-2g) + Y₀": "max height equals v y squared over negative 2 g, plus Y naught",
 "FT = 2vᵧ / -g": "flight time equals 2 v y over negative g",
 "FT = (-vᵧ - √(vᵧ² - 2gY₀)) / g": "flight time equals negative v y minus the square root of v y squared minus 2 g Y naught, all over g",
 "HD = vₓ x FT": "horizontal distance equals v x times flight time",
 "F = G m₁ m₂ / r²": "F equals big G times m one times m two, over r squared",
 "L = mv": "L equals m v", "FΔt = mΔv": "F delta t equals m delta v", "FΔt": "F delta t",
 "m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂": "m one u one plus m two u two equals m one v one plus m two v two",
 "e = √(bounce height / drop height)": "e equals the square root of bounce height over drop height",
 "e = (v₂ - v₁) / (u₁ - u₂)": "e equals v two minus v one, over u one minus u two",
 "(v₂ - v₁)/(u₁ - u₂)": "v two minus v one over u one minus u two",
 "U = Fd": "U equals F times d", "U = ΔKE + ΔGPE + ΔSE": "U equals the change in kinetic, gravitational, and strain energy",
 "KE = ½mv²": "kinetic energy equals one half m v squared", "GPE = -mgh": "gravitational energy equals negative m g h",
 "SE = ½kx²": "strain energy equals one half k x squared", "P = U / t": "P equals U over t", "P = Fv": "P equals F times v",
 "P = U / t = Fv": "P equals U over t, which also equals F times v", "U = F": "U equals F",
 "F = ma": "F equals m a", "mgh": "m g h", "MH = vᵧ² / (-2g) + Y₀ ": "max height equals v y squared over negative 2 g plus Y naught",
}
UNITS = [
 (r"(\d) ?m/s/s", r"\1 meters per second squared"), (r"(\d) ?m/s", r"\1 meters per second"),
 (r"kg·m/s", "kilogram meters per second"), (r"(\d) ?kN/m", r"\1 kilonewtons per meter"),
 (r"(\d) ?N/m", r"\1 newtons per meter"),
 (r"(\d) ?kg\b", r"\1 kilograms"), (r"(\d) ?lb\b", r"\1 pounds"), (r"(\d) ?mph\b", r"\1 miles per hour"),
 (r"(\d) ?yd\b", r"\1 yards"), (r"(\d) ?cm\b", r"\1 centimeters"), (r"(\d) ?N\b", r"\1 newtons"),
 (r"(\d) ?J\b", r"\1 joules"), (r"(\d) ?W\b", r"\1 watts"), (r"(\d) ?m\b", r"\1 meters"), (r"(\d) ?s\b", r"\1 seconds"),
 (r"(\d)°", r"\1 degrees"),
]
CHARS = [("tan⁻¹", "inverse tangent of "), ("√(", "the square root of ("), ("√", "the square root of "),
 ("²", " squared"), ("vᵧ", "v y"), ("vₓ", "v x"), ("vᵢ", "v initial"), ("Y₀", "Y naught"), ("X₀", "X naught"),
 ("θ", "theta"), ("μ", "mu"), ("Δ", "change in "), ("½", "one half"), ("≈", "about"),
 ("sin ", "sine "), ("cos ", "cosine "), (" / ", " over "), ("→", "then"),
 ("e.g.", "for example"), ("(x1000)", "(multiply by a thousand)"), ("(/100)", "(divide by a hundred)"),
 ("kN/m", "kilonewtons per meter"), ("N/m", "newtons per meter"), ("vs.", "versus"), ("A/P", "front to back")]

def say(s):
    s = s.replace("**", "").replace("*", "")
    for code in re.findall(r"`([^`]+)`", s):
        s = s.replace(f"`{code}`", FORM.get(code.strip(), code))
    for k in sorted(FORM, key=len, reverse=True):
        if len(k) >= 5 and k in s: s = s.replace(k, FORM[k])
    for a, b in [("(KE)", ""), ("(GPE)", ""), ("(SE)", ""), ("strain/elastic", "strain or elastic"), ("4x", "4 times"), ("J/s", "joules per second"), ("cm to m", "centimeters to meters")]: s = s.replace(a, b)
    s = re.sub(r" x (?!=|equals|squared|times)", " times ", s)
    s = s.replace("mΔv", "m delta v").replace("mΔ", "m delta ")
    s = s.replace("√(", "the square root of ").replace("tan⁻¹(", "inverse tangent of ")
    s = s.replace("sin(", "sine of ").replace("cos(", "cosine of ").replace("½(", "one half times (")
    s = re.sub(r"\)\s*\(", " times ", s)
    s = re.sub(r"(\d)\(", r"\1 times (", s)
    s = re.sub(r"(?<![\w.])-(\d)", r"negative \1", s)
    s = re.sub(r"(?<![\w.])-v", "negative v", s)
    s = re.sub(r"(?<![\w.])\+(\d)", r"positive \1", s)
    s = re.sub(r"\b1 ?(lb|kg|mile|yd|N)\b", lambda m: "1 " + {"lb":"pound","kg":"kilogram","mile":"mile","yd":"yard","N":"newton"}[m.group(1)], s)
    for a, b in UNITS: s = re.sub(a, b, s)
    s = re.sub(r"(?<![\d.])1 pounds", "1 pound", s)
    s = re.sub(r"(\d) g\b", r"\1 grams", s)
    for a, b in CHARS: s = s.replace(a, b)
    WORDS = [(r"\bm/s\b", "meters per second"), (r"\bmph\b", "miles per hour"), (r"\bkg\b", "kilograms"), (r"\blb\b", "pounds"),
             (r"meters/mile", "meters per mile"), (r"seconds/hour", "seconds per hour"),
             (r"\bGPE\b", "gravitational energy"), (r"\bKE\b", "kinetic energy"), (r"\bSE\b", "strain energy"),
             (r"\bFT\b", "flight time"), (r"\bHD\b", "horizontal distance"), (r"\bMH\b", "max height"),
             (r"\bmgh\b", "m g h"), (r"\bmv\b", "m v"), (r"\bma\b", "m a"), (r"\bmu\b", "mew"),
             (r"\b1st\b", "first"), (r"\b2nd\b", "second"), (r"\b3rd\b", "third"), (r"(\w)/(\w)", r"\1 over \2")]
    for a, b in WORDS: s = re.sub(a, b, s)
    s = re.sub(r"\b([A-Z]{3,})\b", lambda m: m.group(1).lower(), s)
    s = s.replace(" - ", " minus ").replace(" + ", " plus ").replace(" = ", " equals ")
    s = s.replace("(", ", ").replace(")", ", ")
    for _ in range(3):
        for a, b in [(" ,", ","), (",,", ","), (", .", "."), (",.", "."), (".,", "."), (", :", ":"), (",:", ":"), ("..", "."), ("?.", "?"), ("!.", "!"), (":,", ":")]:
            s = s.replace(a, b)
    s = re.sub(r"\s+", " ", s).strip().rstrip(",")
    s = re.sub(r"(^|[.?!:] )([a-z])", lambda m: m.group(1) + m.group(2).upper(), s)
    s = re.sub(r"(^|\. )E (equals|measures|belongs|is)", r"\1The coefficient \2", s)
    return s

def lesson_text(cat, l):
    out = [f"{cat}. {l['title']}."]
    for b in l["blocks"]:
        if "h" in b: out.append(f"\n{b['h']}.")
        elif "p" in b: out.append(b["p"])
        elif "list" in b: out += [x for x in b["list"]]
        elif "steps" in b:
            words = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"]
            out += [f"{words[i]}, {x}" for i, x in enumerate(b["steps"])]
        elif "tip" in b: out.append("Heads up. " + b["tip"])
        elif "key" in b: out.append("Here's the exam takeaway. " + b["key"])
        elif "table" in b:
            hd = b["table"]["head"]
            for row in b["table"]["rows"]:
                first = row[0]
                rest = [f"{hd[i]}: {row[i]}" if hd[i] else row[i] for i in range(1, len(row))]
                out.append(f"{first}. " + ". ".join(rest) + ".")
        elif "example" in b:
            out.append("Try this one. " + b["example"]["q"])
            out.append("[PAUSE]")
            out.append("Here's how it works out. " + b["example"]["a"])
    return [say(x) if x != "[PAUSE]" else x for x in out]

def tracks():
    d = json.load(open(SET, encoding="utf-8"))
    T = []
    for c in d["categories"]:
        for l in c["lessons"]:
            T.append({"id": l["id"], "title": l["title"], "parts": lesson_text(c["category"].replace("Ch ", "Chapter "), l)})
    return d, T

OVERVIEW = [
 {"id": "ov-1", "title": "The big picture: how the five chapters connect", "parts": [
  "Biomechanics midterm. The big picture.",
  "Here's the whole first half of this class in one sentence. Forces cause changes in motion, and everything else is just different ways of describing or measuring that.",
  "Chapter one is the forces themselves. A force is a push or a pull that can accelerate something. Weight is gravity's pull on your mass, mass times negative nine point eight, so it points down. Friction is mu times the normal force, and the normal force is whatever's pushing perpendicular to the surface. When several forces act at once, you combine them into one resultant. Parallel forces get added or subtracted first, then you build a right triangle, use the Pythagorean theorem for the size and inverse tangent for the angle. If the resultant is zero, the object is in equilibrium, which means it's not accelerating. It could still be moving.",
  "Chapter two is describing motion without caring about the cause. That's kinematics. Distance is the path you actually took. Displacement is the straight line from start to finish. Speed uses distance, velocity uses displacement and has a direction. Acceleration is the change in velocity over time, final minus initial. And since velocity has a direction, changing direction counts as acceleration, even at a constant speed.",
  "Chapter three takes those ideas and launches something into the air. Once it's a projectile, the horizontal and vertical directions don't talk to each other. Horizontal velocity stays constant. Vertical acceleration is negative nine point eight the entire time, at takeoff, at the peak, all of it. So you split the release velocity with sine and cosine, use v y for height and flight time, and use v x for distance.",
  "Chapter four goes back to the causes. Newton's laws. First law, inertia: things keep doing what they're doing unless a net force changes it. Second law, F equals m a: acceleration follows the net force and gets smaller with more mass. Third law: push on something and it pushes back just as hard. Momentum is mass times velocity, and impulse, force times time, equals the change in momentum. That's how mats and follow-throughs work. Then collisions: momentum is conserved when no outside net force acts, and the coefficient of restitution tells you how bouncy the collision between two objects is.",
  "Chapter five is the energy version of the same story. Work is force times displacement, positive when the force and the motion line up, negative when they're opposite. Energy comes in three flavors here: kinetic from motion, gravitational from height, and strain from stretching. Work equals the change in energy, and energy is conserved when gravity is the only thing acting, like a diver in the air. Power is how fast the work gets done.",
  "Notice how it all loops together. A high jumper pushes on the ground, that's a force. The ground pushes back, that's Newton's third law. The net force over the push-off time is the impulse, which sets her takeoff velocity. Once she's off the ground she's a projectile, and her peak height comes from that vertical velocity. And you could get that same peak height from energy, since her kinetic energy turns into gravitational energy on the way up. Same jump, three different chapters, and they all agree.",
  "The exam is about two thirds math and one third concepts and definitions. For the math, the skill that matters most is setting the problem up right: picking the right equation, getting units into kilograms, meters, and seconds, and remembering the little traps. For the concepts, know the definitions cold, and know which law or idea explains a situation. That's the midterm. You've got this."]},
 {"id": "ov-2", "title": "Exam traps: the mistakes he warned about", "parts": [
  "Biomechanics midterm. The traps.",
  "This track is every mistake the professor flagged in class or that shows up as a wrong answer choice. If you can dodge these, the math section gets a lot easier.",
  "Trap one. Weight versus mass. Mass is in kilograms and never changes. Weight is in newtons, it's mass times negative nine point eight, and it's negative because it points down. In outer space, weight is zero but mass is the same. If a problem gives you pounds, divide by two point two for kilograms, or multiply by four point four five for newtons.",
  "Trap two. Friction uses the normal force, not the mass. If a fifty kilogram skater has a coefficient of point zero eight, you multiply point zero eight by four hundred ninety newtons, not by fifty.",
  "Trap three. Relative to horizontal versus relative to vertical. Relative to the ground or horizontal means horizontal is zero degrees. If you get an angle and the question wanted the other reference, ninety minus your answer is the one they want.",
  "Trap four. On a runner problem, use the forces on the runner, not from the runner. If he pushes forward into the ground at foot strike, the ground pushes back on him. Air resistance points against his motion. And do not forget body weight pulling down. Leaving out weight is the most common way to get the wrong angle.",
  "Trap five. Slopes. Gravity pulling down the slope uses sine of the slope angle. The normal force, pressing into the slope, uses cosine. Friction and air resistance both point back up the slope, so subtract them. And if he asks for acceleration, divide the resultant force by mass, not by weight.",
  "Trap six. Change in anything is final minus initial. A gymnast landing at four meters per second downward and stopping has a change in velocity of zero minus negative four, which is positive four.",
  "Trap seven. In the impulse momentum equation, F is the net force. If a partner lifts a dancer with five hundred newtons, gravity is still pulling her down, so subtract her weight first. Plugging in the full five hundred gives you a velocity that's way too high.",
  "Trap eight. Max height. Square v y, divide by nineteen point six, then add the starting height. Forgetting to square and forgetting to add the starting height are the two classic misses.",
  "Trap nine. Flight time. If it lands at the same height it started, use the short one, two v y over nine point eight. If it starts above the ground, like a shot put, use the long quadratic one. And always use the vertical component of velocity, not the resultant.",
  "Trap ten. Vertical acceleration of a projectile is always negative nine point eight. At the instant of takeoff, at the peak, the whole flight. Velocity at the peak is zero, but acceleration isn't.",
  "Trap eleven. Coefficient of restitution from a drop test is the square root of bounce height over drop height. Don't forget the square root. And it's a property of the two objects colliding, so dropping from a bit higher doesn't change it.",
  "Trap twelve. Work signs. Force and motion in the same direction is positive work, which goes with concentric muscle action. Opposite directions is negative work, which goes with eccentric action. A full rep up and down is zero net work. Kinetic energy is never negative, because velocity is squared.",
  "Last thing. When answers come as ranges, sanity check your number. If you get something negative, or nowhere near any of the ranges, go back and look for one of these traps. That's it. Go get it."]},
]

if __name__ == "__main__":
    d, T = tracks()
    for t in T + OVERVIEW:
        print("=====", t["id"], t["title"])
        print("\n".join(t["parts"]))
