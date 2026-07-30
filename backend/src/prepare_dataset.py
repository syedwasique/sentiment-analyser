import argparse
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.data_preprocessing import (
    load_and_prepare_labeled_dataset,
    stratified_train_val_test_split,
    truncate_text,
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/raw/mental_training_data.csv")
    parser.add_argument("--outdir", default="data/processed")
    parser.add_argument("--train_frac", type=float, default=0.8)
    parser.add_argument("--val_frac", type=float, default=0.1)
    parser.add_argument("--max_words", type=int, default=None,
                         help="If set, truncate cleaned_text to this many words "
                              "to better match short social-media-post length.")
    parser.add_argument("--min_words", type=int, default=3)
    args = parser.parse_args()

    print(f"Loading + cleaning: {args.input}")
    df = load_and_prepare_labeled_dataset(args.input, min_words=args.min_words)
    print(f"Rows after cleaning/dedup/filtering: {len(df)}")

    if args.max_words:
        print(f"Truncating cleaned_text to first {args.max_words} words...")
        df['cleaned_text'] = df['cleaned_text'].apply(lambda t: truncate_text(t, args.max_words))
        # Re-drop anything that became too short after truncation (shouldn't happen much, but safe)
        df = df[df['cleaned_text'].str.split().str.len() >= args.min_words].reset_index(drop=True)
        print(f"Rows after truncation filter: {len(df)}")

    print("\nemotion_label distribution:\n", df['emotion_label'].value_counts())

    train_df, val_df, test_df = stratified_train_val_test_split(df, train_frac=args.train_frac, val_frac=args.val_frac)

    os.makedirs(args.outdir, exist_ok=True)
    keep_cols = ['cleaned_text', 'emotion_label', 'emotion_label_id', 'sentiment', 'sentiment_label_id']
    train_df[keep_cols].to_csv(os.path.join(args.outdir, "train.csv"), index=False)
    val_df[keep_cols].to_csv(os.path.join(args.outdir, "val.csv"), index=False)
    test_df[keep_cols].to_csv(os.path.join(args.outdir, "test.csv"), index=False)

    print(f"\nSplit sizes -> train: {len(train_df)}, val: {len(val_df)}, test: {len(test_df)}")
    print(f"Saved to {args.outdir}/")


if __name__ == "__main__":
    main()