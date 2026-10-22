#!/usr/bin/env python3
"""Genera los efectos de sonido de Odi Sort (sonidos de vidrio) por síntesis.

Uso:  python3 scripts/generar-sonidos.py
Necesita: Python 3 (solo biblioteca estándar) y ffmpeg en el PATH.
Salida: public/assets/sfx/<nombre>.ogg y .mp3 (el juego carga el que el navegador soporte).

El "vidrio" se imita sumando parciales inarmónicos (proporciones típicas de una copa:
1 · 2.32 · 4.25 · 6.63) con ataque muy corto y caída exponencial, más un clic de ruido
al principio que hace de golpe. Cambia los parámetros de cada sonido y vuelve a ejecutarlo.
"""

import array
import math
import os
import random
import subprocess
import tempfile
import wave

FS = 44100
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'public', 'assets', 'sfx')

random.seed(7)  # mismos sonidos en cada ejecución

COPA = [(1.0, 1.0, 1.0), (2.32, 0.55, 0.6), (4.25, 0.3, 0.38), (6.63, 0.16, 0.25)]  # (proporción, amplitud, duración relativa)


def silencio(segundos):
    return [0.0] * int(FS * segundos)


def mezclar(destino, fuente, desde_s, ganancia=1.0):
    inicio = int(desde_s * FS)
    if inicio + len(fuente) > len(destino):
        destino.extend([0.0] * (inicio + len(fuente) - len(destino)))
    for i, v in enumerate(fuente):
        destino[inicio + i] += v * ganancia


def vidrio(f0, caida=0.35, duracion=None, parciales=COPA, golpe=0.25, brillo=1.0):
    """Un golpe de vidrio afinado en f0 (Hz). `caida` = segundos hasta bajar a ~1/e."""
    duracion = duracion or caida * 4
    n = int(FS * duracion)
    muestras = [0.0] * n
    for proporcion, amplitud, rel in parciales:
        f = f0 * proporcion
        if f > FS / 2 - 500:
            continue
        tau = caida * rel
        fase = random.random() * math.tau
        a = amplitud * (brillo if proporcion > 2 else 1.0)
        for i in range(n):
            t = i / FS
            muestras[i] += a * math.exp(-t / tau) * math.sin(math.tau * f * t + fase)
    # ataque de 1.5 ms (evita clics) y golpe de ruido agudo de 4 ms
    ataque = int(0.0015 * FS)
    for i in range(min(ataque, n)):
        muestras[i] *= i / ataque
    previo = 0.0
    for i in range(min(int(0.004 * FS), n)):
        ruido = random.uniform(-1, 1)
        agudo = ruido - previo  # filtro paso alto sencillo
        previo = ruido
        muestras[i] += golpe * agudo * (1 - i / (0.004 * FS))
    return muestras


def ruido_barrido(duracion, f_inicio, f_fin, q=4.0, ganancia=0.5):
    """Ruido filtrado con un paso banda que se desplaza (para el 'swoosh')."""
    n = int(FS * duracion)
    salida = [0.0] * n
    x1 = x2 = y1 = y2 = 0.0
    for i in range(n):
        p = i / n
        f = f_inicio * (f_fin / f_inicio) ** p
        w = math.tau * f / FS
        alfa = math.sin(w) / (2 * q)
        b0, b2 = alfa, -alfa
        a0, a1, a2 = 1 + alfa, -2 * math.cos(w), 1 - alfa
        x = random.uniform(-1, 1)
        y = (b0 * x + b2 * x2 - a1 * y1 - a2 * y2) / a0
        x2, x1 = x1, x
        y2, y1 = y1, y
        envolvente = math.sin(math.pi * p) ** 1.5
        salida[i] = y * envolvente * ganancia
    return salida


def paso_bajo(muestras, corte):
    rc = 1 / (math.tau * corte)
    alfa = (1 / FS) / (rc + 1 / FS)
    salida, y = [], 0.0
    for x in muestras:
        y += alfa * (x - y)
        salida.append(y)
    return salida


def nota(semitonos_desde_la4):
    return 440.0 * 2 ** (semitonos_desde_la4 / 12)


# ───────────────────────────── Sonidos ─────────────────────────────

def seleccionar():
    s = silencio(0.25)
    mezclar(s, vidrio(2900, caida=0.05, golpe=0.35), 0)
    return s


def mover():
    s = silencio(0.6)
    mezclar(s, vidrio(2200, caida=0.06, golpe=0.4), 0)           # bola contra bola
    mezclar(s, vidrio(1150, caida=0.16, golpe=0.0), 0.012, 0.45)  # resonancia del tubo
    return s


