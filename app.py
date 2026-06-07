import base64
import os
import secrets

from flask import Flask, jsonify, render_template, request, session

from face_utils import load_varshini_encoding, verify_face_from_bytes
from quiz_utils import QUIZ_QUESTIONS, check_answer

print(f"[DEBUG] Loaded {len(QUIZ_QUESTIONS)} questions: {QUIZ_QUESTIONS}")

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", secrets.token_hex(32))

_varshini_cache = {"encoding": None, "path": None, "loaded": False}


def get_varshini():
    if not _varshini_cache["loaded"]:
        encoding, path = load_varshini_encoding()
        _varshini_cache["encoding"] = encoding
        _varshini_cache["path"] = path
        _varshini_cache["loaded"] = True
    return _varshini_cache["encoding"], _varshini_cache["path"]


@app.route("/")
def index():
    print(f"[DEBUG in index()] QUIZ_QUESTIONS has {len(QUIZ_QUESTIONS)} questions: {QUIZ_QUESTIONS}")
    encoding, _ = get_varshini()
    return render_template(
        "index.html",
        quiz_questions=QUIZ_QUESTIONS,
        has_varshini_photo=encoding is not None,
    )


@app.route("/api/status")
def status():
    encoding, path = get_varshini()
    return jsonify(
        {
            "face_verified": session.get("face_verified", False),
            "quiz_passed": session.get("quiz_passed", False),
            "has_varshini_photo": encoding is not None,
            "varshini_image": os.path.basename(path) if path else None,
        }
    )


@app.route("/api/verify-face", methods=["POST"])
def verify_face():
    data = request.get_json(silent=True) or {}
    image_data = data.get("image", "")

    if "," in image_data:
        image_data = image_data.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(image_data)
    except Exception:
        return jsonify({"success": False, "message": "Invalid image data."}), 400

    encoding, _ = get_varshini()
    success, message = verify_face_from_bytes(image_bytes, encoding)

    if success:
        session["face_verified"] = True
        session.pop("quiz_passed", None)

    return jsonify({"success": success, "message": message})


@app.route("/api/skip-face", methods=["POST"])
def skip_face():
    session["face_verified"] = True
    session.pop("quiz_passed", None)
    return jsonify({"success": True})


@app.route("/api/check-answer", methods=["POST"])
def check_quiz_answer():
    if not session.get("face_verified"):
        return jsonify({"error": "Face not verified."}), 403

    data = request.get_json(silent=True) or {}
    question_index = data.get("questionIndex")
    answer = data.get("answer", "")

    if question_index is None:
        return jsonify({"error": "Missing question index."}), 400

    correct = check_answer(int(question_index), answer)
    return jsonify({"correct": correct})


@app.route("/api/quiz-complete", methods=["POST"])
def quiz_complete():
    if not session.get("face_verified"):
        return jsonify({"error": "Face not verified."}), 403

    data = request.get_json(silent=True) or {}
    score = data.get("score", 0)

    if score == 7:
        session["quiz_passed"] = True
        return jsonify({"success": True})

    return jsonify({"success": False, "message": "You need 7/7 to enter. Try again!"})


@app.route("/api/reset", methods=["POST"])
def reset_session():
    session.clear()
    return jsonify({"success": True})


if __name__ == "__main__":
    encoding, path = load_varshini_encoding()
    if encoding is None:
        print(
            "\n[!] Add Varshini's photo to ImagesAttendance/ "
            "(e.g. Varshini.jpg or V.jpg)\n"
        )
    else:
        print(f"\n[ok] Loaded Varshini's face from: {path}\n")

    app.run(debug=True, port=5000, use_reloader=False)
