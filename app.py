import os
from flask import Flask, render_template, jsonify

app = Flask(__name__)

FOTOS_DIR = os.path.join(app.static_folder, "fotos")
EXTS = ("jpg", "jpeg", "png", "webp", "gif")


def fotos_disponibles():
    """Busca foto1..foto5 en static/fotos (cualquier extensión común)."""
    urls = []
    for i in range(1, 6):
        for ext in EXTS:
            nombre = f"foto{i}.{ext}"
            if os.path.exists(os.path.join(FOTOS_DIR, nombre)):
                urls.append(f"/static/fotos/{nombre}")
                break
    return urls


@app.route("/")
def index():
    return render_template("index.html", fotos=fotos_disponibles())


@app.route("/api/fotos")
def api_fotos():
    return jsonify(fotos_disponibles())


if __name__ == "__main__":
    puerto = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=puerto, debug=True)
