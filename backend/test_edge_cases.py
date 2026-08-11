from src.inference import predict

test_cases = [
    # 2. Negative Sentiment — Different Emotions
    # Negative + Anger -> Expected: Anger/Hostility
    ("I can't believe they ignored my concerns after I explained everything.", "Anger/Hostility"),
    ("I'm furious that they blamed me for something I didn't do.", "Anger/Hostility"),
    ("It honestly makes me angry when people take advantage of someone's kindness.", "Anger/Hostility"),
    ("I've had enough of being treated like my opinion doesn't matter.", "Anger/Hostility"),
    ("The way they handled the situation was completely unacceptable.", "Anger/Hostility"),
    
    # Negative + Sadness -> Expected: Depressed/Sad
    ("I still feel empty whenever I think about the person we lost.", "Depressed/Sad"),
    ("It hurts knowing that things will never be the same again.", "Depressed/Sad"),
    ("I miss the days when everything felt simple.", "Depressed/Sad"),
    ("Watching them leave without saying goodbye broke my heart.", "Depressed/Sad"),
    ("I tried to stay strong, but the situation really got to me.", "Depressed/Sad"),
    
    # Negative + Fear -> Expected: Anxious/Stress
    ("I'm genuinely scared of what might happen if this continues.", "Anxious/Stress"),
    ("The thought of losing everything I've worked for terrifies me.", "Anxious/Stress"),
    ("I couldn't sleep because I kept thinking something would go wrong.", "Anxious/Stress"),
    ("Walking into that room alone made me extremely nervous.", "Anxious/Stress"),
    ("I'm worried that one mistake could ruin everything.", "Anxious/Stress"),
    
    # Negative + Anxiety/Stress -> Expected: Anxious/Stress
    ("I've been overthinking this decision all night.", "Anxious/Stress"),
    ("The uncertainty is making it difficult for me to concentrate.", "Anxious/Stress"),
    ("I feel completely overwhelmed by everything happening at once.", "Anxious/Stress"),
    ("I'm under so much pressure that I don't know what to do anymore.", "Anxious/Stress"),
    ("Waiting for the results has been incredibly stressful.", "Anxious/Stress"),

    # 3. Neutral Sentiment — Emotional States -> Expected: Neutral
    ("I was nervous before the interview, but I answered every question.", "Neutral"),
    ("I felt sad when she left, and then I went back to work.", "Neutral"),
    ("I was surprised to see him at the meeting.", "Neutral"),
    ("I felt anxious while waiting for the doctor to arrive.", "Neutral"),
    ("He became angry during the discussion and left the room.", "Neutral"),
    ("I was excited about the event, so I arrived early.", "Neutral"),
    ("She was disappointed by the result but accepted the decision.", "Neutral"),
    ("I felt nervous, but the presentation started exactly on time.", "Neutral"),

    # 4. Neutral Statements With Almost No Emotion -> Expected: Neutral
    ("The meeting starts at nine tomorrow morning.", "Neutral"),
    ("I submitted the assignment before the deadline.", "Neutral"),
    ("The package arrived this afternoon.", "Neutral"),
    ("The train leaves from platform three.", "Neutral"),
    ("he is working in the new company as a software engineer", "Neutral"),
    ("The store closes at ten tonight.", "Neutral"),
    ("I changed my password yesterday.", "Neutral"),
    ("The report contains twenty pages.", "Neutral"),
    ("She attended the conference last Friday.", "Neutral"),
    ("The server was restarted after the update.", "Neutral"),

    # 5. Mixed Emotions — Positive + Negative -> Expected: Happy/Positive
    ("I was nervous about the presentation, but I'm proud of how I handled it.", "Happy/Positive"),
    ("I was angry about the mistake, but I'm glad we managed to fix it.", "Happy/Positive"),
    ("I felt sad when they left, but I'm grateful for the time we had together.", "Happy/Positive"),
    ("I was stressed about the exam all week, but relieved when it was finally over.", "Happy/Positive"),
    ("I was scared to take the opportunity, but excited once I finally accepted it.", "Happy/Positive"),
    ("I felt disappointed by the result, but proud of the effort I put in.", "Happy/Positive"),
    ("Losing the match hurt, but I'm proud of how our team fought.", "Happy/Positive"),
    ("I was worried about moving away, but I'm looking forward to starting over.", "Happy/Positive"),
    ("I hated saying goodbye, but I'm excited about what comes next.", "Happy/Positive"),
    ("The experience was painful, but it taught me something valuable.", "Happy/Positive"),

    # 6. Negative Sentiment + Positive Emotion -> Expected: Happy/Positive
    ("I lost the competition, but I'm proud of how far I made it.", "Happy/Positive"),
    ("The project failed, but I'm grateful for everything I learned.", "Happy/Positive"),
    ("I didn't get the job, but I'm excited to keep improving.", "Happy/Positive"),
    ("We missed our target, but I'm proud of the team's effort.", "Happy/Positive"),
    ("The trip was exhausting, but I loved every moment of it.", "Happy/Positive"),
    ("I had a terrible day, but one person's kindness made it better.", "Happy/Positive"),
    ("I was disappointed with the result, but I appreciate everyone's support.", "Happy/Positive"),

    # 7. Positive Sentiment + Negative Emotion -> Expected: Happy/Positive
    ("I'm excited about the new job even though I'm nervous about the responsibility.", "Happy/Positive"),
    ("I'm grateful for the opportunity, although I'm scared of failing.", "Happy/Positive"),
    ("I'm proud of what I achieved despite feeling exhausted.", "Happy/Positive"),
    ("I'm looking forward to tomorrow, even though today has been stressful.", "Happy/Positive"),
    ("I'm excited to meet everyone, but honestly, I'm a little anxious.", "Happy/Positive"),
    ("I'm glad I accepted the challenge, even though it terrified me at first.", "Happy/Positive"),

    # 9. Sarcasm — Positive Words, Negative Meaning -> Expected: Anger/Hostility or Depressed/Sad
    ("Oh great, another meeting that could have been an email.", "Anger/Hostility"),
    ("Wonderful, my computer crashed right before I saved the project.", "Anger/Hostility"),
    ("Fantastic, exactly what I needed today—another problem.", "Anger/Hostility"),
    ("What a beautiful way to start the morning, getting yelled at by my manager.", "Anger/Hostility"),
    ("Amazing customer service, they only ignored me for three hours.", "Anger/Hostility"),
    ("Perfect, because having my flight canceled was exactly what I wanted.", "Anger/Hostility"),
    ("Lovely, another bill I absolutely needed.", "Depressed/Sad"),
    ("Wow, I'm so lucky to have such helpful coworkers.", "Anger/Hostility"),
    ("Brilliant idea, let's make the deadline even earlier.", "Anxious/Stress"),
    ("Fantastic, because sleeping for two hours is definitely enough.", "Anxious/Stress"),

    # 10. Sarcasm — Negative Words, Potentially Positive Meaning -> Expected: Happy/Positive
    ("Yeah, that was absolutely terrible—I had the best time.", "Happy/Positive"),
    ("I really hate how much I enjoyed that concert.", "Happy/Positive"),
    ("What an awful vacation, I definitely don't want to go back.", "Happy/Positive"),
    ("That movie was painfully good.", "Happy/Positive"),
    ("I'm devastated that I have to spend another week here.", "Happy/Positive"),
    ("I suppose winning the competition wasn't completely horrible.", "Happy/Positive"),
    ("Being surrounded by supportive friends is such a terrible experience.", "Happy/Positive"),
    ("I can't stand how beautiful this place is.", "Happy/Positive")
]

failed = 0
for text, expected in test_cases:
    res = predict(text)
    pred = res['predicted_label']
    sarc = res['is_sarcastic']
    
    # We allow some flexibility for sarcasm labels since they are hard (e.g. Anger vs Stress)
    # The sarcasm flag can be True for Happy/Positive if the text uses negative words sarcastically
    if pred != expected:
        failed += 1
        print(f"FAILED: '{text}'")
        print(f"   Expected: {expected} | Predicted: {pred} | Sarcasm Flag: {sarc}")
        print("-" * 60)

print(f"\nTotal Failed: {failed} out of {len(test_cases)}")
