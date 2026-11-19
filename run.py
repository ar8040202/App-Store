"""تشغيل خادم المتجر.

    python run.py

المنفذ الافتراضي 8050 ويمكن تغييره من settings.py أو من متغير البيئة PORT:
    $env:PORT="8051"
    python run.py

لتجربة المتجر من موبايل على نفس الشبكة (PowerShell):
    $env:HOST="0.0.0.0"
    python run.py
ثم افتح http://<IP-الكمبيوتر>:8050 من الموبايل.

أو استخدم start.bat / start-mobile.bat من غير أوامر.
"""
import os

import uvicorn
from settings import HOST, PORT

if __name__ == "__main__":
    reload_enabled = os.getenv("RELOAD", "0") == "1"
    local_host = "127.0.0.1" if HOST == "0.0.0.0" else HOST
    print(f"\n  متجر أصيل شغال على: http://{local_host}:{PORT}\n")
    uvicorn.run("main:app", host=HOST, port=PORT, reload=reload_enabled)
