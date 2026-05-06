import json, os, sys, threading
import pyautogui
import pytesseract
import requests
import tkinter as tk
from tkinter import font as tkfont
from PIL import ImageEnhance

API_URL  = "https://inventario-sg.pages.dev/api/items"
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
TOOLTIP_OFFSET_X = -10
TOOLTIP_OFFSET_Y =  25
TOOLTIP_W        = 360
TOOLTIP_H        =  55

CONFIG_FILE = os.path.join(
    os.path.dirname(sys.executable if getattr(sys,'frozen',False) else __file__),
    "sc_ocr_config.json"
)

def load_cfg():
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE) as f: return json.load(f)
    except: pass
    return {}

def save_cfg(cfg):
    with open(CONFIG_FILE,"w") as f: json.dump(cfg,f)

def capture():
    x,y = pyautogui.position()
    img = pyautogui.screenshot(region=(max(0,x+TOOLTIP_OFFSET_X), max(0,y+TOOLTIP_OFFSET_Y), TOOLTIP_W, TOOLTIP_H))
    img = img.convert("L")
    img = ImageEnhance.Contrast(img).enhance(2.5)
    img = img.point(lambda p: 255 if p>100 else 0)
    return pytesseract.image_to_string(img, config="--psm 7 --oem 3").strip()

# ── Janela de configuração ────────────────────────────────────────────────────
def show_config(cfg, on_done):
    w = tk.Tk()
    w.title("SC OCR — Configuração")
    w.resizable(False, False)
    w.attributes("-topmost", True)
    tk.Label(w, text="SC Inventário OCR", font=("Segoe UI",13,"bold")).pack(pady=(16,2))
    tk.Label(w, text="inventario-sg.pages.dev", fg="gray", font=("Segoe UI",9)).pack()
    tk.Frame(w, height=10).pack()
    tk.Label(w, text="O teu username no site:").pack(padx=20, anchor="w")
    uv = tk.StringVar(value=cfg.get("username",""))
    tk.Entry(w, textvariable=uv, width=22).pack(padx=20, pady=4)
    sv = tk.StringVar()
    tk.Label(w, textvariable=sv, fg="gray").pack()
    def ok():
        u=uv.get().strip()
        if not u: sv.set("Introduz o teu username."); return
        cfg["username"]=u; save_cfg(cfg); w.destroy(); on_done(cfg)
    tk.Button(w, text="Guardar e iniciar", command=ok, width=18).pack(pady=12)
    w.mainloop()

# ── Janela de captura ─────────────────────────────────────────────────────────
def show_capture(username):
    root = tk.Tk()
    root.title("SC OCR")
    root.resizable(False, False)
    root.attributes("-topmost", True)
    root.configure(bg="#1a1a2e")

    lbl_user = tk.Label(root, text=f"User: {username}", bg="#1a1a2e", fg="#6b7280",
                        font=("Segoe UI",8))
    lbl_user.pack(padx=14, pady=(8,0), anchor="w")

    btn_cap = tk.Button(root, text="📷  Capturar Item", bg="#f59e0b", fg="#000",
                        font=("Segoe UI",10,"bold"), relief="flat", cursor="hand2",
                        padx=14, pady=8,
                        command=lambda: threading.Thread(target=do_capture, daemon=True).start())
    btn_cap.pack(padx=14, pady=(4,2), fill="x")

    lbl_status = tk.Label(root, text="Posiciona o rato no item e clica.", bg="#1a1a2e",
                          fg="#6b7280", font=("Segoe UI",8), wraplength=200)
    lbl_status.pack(padx=14, pady=(0,8))

    # ── Dialog de confirmação ────────────────────────────────────────────────
    def do_capture():
        lbl_status.config(text="A capturar...", fg="#f59e0b")
        btn_cap.config(state="disabled")
        try:
            texto = capture()
        except Exception as e:
            lbl_status.config(text=f"Erro OCR: {e}", fg="#f87171")
            btn_cap.config(state="normal")
            return
        lbl_status.config(text="", fg="#6b7280")
        btn_cap.config(state="normal")
        root.after(0, lambda: show_add_dialog(texto))

    def show_add_dialog(nome):
        d = tk.Toplevel(root)
        d.title("Adicionar Item")
        d.resizable(False, False)
        d.attributes("-topmost", True)
        d.configure(bg="#1a1a2e")
        pad = {"padx":14, "pady":3}
        def row(label, default="", w=28):
            tk.Label(d, text=label, bg="#1a1a2e", fg="#9ca3af",
                     font=("Segoe UI",8,"bold"), anchor="w").pack(fill="x", **pad)
            v = tk.StringVar(value=default)
            tk.Entry(d, textvariable=v, width=w, bg="#111827", fg="white",
                     insertbackground="white", relief="flat",
                     font=("Segoe UI",10)).pack(fill="x", padx=14, pady=(0,4))
            return v
        nv  = row("NOME DO ITEM", nome)
        qv  = row("QUANTIDADE", "1", 10)
        qlv = row("QUALIDADE", "", 10)
        lv  = row("LOCALIZAÇÃO", "", 28)
        sv  = tk.StringVar()
        tk.Label(d, textvariable=sv, bg="#1a1a2e", fg="#f87171",
                 font=("Segoe UI",8)).pack(padx=14)
        def guardar():
            name = nv.get().strip()
            if not name: sv.set("Nome obrigatório."); return
            payload = {"username": username, "name": name}
            try:
                if qv.get().strip():  payload["quantity"] = float(qv.get())
                if qlv.get().strip(): payload["quality"]  = float(qlv.get())
            except ValueError: sv.set("Quantidade/qualidade inválida."); return
            if lv.get().strip(): payload["location"] = lv.get().strip()
            try:
                r = requests.post(API_URL, json=payload, timeout=8)
                if r.ok:
                    sv.set(""); lbl_status.config(text=f"✓ '{name}' guardado!", fg="#22c55e")
                    d.after(600, d.destroy)
                else:
                    sv.set(f"Erro {r.status_code}")
            except Exception as e:
                sv.set(f"Sem ligação: {e}")
        bf = tk.Frame(d, bg="#1a1a2e")
        bf.pack(pady=10)
        tk.Button(bf, text="Guardar", command=guardar, bg="#22c55e", fg="#000",
                  font=("Segoe UI",9,"bold"), relief="flat", padx=12, pady=5,
                  cursor="hand2").pack(side="left", padx=6)
        tk.Button(bf, text="Cancelar", command=d.destroy, bg="#374151", fg="white",
                  font=("Segoe UI",9), relief="flat", padx=12, pady=5,
                  cursor="hand2").pack(side="left", padx=6)
        d.mainloop()

    root.mainloop()

# ── Arranque ──────────────────────────────────────────────────────────────────
cfg = load_cfg()
if not cfg.get("username"):
    show_config(cfg, on_done=lambda c: show_capture(c["username"]))
else:
    show_capture(cfg["username"])
