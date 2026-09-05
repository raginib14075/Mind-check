"""
MindCheck Bot - Localhost Web Application Backend Runner
=========================================================
"""

import sys
import webbrowser
import threading
from pathlib import Path
import uvicorn

# Ensure root directory is on sys.path so api module imports cleanly
root_dir = Path(__file__).resolve().parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from api.index import app

def open_browser():
    import time
    time.sleep(1.0)
    webbrowser.open("http://127.0.0.1:8000")

if __name__ == "__main__":
    print("\n" + "=" * 65)
    print(" Starting MindCheck Bot Web App at http://127.0.0.1:8000 ")
    print(" Opening browser automatically...")
    print(" Press Ctrl+C in this window to stop the server.")
    print("=" * 65 + "\n")
    
    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run(app, host="127.0.0.1", port=8000)
