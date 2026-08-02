from flask import Blueprint, request, jsonify, send_file

bp = Blueprint('analyze', __name__, url_prefix='/analyze')

# Lazy import — inference.py imports torch at the top level, which may not
# be installed yet. We defer the import to request-time so Flask can still
# start and serve the frontend even when PyTorch is missing.
def _get_predict():
    try:
        from src.inference import predict
        return predict
    except ImportError as e:
        return None
    except Exception as e:
        return None


def _score_to_level(score: float) -> str:
    """Converts a 0-1 composite score into a Low/Medium/High label for the UI."""
    if score >= 0.60:
        return "High"
    elif score >= 0.30:
        return "Medium"
    return "Low"


def _emotion_to_sentiment(label: str, hap_score: float = 0.0) -> str:
    """Coarse sentiment bucket derived from the psychological-state prediction."""
    if label == "Happy/Positive" or hap_score >= 0.45:
        return "Positive"
    if label == "Neutral":
        return "Neutral"
    return "Negative"  # Anxious/Stress or Depressed/Sad


def _compute_depression_score(scores: dict, lex: dict, flags: dict) -> float:
    """Multi-signal independent depression score (0-1).
    Combines: model class probability + NRC sadness/negative lexicon + keyword flags.
    """
    model_signal   = scores.get("Depressed/Sad", 0.0) * 0.40
    nrc_signal     = (lex.get("sadness", 0.0) * 0.6 + lex.get("negative", 0.0) * 0.2) * 0.25
    keyword_signal = 0.0
    if flags.get("has_ru_dep"):
        keyword_signal += 0.35
    if flags.get("has_negation_of_positive"):
        keyword_signal += 0.20
    if scores.get("Depressed/Sad", 0.0) > 0.35:
        keyword_signal += 0.15
    return min(0.95, model_signal + nrc_signal + keyword_signal)


def _compute_anxiety_score(scores: dict, lex: dict, flags: dict) -> float:
    """Multi-signal independent anxiety score (0-1).
    Combines: model class probability + NRC fear/anticipation + keyword flags.
    """
    model_signal   = scores.get("Anxious/Stress", 0.0) * 0.30
    nrc_signal     = (lex.get("fear", 0.0) * 0.9 + lex.get("anticipation", 0.0) * 0.3) * 0.30
    keyword_signal = 0.0
    if flags.get("has_explicit_anxiety"):
        keyword_signal += 0.45
    if flags.get("has_ru_anx"):
        keyword_signal += 0.25
    if flags.get("has_distress_term"):
        keyword_signal += 0.15
    return min(0.95, model_signal + nrc_signal + keyword_signal)


def _compute_stress_score(scores: dict, lex: dict, flags: dict) -> float:
    """Multi-signal independent stress/burnout score (0-1).
    Combines: model class probability + NRC negative + burnout keyword flags.
    """
    model_signal   = scores.get("Anxious/Stress", 0.0) * 0.30
    nrc_signal     = (lex.get("negative", 0.0) * 0.3 + lex.get("anger", 0.0) * 0.15) * 0.20
    keyword_signal = 0.0
    if flags.get("has_burnout_term"):
        keyword_signal += 0.60
    if flags.get("has_ru_anx"):
        keyword_signal += 0.20
    if flags.get("has_distress_term"):
        keyword_signal += 0.12
    return min(0.95, model_signal + nrc_signal + keyword_signal)


def _compute_anger_score(anger_score: float, lex: dict, flags: dict) -> float:
    """Multi-signal independent anger/hostility score (0-1)."""
    keyword_signal = anger_score * 0.60
    nrc_signal     = lex.get("anger", 0.0) * 0.40
    if flags.get("has_anger_term"):
        keyword_signal = max(keyword_signal, 0.55)
    return min(1.0, keyword_signal + nrc_signal)


