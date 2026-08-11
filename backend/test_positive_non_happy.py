import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.inference import predict

sentences = [
    # Excitement
    "I can't wait to finally see the results of all our hard work.",
    "The energy in the room before the competition was incredible.",
    "I'm genuinely thrilled about starting this new project.",
    "Everything is finally coming together, and I feel incredibly motivated.",
    "The announcement gave me so much excitement for what comes next.",
    "I’m looking forward to the opportunities this new position will bring.",
    "Watching the team achieve something we worked months for was exhilarating.",
    # Pride
    "I'm proud of myself for not giving up when things became difficult.",
    "Seeing my younger brother graduate made me incredibly proud.",
    "I finally completed something I once thought was impossible.",
    "Our team handled the challenge better than I ever expected.",
    "I feel proud knowing that my effort actually made a difference.",
    # Gratitude
    "I'm genuinely grateful for everyone who supported me through this.",
    "I'll always appreciate the people who stood beside me when things were difficult.",
    "I'm thankful that someone took the time to help me understand the problem.",
    "Her kindness reminded me that there are still good people around.",
    "I really appreciate everything you've done for me."
]

for i, s in enumerate(sentences):
    res = predict(s)
    print(f"[{i+1}] {s}")
    print(f"Prediction: {res}")
    print("-" * 50)
