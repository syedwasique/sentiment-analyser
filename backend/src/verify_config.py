import os
import configparser

def verify_setup():
    print("==================================================")
    print("         MINDPULSE CONFIGURATION CHECKER          ")
    print("==================================================")
    
    # 1. Check config.ini
    config_path = "config/config.ini"
    if not os.path.exists(config_path):
        print("[-] config/config.ini is MISSING!")
        return
        
    config = configparser.ConfigParser()
    config.read(config_path)
    
    print("[+] config/config.ini detected.")
    
    # Reddit check
    reddit_ok = True
    for key in ['client_id', 'client_secret', 'user_agent']:
        val = config.get('reddit', key, fallback='')
        if not val or 'YOUR_REDDIT' in val:
            reddit_ok = False
            
    if reddit_ok:
        print("[✔] Reddit API Credentials configured.")
    else:
        print("[ ] Reddit API Credentials: Not configured (using placeholders).")
        
    # Twitter check
    twitter_ok = True
    val = config.get('twitter', 'bearer_token', fallback='')
    if not val or 'YOUR_TWITTER' in val:
        twitter_ok = False
        
    if twitter_ok:
        print("[✔] Twitter API Credentials configured.")
    else:
        print("[ ] Twitter API Credentials: Not configured (using placeholders).")
        
    # 2. Check Dataset files
    processed_dir = "data/processed"
    datasets = [f for f in os.listdir(processed_dir) if f.endswith('.csv')] if os.path.exists(processed_dir) else []
    if datasets:
        print(f"[✔] Labeled datasets found in {processed_dir}: {datasets}")
    else:
        print(f"[ ] Labeled datasets: None found in {processed_dir}. (Please place a mental health CSV dataset).")
        
    # 3. Check RAG Reference files
    rag_dir = "models/rag_knowledge_base"
    rag_files = [f for f in os.listdir(rag_dir) if f.endswith('.txt') or f.endswith('.pdf') or f.endswith('.json')] if os.path.exists(rag_dir) else []
    if rag_files:
        print(f"[✔] RAG Reference files found in {rag_dir}: {rag_files}")
    else:
        print(f"[ ] RAG Reference files: None found in {rag_dir}. (Please place screening guidelines text files).")
        
    print("==================================================")

if __name__ == '__main__':
    verify_setup()
