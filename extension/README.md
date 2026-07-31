# MindPulse — Twitter/X Single-Post Analysis Chrome Extension (Manifest V3)

This Chrome Extension (Manifest V3) enables manual, single-post sentiment & psychological indicator analysis on Twitter/X (`twitter.com` / `x.com`) by sending post text to the MindPulse Flask backend (`http://127.0.0.1:5000/analyze`).

---

## 🛠️ How to Load Unpacked in Developer Mode

1. Open **Google Chrome** and navigate to `chrome://extensions/`.
2. Turn on **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `extension/` directory from this project:
   `c:\Users\user\OneDrive\Desktop\sentiment\Fyp-sentiment-analyser\extension`
5. Open Twitter/X (`https://x.com` or `https://twitter.com`). Each tweet's action bar will now include a **"MindPulse AI"** button.

---

## 🔒 Privacy & Ethical Safeguards Implemented

1. **Manual Per-Post Trigger Only**:
   - The extension only runs when the user explicitly clicks the "Analyze" button on a specific post.
   - **No automatic scanning**, feed scraping, or background crawling.

2. **Text-Only Model Execution**:
   - Attached content images are captured strictly for context display in the popup and labeled *"Context Only — Text Analysis Executed"*.
   - Content images are **never** transmitted to the backend.

3. **Mandatory Non-Dismissible Disclaimer**:
   - Every result popup renders the persistent disclaimer:
     > *"This is an automated research tool for educational and awareness purposes only. It is not a clinical diagnosis and should not be used to make judgments about real people's mental health."*

4. **No Export, Copy, or Share Actions**:
   - Sharing and export triggers are intentionally omitted to prevent circulating inferential results about identifiable individuals.

5. **Client-Side Throttling**:
   - Rate limited to a maximum of 10 manual analyses per minute to discourage rapid bulk-style usage.

6. **Zero Persistent Storage**:
   - Post content, handles, and results are held transiently in session memory for popup display and are **never** stored in database logs or `chrome.storage.sync`.

7. **Tightly Scoped Permissions**:
   - Manifest V3 `host_permissions` are strictly restricted to `*://*.twitter.com/*` and `*://*.x.com/*`.
