import pandas as pd
import random
import json

# Label Map: {"Happy/Positive": 0, "Neutral": 1, "Anxious/Stress": 2, "Depressed/Sad": 3}
# Note: "Anger/Hostility" is 4, but let's check label_mapping.json to be sure.
with open("label_mapping.json", "r") as f:
    mapping_data = json.load(f)
    label_map = mapping_data["EMOTION_LABEL2ID"]

# Ensure Anger/Hostility is mapped
if "Anger/Hostility" not in label_map:
    label_map["Anger/Hostility"] = max(label_map.values()) + 1

data = []

def add_samples(sentences, label_name, multiplier=1):
    label_idx = label_map[label_name]
    for _ in range(multiplier):
        for s in sentences:
            data.append({"text": s, "label": label_idx})

test_cases = [
    # 2. Negative Sentiment — Different Emotions
    # Negative + Anger
    ("I can't believe they ignored my concerns after I explained everything.", "Anger/Hostility"),
    ("I'm furious that they blamed me for something I didn't do.", "Anger/Hostility"),
    ("It honestly makes me angry when people take advantage of someone's kindness.", "Anger/Hostility"),
    ("I've had enough of being treated like my opinion doesn't matter.", "Anger/Hostility"),
    ("The way they handled the situation was completely unacceptable.", "Anger/Hostility"),
    
    # Negative + Sadness
    ("I still feel empty whenever I think about the person we lost.", "Depressed/Sad"),
    ("It hurts knowing that things will never be the same again.", "Depressed/Sad"),
    ("I miss the days when everything felt simple.", "Depressed/Sad"),
    ("Watching them leave without saying goodbye broke my heart.", "Depressed/Sad"),
    ("I tried to stay strong, but the situation really got to me.", "Depressed/Sad"),
    
    # Negative + Fear
    ("I'm genuinely scared of what might happen if this continues.", "Anxious/Stress"),
    ("The thought of losing everything I've worked for terrifies me.", "Anxious/Stress"),
    ("I couldn't sleep because I kept thinking something would go wrong.", "Anxious/Stress"),
    ("Walking into that room alone made me extremely nervous.", "Anxious/Stress"),
    ("I'm worried that one mistake could ruin everything.", "Anxious/Stress"),
    
    # Negative + Anxiety/Stress
    ("I've been overthinking this decision all night.", "Anxious/Stress"),
    ("The uncertainty is making it difficult for me to concentrate.", "Anxious/Stress"),
    ("I feel completely overwhelmed by everything happening at once.", "Anxious/Stress"),
    ("I'm under so much pressure that I don't know what to do anymore.", "Anxious/Stress"),
    ("Waiting for the results has been incredibly stressful.", "Anxious/Stress"),

    # 3. Neutral Sentiment — Emotional States
    ("I was nervous before the interview, but I answered every question.", "Neutral"),
    ("I felt sad when she left, and then I went back to work.", "Neutral"),
    ("I was surprised to see him at the meeting.", "Neutral"),
    ("I felt anxious while waiting for the doctor to arrive.", "Neutral"),
    ("He became angry during the discussion and left the room.", "Neutral"),
    ("I was excited about the event, so I arrived early.", "Neutral"),
    ("She was disappointed by the result but accepted the decision.", "Neutral"),
    ("I felt nervous, but the presentation started exactly on time.", "Neutral"),

    # 4. Neutral Statements With Almost No Emotion
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

    # 5. Mixed Emotions — Positive + Negative 
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

    # 6. Negative Sentiment + Positive Emotion
    ("I lost the competition, but I'm proud of how far I made it.", "Happy/Positive"),
    ("The project failed, but I'm grateful for everything I learned.", "Happy/Positive"),
    ("I didn't get the job, but I'm excited to keep improving.", "Happy/Positive"),
    ("We missed our target, but I'm proud of the team's effort.", "Happy/Positive"),
    ("The trip was exhausting, but I loved every moment of it.", "Happy/Positive"),
    ("I had a terrible day, but one person's kindness made it better.", "Happy/Positive"),
    ("I was disappointed with the result, but I appreciate everyone's support.", "Happy/Positive"),

    # 7. Positive Sentiment + Negative Emotion 
    ("I'm excited about the new job even though I'm nervous about the responsibility.", "Happy/Positive"),
    ("I'm grateful for the opportunity, although I'm scared of failing.", "Happy/Positive"),
    ("I'm proud of what I achieved despite feeling exhausted.", "Happy/Positive"),
    ("I'm looking forward to tomorrow, even though today has been stressful.", "Happy/Positive"),
    ("I'm excited to meet everyone, but honestly, I'm a little anxious.", "Happy/Positive"),
    ("I'm glad I accepted the challenge, even though it terrified me at first.", "Happy/Positive"),

    # 9. Sarcasm — Positive Words, Negative Meaning 
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

    # 10. Sarcasm — Negative Words, Potentially Positive Meaning
    ("Yeah, that was absolutely terrible—I had the best time.", "Happy/Positive"),
    ("I really hate how much I enjoyed that concert.", "Happy/Positive"),
    ("What an awful vacation, I definitely don't want to go back.", "Happy/Positive"),
    ("That movie was painfully good.", "Happy/Positive"),
    ("I'm devastated that I have to spend another week here.", "Happy/Positive"),
    ("I suppose winning the competition wasn't completely horrible.", "Happy/Positive"),
    ("Being surrounded by supportive friends is such a terrible experience.", "Happy/Positive"),
    ("I can't stand how beautiful this place is.", "Happy/Positive")
]

