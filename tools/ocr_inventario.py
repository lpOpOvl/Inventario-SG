"""
OCR Inventário Star Citizen
Pressiona F9 com o rato sobre o tooltip de um item para o capturar.
"""

import pyautogui
import pytesseract
import keyboard
import requests
import tkinter as tk
from tkinter import ttk
from PIL import Image, ImageEnhance, ImageFilter

# ── CONFIGURAÇÃO ──────────────────────────────────────────────────────────────
API_URL  = "https://inventario-sg.pages.dev/api/items"
USERNAME = "lpOpOvl"               # o teu username no site
HOTKEY   = "F9"

# Posição do tooltip relativa ao cursor (ajustar se necessário)
TOOLTIP_OFFSET_X = -10   # pixels à esquerda do cursor
TOOLTIP_OFFSET_Y =  25   # pixels abaixo do cursor
TOOLTIP_W        = 360
TOOLTIP_H        =  55
# ─────────────────────────────────────────────────────────────────────────────


def capturar_e_ler():
    x, y = pyautogui.position()
    rx = max(0, x + TOOLTIP_OFFSET_X)
    ry = max(0, y + TOOLTIP_OFFSET_Y)

    img = pyautogui.screenshot(region=(rx, ry, TOOLTIP_W, TOOLTIP_H))

    # Melhorar contraste para OCR
    img = img.convert("L")                          # grayscale
    img = ImageEnhance.Contrast(img).enhance(2.5)
    img = img.point(lambda p: 255 if p > 100 else 0)  # threshold

    texto = pytesseract.image_to_string(
        img,
        config="--psm 7 --oem 3"   # linha única, LSTM
    ).strip()

    return texto


def mostrar_dialog(nome_detectado):
    win = tk.Tk()
    win.title("SC Inventário — Adicionar Item")
    win.resizable(False, False)
    win.attributes("-topmost", True)

    pad = {"padx": 10, "pady": 4}

    tk.Label(win, text="Item (OCR):", anchor="w").grid(row=0, column=0, sticky="w", **pad)
    nome_var = tk.StringVar(value=nome_detectado)
    tk.Entry(win, textvariable=nome_var, width=35).grid(row=0, column=1, **pad)

    tk.Label(win, text="Quantidade:", anchor="w").grid(row=1, column=0, sticky="w", **pad)
    qty_var = tk.StringVar(value="1")
    tk.Entry(win, textvariable=qty_var, width=10).grid(row=1, column=1, sticky="w", **pad)

    tk.Label(win, text="Qualidade:", anchor="w").grid(row=2, column=0, sticky="w", **pad)
    qual_var = tk.StringVar(value="")
    tk.Entry(win, textvariable=qual_var, width=10).grid(row=2, column=1, sticky="w", **pad)

    tk.Label(win, text="Localização:", anchor="w").grid(row=3, column=0, sticky="w", **pad)
    loc_var = tk.StringVar(value="")
    tk.Entry(win, textvariable=loc_var, width=25).grid(row=3, column=1, **pad)

    status_var = tk.StringVar(value="")
    tk.Label(win, textvariable=status_var, fg="gray").grid(row=4, column=0, columnspan=2, **pad)

    def guardar():
        nome = nome_var.get().strip()
        if not nome:
            status_var.set("Nome em falta.")
            return
        try:
            qty = float(qty_var.get()) if qty_var.get().strip() else None
            qual = float(qual_var.get()) if qual_var.get().strip() else None
        except ValueError:
            status_var.set("Quantidade/qualidade inválida.")
            return

        payload = {"username": USERNAME, "name": nome}
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

    btn_frame = tk.Frame(win)
    btn_frame.grid(row=5, column=0, columnspan=2, pady=8)
    tk.Button(btn_frame, text="Guardar", command=guardar, width=12).pack(side="left", padx=6)
    tk.Button(btn_frame, text="Cancelar", command=win.destroy, width=12).pack(side="left", padx=6)

    win.mainloop()


def on_hotkey():
    print(f"[{HOTKEY}] A capturar tooltip...")
    texto = capturar_e_ler()
    print(f"OCR leu: '{texto}'")
    mostrar_dialog(texto)


print(f"OCR Inventário SC iniciado. Pressiona {HOTKEY} com o rato no tooltip do item.")
print("Ctrl+C para sair.\n")
keyboard.add_hotkey(HOTKEY, on_hotkey)
keyboard.wait()