def _compute_happiness_score(scores: dict, lex: dict, flags: dict, text: str = "") -> float:
    """Multi-signal independent happiness/positivity score (0-1)."""
    import re
    from textblob import TextBlob

    # If the text explicitly negates a positive term (e.g. "not happy", "no joy", "never good"), happiness is 0
    has_negation_of_pos = flags.get("has_negation_of_positive", False) or bool(re.search(
        r'\b(not|never|n\'t|dont|don\'t|no|cant|cannot|isnt|isn\'t|wasnt|wasn\'t|aren\'t|arent)\s+(very\s+)?(happy|good|fine|okay|great|joy|pleased|cheerful|excited|well|peaceful|content|satisfied)\b',
        text, re.IGNORECASE
    ))

    if has_negation_of_pos:
        return 0.0

    tb_pol = TextBlob(text).sentiment.polarity if text else 0.0
    pos_words = bool(re.search(r'\b(achieved|proud|talented|goal|fitness|milestone|consistency|excited|amazing|happy|great|wonderful|joy|love|success|successful|awesome|good|best|fantastic|win|winning|congrats|cheerful|difference)\b', text, re.IGNORECASE))

    model_signal   = scores.get("Happy/Positive", 0.0) * 0.50
    nrc_signal     = (lex.get("joy", 0.0) * 0.7 + lex.get("positive", 0.0) * 0.5) * 0.35
    polarity_signal = max(0.0, tb_pol) * 0.60 if tb_pol > 0 else 0.0
    keyword_signal = 0.45 if pos_words else 0.0

    return min(1.0, model_signal + nrc_signal + polarity_signal + keyword_signal)


@bp.route('', methods=['POST', 'OPTIONS'])
def analyze_text():
    """Endpoint for hybrid text sentiment & psychological analysis."""
    if request.method == 'OPTIONS':
        return '', 204
    import re
    data = request.get_json() or {}
    text = data.get('text', '')
    if not text:
        return jsonify({"error": "No text provided"}), 400

    predict = _get_predict()
    if predict is None:
        return jsonify({
            "error": "ML model not available. Please ensure PyTorch and Transformers are installed, then restart the server."
        }), 503

    result = predict(text)
    if "error" in result:
        return jsonify(result), 400

    scores         = result["all_scores"]
    predicted_label = result["predicted_label"]
    confidence     = result["confidence"]
    lex            = result.get("lexicon_scores", {})
    flags          = result.get("keyword_flags", {})
    raw_anger      = result.get("anger_score", 0.0)

    # Each dimension is scored independently from multiple signals
    dep_score = _compute_depression_score(scores, lex, flags)
    anx_score = _compute_anxiety_score(scores, lex, flags)
    str_score = _compute_stress_score(scores, lex, flags)
    ang_score = _compute_anger_score(raw_anger, lex, flags)
    hap_score = _compute_happiness_score(scores, lex, flags, text)

    psychological_states = {
        "depression": _score_to_level(dep_score),
        "anxiety":    _score_to_level(anx_score),
        "stress":     _score_to_level(str_score),
        "anger":      _score_to_level(ang_score),
        "happiness":  _score_to_level(hap_score),
    }

    has_negation_of_pos = flags.get("has_negation_of_positive", False) or bool(re.search(
        r'\b(not|never|n\'t|dont|don\'t|no|cant|cannot|isnt|isn\'t|wasnt|wasn\'t|aren\'t|arent)\s+(very\s+)?(happy|good|fine|okay|great|joy|pleased|cheerful|excited|well|peaceful|content|satisfied)\b',
        text, re.IGNORECASE
    ))

    # A post is ONLY positive if model/happiness score says so, AND it is NOT sarcastic, NOT negated, AND NOT predicted as depressed/anxious
    is_positive_post = (
        (predicted_label == "Happy/Positive" or hap_score >= 0.30)
        and not result.get("is_sarcastic", False)
        and not has_negation_of_pos
        and predicted_label not in ("Depressed/Sad", "Anxious/Stress")
    )

    if is_positive_post:
        risk_level = "None"
        flagged = False
    else:
        max_dim_score = max(dep_score, anx_score, str_score, ang_score)
        is_concerning = predicted_label in ("Anxious/Stress", "Depressed/Sad") or max_dim_score >= 0.50
        flagged = is_concerning and (confidence >= 0.5 or max_dim_score >= 0.5)

        if not is_concerning:
            risk_level = "None"
        elif confidence >= 0.75 or max_dim_score >= 0.70:
            risk_level = "High"
        elif confidence >= 0.5 or max_dim_score >= 0.45:
            risk_level = "Medium"
        else:
            risk_level = "Low"

    response_data = {
        "text": text,
        "sentiment": _emotion_to_sentiment(predicted_label, hap_score),
        "sentiment_score": max(confidence, hap_score) if is_positive_post else confidence,
        "predicted_label": "Happy/Positive" if is_positive_post else predicted_label,
        "all_scores": scores,
        "psychological_states": psychological_states,
        "flagged": flagged,
        "risk_level": risk_level,
        "is_sarcastic": result.get("is_sarcastic", False),
        "keyword_flags": flags,
    }
    return jsonify(response_data)


