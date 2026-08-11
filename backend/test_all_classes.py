"""
Full regression test: verifies ALL emotion classes still work correctly
after all inference.py / analyze.py changes.

Classes tested:
  - Depressed/Sad
  - Angry/Irritated
  - Anxious/Stressed
  - Happy/Positive
  - Neutral
"""

from src.inference import predict

# Format: (text, expected_label, allowed_wrong_label_set_or_None)
# allowed_wrong = None means strictly only expected_label accepted
# allowed_wrong = ["X", "Y"] means X or Y are also acceptable alternates

test_suite = [
    # ─── DEPRESSED / SAD ─────────────────────────────────────────────────────
    ("Nothing seems to make me feel better today",       "Depressed/Sad",    None),
    ("Unable to find any joy in life",                   "Depressed/Sad",    None),
    ("Hardly anything makes me smile these days",        "Depressed/Sad",    None),
    ("Lately I haven't felt like myself at all",         "Depressed/Sad",    None),
    ("I feel like nobody really understands what I'm going through", "Depressed/Sad", None),
    ("I miss how things used to be",                     "Depressed/Sad",    None),
    ("I cannot take this anymore, I am so done",         "Depressed/Sad",    None),
    ("I cant even get out of bed anymore",               "Depressed/Sad",    None),
    ("I have no energy or motivation to do anything",    "Depressed/Sad",    None),
    ("I feel dead inside, everything feels dark",        "Depressed/Sad",    None),
    ("I feel like a burden to everyone around me",       "Depressed/Sad",    None),
    ("I have completely lost hope in everything",        "Depressed/Sad",    None),
    ("Nothing feels right, I feel completely numb inside","Depressed/Sad",   None),
    ("Nobody cares about me and nobody would notice if I disappeared", "Depressed/Sad", None),
    ("I feel so alone in this world, carrying this heavy heart", "Depressed/Sad", None),
    ("I hate my life and I just feel so depressed",      "Depressed/Sad",    None),
    ("I feel so sad and useless",                        "Depressed/Sad",    None),
    ("I cannot stop crying and I feel so hopeless",      "Depressed/Sad",    None),
    ("I am falling apart, I feel broken",                "Depressed/Sad",    None),
    ("I just want to disappear, I dont want to be here", "Depressed/Sad",   None),

    # ─── HAPPY / POSITIVE ────────────────────────────────────────────────────
    ("I am so happy today, everything is going great!",  "Happy/Positive",   None),
    ("This is the best day of my life, I feel amazing!", "Happy/Positive",   None),
    ("I just got promoted and I couldn't be more thrilled!", "Happy/Positive", None),
    ("Feeling so blessed and grateful for everything I have", "Happy/Positive", None),
    ("Life is beautiful and I am loving every moment of it", "Happy/Positive", None),
    ("Today was absolutely wonderful, I feel full of joy", "Happy/Positive", None),
    ("I just got the best news ever and I am overjoyed", "Happy/Positive",   None),
    ("I feel so energized and excited about the future", "Happy/Positive",   ["Anxious/Stressed"]),
    ("Everything is working out perfectly and I feel great", "Happy/Positive", None),
    ("I am so proud of myself today",                    "Happy/Positive",   None),

    # ─── ANGRY / IRRITATED ────────────────────────────────────────────────────
    ("I am so furious right now, this is completely unacceptable", "Anger/Hostility",  None),
    ("I cannot believe how rude and disrespectful they were",     "Anger/Hostility",  ["Depressed/Sad"]),
    ("This makes me so angry, I am absolutely livid",             "Anger/Hostility",  None),
    ("I am beyond frustrated with this situation, it is outrageous", "Anger/Hostility", None),
    ("They keep lying to me and I am fed up with it",             "Anger/Hostility",  None),
    ("I am so irritated and disgusted by this behavior",          "Anger/Hostility",  None),
    ("How dare they treat people like this, I am enraged",        "Anger/Hostility",  ["Anxious/Stress"]),
    ("This is infuriating, I can't take this injustice anymore",  "Anger/Hostility",  None),
    ("I hate being treated this way, it makes me so mad",         "Anger/Hostility",  ["Depressed/Sad"]),
    ("They destroyed everything I worked for and I am seething",  "Anger/Hostility",  ["Anxious/Stress"]),

    # ─── ANXIOUS / STRESSED ──────────────────────────────────────────────────
    ("I am so stressed about my exams, I can't sleep",    "Anxious/Stress",   None),
    ("I feel so anxious and nervous, my heart is racing", "Anxious/Stress",   None),
    ("I am overwhelmed with work and deadlines, I can't cope", "Anxious/Stress", None),
    ("I have this constant feeling of dread and panic",   "Anxious/Stress",   None),
    ("I keep worrying about everything and I can't calm down", "Anxious/Stress", None),
    ("My anxiety is through the roof and I feel like I can't breathe", "Anxious/Stress", None),
    ("I am terrified about the meeting tomorrow, what if I fail", "Anxious/Stress", None),
    ("I feel so tense and wound up all the time",         "Anxious/Stress",   None),
    ("I had a panic attack today, everything felt out of control", "Anxious/Stress", None),
    ("I am burning out from all this pressure and stress", "Anxious/Stress",  None),

    # ─── NEUTRAL ─────────────────────────────────────────────────────────────
    ("I went to the store and bought some groceries today", "Neutral",        None),
    ("The weather is quite cloudy this afternoon",       "Neutral",          None),
    ("I read a book and then watched some television",   "Neutral",          None),
    ("The meeting was scheduled for 3pm on Tuesday",     "Neutral",          None),
    ("I cooked pasta for dinner and it tasted fine",     "Neutral",          None),
]

SEP = "=" * 95

print(SEP)
print(f"{'#':>3} | {'STATUS':6} | {'EXPECTED':18} | {'PREDICTED':18} | TEXT")
print(SEP)

passed = 0
failed_list = []

for idx, (text, expected, alternatives) in enumerate(test_suite, 1):
    res = predict(text)
    pred = res["predicted_label"]
    scores = res["all_scores"]
    hap  = scores.get("Happy/Positive",  0.0)
    dep  = scores.get("Depressed/Sad",   0.0)
    ang  = scores.get("Angry/Irritated", 0.0)
    anx  = scores.get("Anxious/Stressed",0.0)
    neu  = scores.get("Neutral",         0.0)

    allowed = [expected]
    if alternatives:
        allowed += alternatives
    is_ok = pred in allowed

    if is_ok:
        passed += 1
        status = "PASS  "
    else:
        status = "FAIL !"
        failed_list.append((idx, text, expected, pred))

    short_text = text[:55] + "..." if len(text) > 55 else text
    print(f"{idx:>3} | {status} | {expected:18} | {pred:18} | {short_text}")

print(SEP)
print(f"Passed: {passed}/{len(test_suite)} ({passed/len(test_suite):.1%})")
print(SEP)

if failed_list:
    print("\n-- FAILED CASES --")
    for idx, text, expected, pred in failed_list:
        print(f"  [{idx:02d}] Expected: {expected}")
        print(f"        Predicted: {pred}")
        print(f"        Text: {text}")
        print()