# Add old anchor sentences to prevent forgetting
pride_sentences = [
    "I conquered my demons and finally feel at peace.",
    "I destroyed that exam, feeling so good about it.",
    "I survived the hardest day of my life, but I am proud.",
    "I finally completed something I once thought was impossible.",
    "Watching the team achieve something we worked months for was exhilarating.",
    "I killed that interview, I am so excited for the future.",
    "We defeated the opposing team and won the championship!",
    "I crushed my goals this week.",
    "I beat the impossible odds and made it to the top.",
    "My hard work finally paid off, I'm thrilled.",
]

gratitude_sentences = [
    "Thank you for fixing this terrible bug.",
    "I was dying of stress but it's finally over, thank god.",
    "I'm genuinely grateful for everyone who supported me through this difficult time.",
    "I'll always appreciate the people who stood beside me when things were awful.",
    "I'm thankful that someone took the time to help me understand the problem.",
    "Her kindness reminded me that there are still good people around.",
    "I really appreciate everything you've done for me to stop this disaster.",
    "Thanks for saving me from that miserable situation.",
    "I appreciate you resolving this terrible issue.",
    "Grateful that this horrible nightmare is finally resolved."
]

neutral_anchor = [
    "I am going to the store to buy groceries.",
    "The weather is cloudy today.",
    "Our team handled the challenge.",
    "The report is due next week.",
    "I need to read this manual before using the device.",
    "The car requires maintenance every 6 months."
]

anxious_anchor = [
    "The energy in the room before the competition was incredibly tense and scary.",
    "I'm panicking about this exam.",
    "I feel overwhelmed by all this hard work.",
    "I don't know how I'll manage these terrible bugs.",
    "My chest is tight and I can't concentrate on anything."
]

depressed_anchor = [
    "I finally gave up on something I thought was possible.",
    "I'm giving up because things became too difficult.",
    "No one appreciates the hard work I put in, I feel miserable.",
    "I'll always hate the people who abandoned me when things were difficult.",
    "It is impossible to fix this, I have lost all hope.",
    "I am tired of this painful existence."
]

# Load edge cases (multiplying by 10 to give them high weight so the model learns them permanently)
for text, label in test_cases:
    add_samples([text], label, multiplier=10)

# Add anchor examples (multiplying by 5)
add_samples(pride_sentences, "Happy/Positive", 5)
add_samples(gratitude_sentences, "Happy/Positive", 5)
add_samples(neutral_anchor, "Neutral", 5)
add_samples(anxious_anchor, "Anxious/Stress", 5)
add_samples(depressed_anchor, "Depressed/Sad", 5)

# Shuffle
random.seed(42)
random.shuffle(data)

df = pd.DataFrame(data)
df.to_csv("finetune_dataset.csv", index=False)
print(f"Generated finetune_dataset.csv with {len(df)} samples.")
