from src.inference import predict

test_suite = [
    # User's exact sentence from the screenshot
    "Nothing seems to make me feel better today",
    "Nothing helps anymore",
    "Nothing makes me feel good",
    "Nothing brings me joy",
    "Nothing works to fix my mood",
    "No matter what I do, I still feel sad and empty",
    "Even when good things happen, I feel numb",
    "Cannot seem to feel happy at all",
    "Unable to find any joy in life",
    "Hardly anything makes me smile these days",
    
    # Previous user sentences
    "Lately, I haven't felt like myself at all",
    "I feel like nobody really understands what I'm going through",
    "I miss how things used to be",
    "I cannot take this anymore, I am so done",
    "I cant even get out of bed anymore",
    "I have been crying all day and I dont know why",
    "I hate my life and I just feel so depressed",
    "I am sick of feeling like this, nothing ever gets better",
    "I hate myself so much",
    "I feel so sad and useless",
    "I feel so empty and lost, nothing matters anymore",
    "I am falling apart, I feel broken",
    "I just want to disappear, I dont want to be here",
    "I have completely lost hope in everything",
    "I feel dead inside, everything feels dark",
    "I feel like a burden to everyone around me",
    "Nothing feels right, I feel completely numb inside",
    "I have no energy or motivation to do anything",
    "I cannot stop crying and I feel so hopeless",
    "I am so done with everything in my life",
    "I dread waking up in the morning, everything is pointless",
    "I just want to sleep forever, I am exhausted of living",
    "Nobody cares about me and nobody would notice if I disappeared",
    "I hate everything about my life right now",
    "I feel so alone in this world, carrying this heavy heart"
]

print("=" * 85)
passed = 0
for idx, text in enumerate(test_suite, 1):
    res = predict(text)
    pred = res["predicted_label"]
    scores = res["all_scores"]
    hap = scores.get("Happy/Positive", 0.0)
    dep = scores.get("Depressed/Sad", 0.0)
    is_ok = (pred == "Depressed/Sad") and (hap == 0.0)
    if is_ok:
        passed += 1
        status = "OK  "
    else:
        status = "FAIL"
    print(f"{idx:02d} | {status} {pred:14s} | Happy: {hap:.1%} | Dep: {dep:.1%} | {text}")

print("=" * 85)
print(f"Passed: {passed}/{len(test_suite)} ({passed/len(test_suite):.1%})")