@bp.route('/pdf', methods=['POST', 'OPTIONS'])
def generate_pdf_endpoint():
    """Generates a downloadable PDF report for a given text or result payload."""
    if request.method == 'OPTIONS':
        return '', 204
    data = request.get_json() or {}
    
    # If full analysis result isn't passed, analyze the text first
    if "psychological_states" not in data or "all_scores" not in data:
        text = data.get("text", "")
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        predict = _get_predict()
        if predict is None:
            return jsonify({"error": "ML model not available"}), 503
        
        result = predict(text)
        if "error" in result:
            return jsonify(result), 400

        scores = result["all_scores"]
        predicted_label = result["predicted_label"]
        confidence = result["confidence"]
        lex = result.get("lexicon_scores", {})
        flags = result.get("keyword_flags", {})
        raw_anger = result.get("anger_score", 0.0)

        dep_score = _compute_depression_score(scores, lex, flags)
        anx_score = _compute_anxiety_score(scores, lex, flags)
        str_score = _compute_stress_score(scores, lex, flags)
        ang_score = _compute_anger_score(raw_anger, lex, flags)
        hap_score = _compute_happiness_score(scores, lex, flags, text)

        psychological_states = {
            "depression": _score_to_level(dep_score),
            "anxiety":    _score_to_level(anx_score),
            "stress":     _score_to_level(str_score),
            "anger":      _score_to_level(ang_score),
            "happiness":  _score_to_level(hap_score),
        }

        has_negation_of_pos = flags.get("has_negation_of_positive", False)
        is_positive_post = (
            (predicted_label == "Happy/Positive" or hap_score >= 0.30)
            and not result.get("is_sarcastic", False)
            and not has_negation_of_pos
            and predicted_label not in ("Depressed/Sad", "Anxious/Stress")
        )

        if is_positive_post:
            risk_level = "None"
            flagged = False
        else:
            max_dim_score = max(dep_score, anx_score, str_score, ang_score)
            is_concerning = predicted_label in ("Anxious/Stress", "Depressed/Sad") or max_dim_score >= 0.50
            flagged = is_concerning and (confidence >= 0.5 or max_dim_score >= 0.5)

            if not is_concerning:
                risk_level = "None"
            elif confidence >= 0.75 or max_dim_score >= 0.70:
                risk_level = "High"
            elif confidence >= 0.5 or max_dim_score >= 0.45:
                risk_level = "Medium"
            else:
                risk_level = "Low"

        analysis_payload = {
            "text": text,
            "sentiment": _emotion_to_sentiment(predicted_label, hap_score),
            "sentiment_score": max(confidence, hap_score) if is_positive_post else confidence,
            "predicted_label": "Happy/Positive" if is_positive_post else predicted_label,
            "all_scores": scores,
            "psychological_states": psychological_states,
            "flagged": flagged,
            "risk_level": risk_level,
            "is_sarcastic": result.get("is_sarcastic", False),
        }
    else:
        analysis_payload = data

    from src.pdf_generator import generate_pdf_report
    pdf_buffer = generate_pdf_report(analysis_payload)
    pdf_buffer.seek(0)

    from flask import make_response
    pdf_data = pdf_buffer.read()
    response = make_response(pdf_data)
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = 'inline; filename="MindPulse_Analysis_Report.pdf"'
    response.headers['Content-Length'] = str(len(pdf_data))
    response.headers['Cache-Control'] = 'no-store'
    return response
