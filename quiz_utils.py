import re

QUIZ_QUESTIONS = [
    "fav dessert together?",
    "fav curry of ashukutty?",
    "fav kind of photos together?",
    #"alo?",
    #"chicken or paneer?",
    "fav lip balm?",
    "fav lips?",
]

# Question iii accepts several phrasings (case insensitive)
Q3_ACCEPTED = {
    "aesthetic",
    "back",
    "back cam",
    "aesthetic back",
    "aesthetic back cam",
    "back aesthetic",
    "aesthetic back camera",
}


def _normalize(text):
    return re.sub(r"\s+", " ", text.strip().lower())


def check_answer(question_index, answer):
    normalized = _normalize(answer)

    checks = [
        normalized == "apricot delight",
        normalized == "butter chicken",
        _check_photos_answer(normalized),
        #normalized == "chinchaku",
        #normalized == "chicken",
        normalized == "wishcare",
        normalized == "mine",
    ]

    if question_index < 0 or question_index >= len(checks):
        return False

    return checks[question_index]


def _check_photos_answer(normalized):
    if normalized in Q3_ACCEPTED:
        return True

    compact = normalized.replace("/", " ").replace("-", " ")
    compact = re.sub(r"\s+", " ", compact).strip()

    if compact in Q3_ACCEPTED:
        return True

    if "aesthetic" in compact and "back" in compact:
        return True

    if compact in {"aesthetic", "back"}:
        return True

    return False