def error():
    s = silencio(0.4)
    sordo = [(1.0, 1.0, 1.0), (2.32, 0.3, 0.4)]
    for t in (0, 0.09):
        mezclar(s, paso_bajo(vidrio(420, caida=0.05, parciales=sordo, golpe=0.15), 1800), t, 0.9)
    return s


def fusion():
    s = silencio(1.1)
    for i, semis in enumerate((7, 11, 14, 19)):  # mi5 · sol#5 · si5 · mi6
        mezclar(s, vidrio(nota(semis + 12), caida=0.28, golpe=0.12), i * 0.06, 0.6)
    for i in range(10):  # destellos
        mezclar(s, vidrio(random.uniform(4500, 7000), caida=0.03, golpe=0.05), 0.15 + random.random() * 0.5, 0.15)
    return s


def sellar():
    s = silencio(1.6)
    for semis in (3, 7, 10):  # do6 · mi6 · sol6 (aprox.)
        mezclar(s, vidrio(nota(semis + 12), caida=0.45, golpe=0.18), 0, 0.5)
    mezclar(s, vidrio(nota(15 + 12), caida=0.3, golpe=0.05), 0.05, 0.25)
    return s


def gravedad():
    s = silencio(1.1)
    mezclar(s, ruido_barrido(0.75, 300, 3500, q=3.0, ganancia=0.35), 0)
    for _ in range(9):  # bolas tintineando al girar
        mezclar(s, vidrio(random.uniform(1800, 3200), caida=0.05, golpe=0.25), 0.1 + random.random() * 0.7, 0.35)
    return s


def lluvia():
    s = silencio(1.4)
    for i in range(16):
        t = (i / 16) * 1.0 + random.uniform(-0.03, 0.03)
        mezclar(s, vidrio(random.uniform(3000, 5200), caida=0.035, golpe=0.3), max(0.0, t), random.uniform(0.2, 0.45))
    return s


def gota():
    s = silencio(0.45)
    mezclar(s, vidrio(3400, caida=0.05, golpe=0.2), 0)
    mezclar(s, vidrio(1300, caida=0.12, golpe=0.0), 0.01, 0.35)
    return s


def victoria():
    s = silencio(2.2)
    for i, semis in enumerate((3, 7, 10, 15)):  # arpegio ascendente de copas
        mezclar(s, vidrio(nota(semis + 12), caida=0.5, golpe=0.15), i * 0.11, 0.55)
    for i in range(12):
        mezclar(s, vidrio(random.uniform(5000, 8000), caida=0.03, golpe=0.04), 0.45 + random.random() * 0.8, 0.12)
    return s


def derrota():
    s = silencio(2.0)
    for i, semis in enumerate((10, 6, 3, -2)):  # campanas descendentes, menor
        mezclar(s, paso_bajo(vidrio(nota(semis + 12), caida=0.45, golpe=0.1), 3500), i * 0.18, 0.55)
    return s


def boton():
    s = silencio(0.2)
    mezclar(s, vidrio(1900, caida=0.035, golpe=0.25, brillo=0.6), 0)
    return s


SONIDOS = {
    'seleccionar': seleccionar,
    'mover': mover,
    'error': error,
    'fusion': fusion,
    'sellar': sellar,
    'gravedad': gravedad,
    'lluvia': lluvia,
    'gota': gota,
    'victoria': victoria,
    'derrota': derrota,
    'boton': boton,
}


def normalizar(muestras, pico=0.8):
    maximo = max(abs(v) for v in muestras) or 1.0
    salida = [v * pico / maximo for v in muestras]
    # 10 ms de fundido al final
    fundido = int(0.01 * FS)
    for i in range(min(fundido, len(salida))):
        salida[-1 - i] *= i / fundido
    return salida


def guardar(nombre, muestras):
    os.makedirs(SALIDA, exist_ok=True)
    datos = array.array('h', (int(max(-1, min(1, v)) * 32767) for v in muestras))
    with tempfile.TemporaryDirectory() as tmp:
        ruta_wav = os.path.join(tmp, f'{nombre}.wav')
        with wave.open(ruta_wav, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(FS)
            w.writeframes(datos.tobytes())
        for extension, codec in (('ogg', ['-c:a', 'libvorbis', '-q:a', '3']), ('mp3', ['-c:a', 'libmp3lame', '-b:a', '64k'])):
            subprocess.run(
                ['ffmpeg', '-loglevel', 'error', '-y', '-i', ruta_wav, '-af', 'highpass=f=80', *codec, os.path.join(SALIDA, f'{nombre}.{extension}')],
                check=True,
            )


if __name__ == '__main__':
    for nombre, generar in SONIDOS.items():
        muestras = normalizar(generar())
        guardar(nombre, muestras)
        print(f'{nombre:12s} {len(muestras) / FS:.2f} s')
    print(f'Listo: {SALIDA}')
