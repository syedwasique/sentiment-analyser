import html
import io
import zlib
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT



def generate_pdf_report(data: dict) -> io.BytesIO:
    """
    Generates a professional, detailed PDF report summarizing the Sentiment and 
    Psychological Analysis results. Returns an in-memory BytesIO buffer containing the PDF.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom Palette
    COLOR_PRIMARY = colors.HexColor("#0F172A")    # Dark slate
    COLOR_BRAND = colors.HexColor("#4F46E5")      # Indigo primary
    COLOR_MUTED = colors.HexColor("#64748B")      # Muted gray text
    COLOR_CARD_BG = colors.HexColor("#F8FAFC")    # Very light gray background
    COLOR_BORDER = colors.HexColor("#E2E8F0")     # Light border

    # Risk Palette
    RISK_COLORS = {
        "High": (colors.HexColor("#DC2626"), colors.HexColor("#FEF2F2")),
        "Medium": (colors.HexColor("#D97706"), colors.HexColor("#FFFBEB")),
        "Low": (colors.HexColor("#2563EB"), colors.HexColor("#EFF6FF")),
        "None": (colors.HexColor("#16A34A"), colors.HexColor("#F0FDF4")),
    }

    # Custom Styles
    style_subtitle = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=13,
        textColor=COLOR_MUTED,
        spaceAfter=12
    )
    style_section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=COLOR_BRAND,
        spaceBefore=10,
        spaceAfter=6
    )
    style_body = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155")
    )
    style_bold_label = ParagraphStyle(
        'BoldLabel',
        parent=style_body,
        fontName='Helvetica-Bold',
        textColor=COLOR_PRIMARY
    )
    style_text_box = ParagraphStyle(
        'TextBox',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1E293B")
    )

    story = []

    # Extract Data Fields
    raw_text = data.get("text", "N/A")
    input_text = html.escape(str(raw_text))
    sentiment = html.escape(str(data.get("sentiment", "Neutral")))
    sentiment_score = data.get("sentiment_score", 0.0)
    predicted_label = html.escape(str(data.get("predicted_label", "Neutral")))
    risk_level = data.get("risk_level", "None")
    is_sarcastic = data.get("is_sarcastic", False)
    flagged = data.get("flagged", False)
    psych = data.get("psychological_states", {})
    all_scores = data.get("all_scores", {})

    # Timestamp & Metadata
    now_str = datetime.now().strftime("%B %d, %Y - %H:%M:%S UTC")
    report_ref = f"MP-{zlib.crc32(str(raw_text).encode('utf-8')) & 0xFFFFFF:06X}"

    # 1. Header Title Banner
    header_table_data = [
        [
            Paragraph("MINDPULSE AI", ParagraphStyle('Logo', fontName='Helvetica-Bold', fontSize=18, textColor=COLOR_BRAND)),
            Paragraph(f"<b>Generated:</b> {now_str}<br/><b>Report Ref:</b> {report_ref}", ParagraphStyle('Meta', fontName='Helvetica', fontSize=8.5, leading=11, textColor=COLOR_MUTED, alignment=TA_RIGHT))
        ]
    ]
    t_header = Table(header_table_data, colWidths=[270, 270])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 4))
    story.append(Paragraph("Comprehensive Sentiment & Psychological Assessment Report", style_subtitle))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BRAND, spaceBefore=2, spaceAfter=8))

    # 2. Analyzed Content Section
    story.append(Paragraph("1. Analyzed User Input", style_section_heading))
    quoted_text = f'"{input_text}"'
    input_table_data = [[Paragraph(quoted_text, style_text_box)]]
    t_input = Table(input_table_data, colWidths=[540])
    t_input.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), COLOR_CARD_BG),
        ('BOX', (0,0), (-1,-1), 0.5, COLOR_BORDER),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_input)
    story.append(Spacer(1, 8))

    # 3. Executive Summary
    story.append(Paragraph("2. Executive Summary & Core Classification", style_section_heading))
    
    text_color, bg_color = RISK_COLORS.get(risk_level, (COLOR_PRIMARY, COLOR_CARD_BG))
    risk_badge = f'<font color="{text_color.hexval()}"><b>{risk_level.upper()} RISK</b></font>'
    sarcasm_str = "YES (Irony Detected)" if is_sarcastic else "NO (Literal Interpretation)"
    flagged_str = "FLAGGED FOR REVIEW" if flagged else "NORMAL RANGE"

    summary_data = [
        [
            Paragraph("Overall Sentiment", style_bold_label),
            Paragraph(f"<b>{sentiment}</b>", style_body),
            Paragraph("Risk Level", style_bold_label),
            Paragraph(risk_badge, style_body),
        ],
        [
            Paragraph("Primary Model Class", style_bold_label),
            Paragraph(predicted_label, style_body),
            Paragraph("Flagged Status", style_bold_label),
            Paragraph(flagged_str, style_body),
        ],
        [
            Paragraph("Confidence Score", style_bold_label),
            Paragraph(f"{sentiment_score * 100:.1f}%", style_body),
            Paragraph("Sarcasm Detected", style_bold_label),
            Paragraph(sarcasm_str, style_body),
        ]
    ]

    t_summary = Table(summary_data, colWidths=[120, 150, 120, 150])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), COLOR_CARD_BG),
        ('BOX', (0,0), (-1,-1), 0.5, COLOR_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, COLOR_BORDER),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 8))

    # 4. Detailed Psychological State Breakdown
    story.append(Paragraph("3. Psychological Dimension Analysis & Explanations", style_section_heading))

    psych_explanations = {
        "depression": {
            "title": "Depression & Mood Deficit",
            "High": "Severe low mood, hopelessness, or loss of interest detected. Heavy emotional weighting and persistent sadness markers.",
            "Medium": "Moderate depressive indicators. Expresses feelings of fatigue, worthlessness, or mild emotional apathy.",
            "Low": "Minimal to no depressive linguistic markers detected. Mood remains generally stable or neutral.",
        },
        "anxiety": {
            "title": "Anxiety & Panic Indicators",
            "High": "High anxiety signals detected (e.g. dread, racing thoughts, panic expressions, physical tension).",
            "Medium": "Moderate anxiety present. User expresses noticeable worry, apprehension, or uncertainty about outcomes.",
            "Low": "Low anxiety presence. Text reflects calm or manageable baseline stress levels.",
        },
        "stress": {
            "title": "Stress & Burnout Level",
            "High": "Critical stress/burnout markers. Mentions being overwhelmed, exhausted, or unable to cope with current load.",
            "Medium": "Elevated stress detected. User reports managing significant pressure or workload demands.",
            "Low": "Optimal or low stress. Indicates comfortable coping capacity and low tension.",
        },
        "anger": {
            "title": "Anger & Hostility Signal",
            "High": "Strong aggressive or hostile language. Mentions intense frustration, agitation, or outrage.",
            "Medium": "Mild to moderate annoyance expressed. Presence of critical or irritated phrasing.",
            "Low": "No hostility or anger detected. Content remains cooperative or emotionally calm.",
        },
        "happiness": {
            "title": "Positivity & Emotional Wellness",
            "High": "Strong positive emotional state. Expresses joy, gratitude, pride, achievement, or contentment.",
            "Medium": "Mild positivity or pleasant sentiment detected.",
            "Low": "Low expression of joy or satisfaction in the input text.",
        }
    }

    psych_rows = [
        [
            Paragraph("Dimension", ParagraphStyle('TH1', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
            Paragraph("Level", ParagraphStyle('TH2', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
            Paragraph("Detailed Clinical & Psychological Explanation", ParagraphStyle('TH3', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.white)),
        ]
    ]

    for key, info in psych_explanations.items():
        level = psych.get(key, "Low")
        explanation = info.get(level, info["Low"])
        
        lvl_color, _ = RISK_COLORS.get(level, (COLOR_PRIMARY, COLOR_CARD_BG))
        lvl_html = f'<font color="{lvl_color.hexval()}"><b>{level.upper()}</b></font>'

        psych_rows.append([
            Paragraph(f"<b>{info['title']}</b>", style_body),
            Paragraph(lvl_html, style_body),
            Paragraph(explanation, style_body),
        ])

    t_psych = Table(psych_rows, colWidths=[130, 75, 335])
    t_psych.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_BRAND),
        ('BOX', (0,0), (-1,-1), 0.5, COLOR_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, COLOR_BORDER),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, COLOR_CARD_BG]),
    ]))
    story.append(t_psych)
    story.append(Spacer(1, 8))

    # 5. Diagnostic Model Probabilities
    story.append(Paragraph("4. Model Class Probabilities Distribution", style_section_heading))
    
    prob_rows = [
        [
            Paragraph("Classification Class", ParagraphStyle('TH1', fontName='Helvetica-Bold', fontSize=8.5, textColor=COLOR_PRIMARY)),
            Paragraph("Probability Score", ParagraphStyle('TH2', fontName='Helvetica-Bold', fontSize=8.5, textColor=COLOR_PRIMARY)),
            Paragraph("Confidence Bar Relative Score", ParagraphStyle('TH3', fontName='Helvetica-Bold', fontSize=8.5, textColor=COLOR_PRIMARY)),
        ]
    ]

    for cls_name, score in all_scores.items():
        pct = score * 100
        bar_len = int(pct / 5)
        bar_str = "■" * bar_len + "□" * (20 - bar_len)
        prob_rows.append([
            Paragraph(html.escape(str(cls_name)), style_body),
            Paragraph(f"<b>{pct:.2f}%</b>", style_body),
            Paragraph(f'<font fontName="Courier" size="8" color="{COLOR_BRAND.hexval()}">{bar_str}</font>', style_body)
        ])

    t_prob = Table(prob_rows, colWidths=[160, 110, 270])
    t_prob.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), COLOR_CARD_BG),
        ('BOX', (0,0), (-1,-1), 0.5, COLOR_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, COLOR_BORDER),
        ('PADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_prob)
    story.append(Spacer(1, 8))

    # 6. Recommendations & Action Plan
    story.append(Paragraph("5. Insights & Actionable Guidance", style_section_heading))

    if risk_level == "High":
        rec_text = (
            "<b>High Risk Alert:</b> The text exhibits significant distress, high anxiety, severe burnout, or depressive indicators.<br/>"
            "• <b>Immediate Recommendation:</b> Consider reaching out to a certified psychological counsellor, mental health professional, or crisis hotline.<br/>"
            "• <b>Action Steps:</b> Step back from high-stress environments, practice grounding exercises (5-4-3-2-1 technique), and notify a trusted support network."
        )
        rec_box_color = colors.HexColor("#FEF2F2")
        rec_border = colors.HexColor("#EF4444")
    elif risk_level == "Medium":
        rec_text = (
            "<b>Moderate Risk Notice:</b> Noticeable stress, anxiety, or emotional tension present in the text.<br/>"
            "• <b>Recommendation:</b> Engage in structured self-care, workload delegation, and relaxation techniques.<br/>"
            "• <b>Action Steps:</b> Take regular breaks, practice deep breathing exercises, and balance work-rest cycles to prevent burnout escalation."
        )
        rec_box_color = colors.HexColor("#FFFBEB")
        rec_border = colors.HexColor("#F59E0B")
    else:
        rec_text = (
            "<b>Positive / Healthy Profile:</b> The input text exhibits balanced, low-risk, or positive emotional health.<br/>"
            "• <b>Recommendation:</b> Maintain positive mental hygiene, ongoing social connection, and healthy physical routines.<br/>"
            "• <b>Action Steps:</b> Continue engaging in fulfilling activities, personal goals, and supportive relationships."
        )
        rec_box_color = colors.HexColor("#F0FDF4")
        rec_border = colors.HexColor("#10B981")

    t_rec = Table([[Paragraph(rec_text, style_body)]], colWidths=[540])
    t_rec.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), rec_box_color),
        ('BOX', (0,0), (-1,-1), 1, rec_border),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_rec)

    # Footer Note
    story.append(Spacer(1, 10))
    footer_text = "<i>Disclaimer: MindPulse AI provides automated linguistic and sentiment analysis for informational purposes. This report is not a formal diagnostic medical document.</i>"
    story.append(Paragraph(footer_text, ParagraphStyle('Footer', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=7.5, leading=10, textColor=COLOR_MUTED, alignment=TA_CENTER)))

    # Build Document
    doc.build(story)
    buffer.seek(0)
    return buffer
