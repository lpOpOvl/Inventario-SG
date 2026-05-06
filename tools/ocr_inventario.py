"""
OCR Inventário Star Citizen
Pressiona F9 com o rato sobre o tooltip de um item para o capturar.
"""

import json
import os
import sys
import pyautogui
import pytesseract
import keyboard
import requests
import tkinter as tk
from PIL import ImageEnhance

API_URL  = "https://inventario-sg.pages.dev/api/items"
HOTKEY   = "F9"

TOOLTIP_OFFSET_X = -10
TOOLTIP_OFFSET_Y =  25
TOOLTIP_W        = 360
TOOLTIP_H        =  55

CONFIG_FILE = os.path.join(os.path.dirname(sys.executable if getattr(sys, 'frozen', False) else __file__), "sc_ocr_config.json")


def carregar_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def guardar_config(cfg):
    with open(CONFIG_FILE, "w") as f:
        json.dump(cfg, f)


def mostrar_config(cfg, ao_fechar=None):
    win = tk.Tk()
    win.title("SC Inventário OCR — Configuração")
    win.resizable(False, False)
    win.attributes("-topmost", True)

    pad = {"padx": 12, "pady": 5}

    tk.Label(win, text="SC Inventário OCR", font=("Segoe UI", 13, "bold")).grid(row=0, column=0, columnspan=2, pady=(14, 2))
    tk.Label(win, text="inventario-sg.pages.dev", fg="gray", font=("Segoe UI", 9)).grid(row=1, column=0, columnspan=2, pady=(0, 10))

    tk.Label(win, text="O teu username no site:", anchor="w").grid(row=2, column=0, sticky="w", **pad)
    user_var = tk.StringVar(value=cfg.get("username", ""))
    tk.Entry(win, textvariable=user_var, width=22).grid(row=2, column=1, **pad)

    status_var = tk.StringVar()
    tk.Label(win, textvariable=status_var, fg="gray").grid(row=3, column=0, columnspan=2)

    def confirmar():
        u = user_var.get().strip()
        if not u:
            status_var.set("Introduz o teu username.")
            return
        cfg["username"] = u
        guardar_config(cfg)
        win.destroy()
        if ao_fechar:
            ao_fechar(cfg)

    tk.Button(win, text="Guardar e iniciar", command=confirmar, width=18).grid(row=4, column=0, columnspan=2, pady=12)
    win.mainloop()


def capturar_e_ler():
    x, y = pyautogui.position()
    rx = max(0, x + TOOLTIP_OFFSET_X)
    ry = max(0, y + TOOLTIP_OFFSET_Y)
    img = pyautogui.screenshot(region=(rx, ry, TOOLTIP_W, TOOLTIP_H))
    img = img.convert("L")
    img = ImageEnhance.Contrast(img).enhance(2.5)
    img = img.point(lambda p: 255 if p > 100 else 0)
    return pytesseract.image_to_string(img, config="--psm 7 --oem 3").strip()


def mostrar_dialog(nome_detectado, username):
    win = tk.Tk()
    win.title("SC Inventário — Adicionar Item")
    win.resizable(False, False)
    win.attributes("-topmost", True)

    pad = {"padx": 10, "pady": 4}

    tk.Label(win, text=f"User: {username}", fg="gray", font=("Segoe UI", 8)).grid(row=0, column=0, columnspan=2, sticky="w", padx=10, pady=(6,0))

    tk.Label(win, text="Item (OCR):", anchor="w").grid(row=1, column=0, sticky="w", **pad)
    nome_var = tk.StringVar(value=nome_detectado)
    tk.Entry(win, textvariable=nome_var, width=35).grid(row=1, column=1, **pad)

    tk.Label(win, text="Quantidade:", anchor="w").grid(row=2, column=0, sticky="w", **pad)
    qty_var = tk.StringVar(value="1")
    tk.Entry(win, textvariable=qty_var, width=10).grid(row=2, column=1, sticky="w", **pad)

    tk.Label(win, text="Qualidade:", anchor="w").grid(row=3, column=0, sticky="w", **pad)
    qual_var = tk.StringVar(value="")
    tk.Entry(win, textvariable=qual_var, width=10).grid(row=3, column=1, sticky="w", **pad)

    tk.Label(win, text="Localização:", anchor="w").grid(row=4, column=0, sticky="w", **pad)
    loc_var = tk.StringVar(value="")
    tk.Entry(win, textvariable=loc_var, width=25).grid(row=4, column=1, **pad)

    status_var = tk.StringVar()
    tk.Label(win, textvariable=status_var, fg="gray").grid(row=5, column=0, columnspan=2, **pad)

    def guardar():
        nome = nome_var.get().strip()
        if not nome:
            status_var.set("Nome em falta.")
            return
        try:
            qty  = float(qty_var.get())  if qty_var.get().strip()  else None
            qual = float(qual_var.get()) if qual_var.get().strip() else None
        except ValueError:
            status_var.set("Quantidade/qualidade inválida.")
            return

        payload = {"username": username, "name": nome}
        if qty  is not None: payload["quantity"] = qty
        if qual is not None: payload["quality"]  = qual
        if loc_var.get().strip(): payload["location"] = loc_var.get().strip()

        try:
            r = requests.post(API_URL, json=payload, timeout=8)
            if r.ok:
                status_var.set("✓ Guardado!")
                win.after(1000, win.destroy)
            else:
                status_var.set(f"Erro {r.status_code}: {r.text[:60]}")
        except Exception as e:
            status_var.set(f"Sem ligação: {e}")

    btn = tk.Frame(win)
    btn.grid(row=6, column=0, columnspan=2, pady=8)
    tk.Button(btn, text="Guardar",   command=guardar,      width=12).pack(side="left", padx=6)
    tk.Button(btn, text="Cancelar",  command=win.destroy,  width=12).pack(side="left", padx=6)

    win.mainloop()


def iniciar(cfg):
    username = cfg["username"]
    print(f"SC Inventário OCR iniciado — user: {username}")
    print(f"Pressiona {HOTKEY} com o rato no tooltip do item. Ctrl+C para sair.\n")

    def on_hotkey():
        texto = capturar_e_ler()
        mostrar_dialog(texto, username)

    keyboard.add_hotkey(HOTKEY, on_hotkey)
    keyboard.wait()


cfg = carregar_config()
if not cfg.get("username"):
    mostrar_config(cfg, ao_fechar=iniciar)
else:
    iniciar(cfg)
