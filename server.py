"""
MindCheck Bot - Localhost Web Application Backend Runner
=========================================================
"""

import sys
import webbrowser
import threading
from pathlib import Path
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

root_dir = Path(__file__).resolve().parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from api.index import app

# Mount static files and index html for local development
public_dir = root_dir / "public"
static_dir = root_dir / "static"

if public_dir.exists():
    if (public_dir / "static").exists():
        app.mount("/static", StaticFiles(directory=str(public_dir / "static")), name="static")
elif static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/", response_class=HTMLResponse)
async def read_root_local():
    for p in [public_dir / "index.html", root_dir / "templates" / "index.html", root_dir / "index.html"]:
        if p.exists():
            return HTMLResponse(content=p.read_text(encoding="utf-8"))
    return HTMLResponse("<h1>MindCheck Bot Live</h1>")

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
