from src.inference import predict
from src.routes.analyze import (
    _compute_depression_score,
    _compute_anxiety_score,
    _compute_stress_score,
    _compute_anger_score,
    _score_to_level,
)

tests = [
    "Completely exhausted. Working 14-hour days for the last 3 weeks. I feel like my brain is fried and I have zero patience left. I cant even remember the last time I relaxed or slept a full 8 hours.",
    "I am not happy; life feels exhausted",
    "cant stop worrying about my exam tomorrow, my chest feels tight and hands are shaking",
    "I feel so hopeless and empty, nothing matters anymore, I just cry all day",
    "Get down here now! or I will punch you right in your face",
]

for t in tests:
    r = predict(t)
    s = r["all_scores"]
    l = r.get("lexicon_scores", {})
    f = r.get("keyword_flags", {})

    dep = _compute_depression_score(s, l, f)
    anx = _compute_anxiety_score(s, l, f)
    strs = _compute_stress_score(s, l, f)
    ang = _compute_anger_score(r.get("anger_score", 0), l, f)

    print(f"TEXT : {t[:60]}")
    print(f"LABEL: {r['predicted_label']}")
    print(f"  DEP={dep:.2f}({_score_to_level(dep)})  ANX={anx:.2f}({_score_to_level(anx)})  STR={strs:.2f}({_score_to_level(strs)})  ANG={ang:.2f}({_score_to_level(ang)})")
    print()
