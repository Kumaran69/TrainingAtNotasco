"""
rules.py — the rule-based "brain" of the assistant.

Key design idea: a normal console app can just call input() three times
in a row to run the calculator. A web chat can't — each HTTP request is
one message, and the server doesn't get to "pause and wait" mid-function.

So multi-step features (calculator, quiz, etc.) are modeled as a small
state machine instead: each session document in MongoDB has an optional
"pending" field like {"type": "calculator", "step": "op", "data": {...}}.
When a new message arrives, we check: is there a flow in progress? If so,
feed the message into that flow's *next step*. If not, figure out which
feature the message is asking for and start a new flow (or, for simple
one-shot replies like Q&A, just answer immediately).
"""

from datetime import datetime, timezone
from database import sessions_col, tasks_col, messages_col

# ---------------------------------------------------------------------
# Knowledge base — at least 15 predefined AI/Python questions
# ---------------------------------------------------------------------

KNOWLEDGE_BASE = [
    (["what is python", "python language"],
     "Python is a high-level, interpreted programming language known for its readable syntax."),
    (["what is ai", "artificial intelligence"],
     "AI (Artificial Intelligence) is the simulation of human intelligence by machines, "
     "especially computer systems."),
    (["what is machine learning", "what is ml"],
     "Machine Learning is a subset of AI where systems learn patterns from data instead of "
     "being explicitly programmed with rules."),
    (["what is deep learning"],
     "Deep Learning is a subset of Machine Learning that uses multi-layered neural networks "
     "to learn from large amounts of data."),
    (["what is neural network"],
     "A neural network is a computing system inspired by the human brain, made of layers of "
     "connected 'neurons' that learn to recognize patterns."),
    (["what is a variable", "what is variable"],
     "A variable is a named location in memory used to store a value that can change during "
     "program execution."),
    (["what is a loop", "what is loop", "for loop", "while loop"],
     "A loop repeats a block of code multiple times. Python's main loops are 'for' (iterate "
     "over a sequence) and 'while' (repeat while a condition is true)."),
    (["what is a function", "what is function"],
     "A function is a reusable, named block of code that performs a specific task, defined "
     "in Python using the 'def' keyword."),
    (["what is a list", "what is list"],
     "A list is an ordered, mutable collection of items in Python, written with square "
     "brackets, e.g. [1, 2, 3]."),
    (["what is a dictionary", "what is dict"],
     "A dictionary stores data as key-value pairs, written with curly braces, e.g. "
     "{'name': 'Arun'} — values are looked up by key, not by position."),
    (["difference between list and tuple", "list vs tuple"],
     "Lists are mutable (can be changed after creation) and use [], while tuples are "
     "immutable (cannot be changed) and use ()."),
    (["what is oop", "object oriented"],
     "OOP (Object-Oriented Programming) organizes code around 'objects' that bundle data "
     "(attributes) and behavior (methods) together, using classes as blueprints."),
    (["what is an api", "what is api"],
     "An API (Application Programming Interface) is a set of rules that lets one piece of "
     "software communicate with another."),
    (["what is exception handling", "what is try except"],
     "Exception handling lets a program respond to errors gracefully using try/except "
     "blocks, instead of crashing when something goes wrong."),
    (["what is recursion"],
     "Recursion is when a function calls itself to solve a smaller version of the same "
     "problem, continuing until it reaches a base case."),
    (["what is a class", "what is class"],
     "A class is a blueprint for creating objects in Python, defining what attributes and "
     "methods those objects will have."),
    (["what is pip"],
     "pip is Python's package manager — it installs and manages external libraries, e.g. "
     "'pip install requests'."),
]

GREETING_KEYWORDS = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"]
THANKS_KEYWORDS = ["thank", "thanks", "thx"]
HOW_ARE_YOU_KEYWORDS = ["how are you", "how're you", "how you doing"]
EXIT_KEYWORDS = ["exit", "quit", "bye"]

QUIZ_QUESTIONS = [
    {"question": "Which keyword is used to define a function in Python?",
     "options": {"a": "func", "b": "def", "c": "function", "d": "lambda"}, "answer": "b"},
    {"question": "Which data type is immutable in Python?",
     "options": {"a": "list", "b": "dict", "c": "tuple", "d": "set"}, "answer": "c"},
    {"question": "What does 'AI' stand for?",
     "options": {"a": "Automated Input", "b": "Artificial Intelligence",
                 "c": "Applied Interface", "d": "Analytical Index"}, "answer": "b"},
    {"question": "Which symbol is used for comments in Python?",
     "options": {"a": "//", "b": "<!-- -->", "c": "#", "d": "/* */"}, "answer": "c"},
    {"question": "Which of these is a Python library commonly used for machine learning?",
     "options": {"a": "scikit-learn", "b": "Bootstrap", "c": "jQuery", "d": "Laravel"}, "answer": "a"},
]

VOWELS = set("aeiouAEIOU")
MENU_SHORTCUTS = {
    "1": "what is ai", "2": "calculate", "3": "analyze number", "4": "analyze text",
    "5": "add task", "6": "view tasks", "7": "remove task", "8": "quiz",
    "9": "stats", "10": "exit",
}

HELP_TEXT = """Here's what I can do — just type naturally, e.g. "calculate":
1. Ask AI/ML questions   4. Analyze text        7. Remove tasks    10. Exit
2. Calculate numbers     5. Add tasks           8. Take Python quiz
3. Analyze numbers       6. View tasks          9. View statistics"""


def contains_any(text: str, keywords: list) -> bool:
    """Keyword matching with a safety fix: single-word keywords (like "hi")
    must match a whole word, not just appear as a substring — otherwise
    "hi" would incorrectly match inside "machine" or "history". Multi-word
    phrases (like "how are you") are still matched as substrings, since
    that's what allows flexible phrasing without needing exact input."""
    words = set(text.split())
    for kw in keywords:
        if " " in kw:
            if kw in text:
                return True
        elif kw in words:
            return True
    return False


def quiz_question_text(index: int) -> str:
    q = QUIZ_QUESTIONS[index]
    lines = [f"Q{index + 1}. {q['question']}"]
    for key, option in q["options"].items():
        lines.append(f"  {key}) {option}")
    lines.append("Answer with a, b, c, or d.")
    return "\n".join(lines)


def format_stats(session: dict) -> str:
    quiz_line = "Not taken yet"
    if session.get("quiz_taken"):
        pct = (session["quiz_score"] / session["quiz_total"]) * 100
        quiz_line = f"{session['quiz_score']}/{session['quiz_total']} ({pct:.0f}%)"
    task_count = tasks_col.count_documents({"session_id": session["_id"]})
    return (
        "SESSION STATISTICS\n"
        f"User Name       : {session['name']}\n"
        f"Messages Sent   : {session['messages_sent']}\n"
        f"Tasks Added     : {session['tasks_added']}\n"
        f"Tasks Remaining : {task_count}\n"
        f"Quiz Score      : {quiz_line}"
    )


def list_tasks_text(session_id: str) -> tuple:
    """Returns (display_text, list_of_task_docs)."""
    tasks = list(tasks_col.find({"session_id": session_id}).sort("created_at", 1))
    if not tasks:
        return "Your to-do list is empty.", []
    lines = ["Your tasks:"]
    for i, t in enumerate(tasks, start=1):
        lines.append(f"  {i}. {t['text']}")
    return "\n".join(lines), tasks


# ---------------------------------------------------------------------
# Continuing an in-progress multi-step flow
# ---------------------------------------------------------------------

def continue_pending(session: dict, pending: dict, raw_text: str):
    """Returns (reply: str, new_pending: dict | None)."""
    flow = pending["type"]
    step = pending["step"]
    data = pending.get("data", {})
    text = raw_text.strip()

    if flow == "calculator":
        if step == "num1":
            try:
                data["num1"] = float(text)
            except ValueError:
                return "That's not a valid number. Enter the first number:", pending
            return "Choose an operator: + - * /", {"type": flow, "step": "op", "data": data}

        if step == "op":
            if text not in {"+", "-", "*", "/"}:
                return "Please enter one of + - * /", pending
            data["op"] = text
            return "Enter the second number:", {"type": flow, "step": "num2", "data": data}

        if step == "num2":
            try:
                num2 = float(text)
            except ValueError:
                return "That's not a valid number. Enter the second number:", pending
            op = data["op"]
            if op == "/" and num2 == 0:
                return "Can't divide by zero! Enter a non-zero second number:", pending
            num1 = data["num1"]
            result = {"+": num1 + num2, "-": num1 - num2,
                      "*": num1 * num2, "/": num1 / num2 if op == "/" else None}[op]
            return f"Result -> {num1:g} {op} {num2:g} = {result:g}", None

    if flow == "number_analysis" and step == "number":
        try:
            n = float(text)
        except ValueError:
            return "That's not a valid number. Try again:", pending
        parity = "even" if n % 2 == 0 else "odd"
        sign = "positive" if n > 0 else "negative" if n < 0 else "zero"
        return f"{n:g} is {parity}, {sign}, and its square is {n * n:g}.", None

    if flow == "text_analysis" and step == "text":
        if not text:
            return "Please enter some non-empty text:", pending
        char_count = len(text)
        word_count = len(text.split())
        vowel_count = sum(1 for ch in text if ch in VOWELS)
        return f"Characters: {char_count} | Words: {word_count} | Vowels: {vowel_count}", None

    if flow == "add_task" and step == "text":
        if not text:
            return "Task can't be empty. What's the task?", pending
        tasks_col.insert_one({
            "session_id": session["_id"], "text": text,
            "created_at": datetime.now(timezone.utc),
        })
        sessions_col.update_one({"_id": session["_id"]}, {"$inc": {"tasks_added": 1}})
        count = tasks_col.count_documents({"session_id": session["_id"]})
        return f"Added task -> '{text}'. You have {count} task(s) now.", None

    if flow == "remove_task" and step == "choose":
        tasks = data["tasks"]
        if not text.isdigit() or not (1 <= int(text) <= len(tasks)):
            return f"Please enter a number from 1 to {len(tasks)}.", pending
        task = tasks[int(text) - 1]
        tasks_col.delete_one({"_id": task["_id"]})
        remaining = tasks_col.count_documents({"session_id": session["_id"]})
        return f"Removed -> '{task['text']}'. {remaining} task(s) remaining.", None

    if flow == "quiz" and step.startswith("q"):
        index = data["index"]
        if text.lower() not in {"a", "b", "c", "d"}:
            return "Please answer with a, b, c, or d.", pending
        correct = QUIZ_QUESTIONS[index]["answer"]
        feedback = "Correct!" if text.lower() == correct else \
            f"Incorrect. The correct answer was '{correct}'."
        if text.lower() == correct:
            data["score"] = data.get("score", 0) + 1

        next_index = index + 1
        if next_index >= len(QUIZ_QUESTIONS):
            score = data.get("score", 0)
            total = len(QUIZ_QUESTIONS)
            sessions_col.update_one({"_id": session["_id"]}, {"$set": {
                "quiz_score": score, "quiz_total": total, "quiz_taken": True,
            }})
            pct = (score / total) * 100
            return f"{feedback}\n\nQuiz complete! You scored {score}/{total} ({pct:.0f}%).", None

        data["index"] = next_index
        next_q = quiz_question_text(next_index)
        return f"{feedback}\n\n{next_q}", {"type": flow, "step": f"q{next_index}", "data": data}

    # Shouldn't normally reach here — clear the stuck flow defensively.
    return "Something went wrong with that, let's start over. Type 'help' to see what I can do.", None


# ---------------------------------------------------------------------
# Starting a new intent (no flow currently in progress)
# ---------------------------------------------------------------------

def start_intent(session: dict, raw_text: str):
    """Returns (reply: str, new_pending: dict | None)."""
    text = raw_text.strip().lower()
    session_id = session["_id"]

    if not text:
        return "Say something, or type 'help' if you're not sure where to start.", None

    if text in MENU_SHORTCUTS:
        text = MENU_SHORTCUTS[text]

    if contains_any(text, EXIT_KEYWORDS):
        return f"Goodbye, {session['name']}! Here's how our session went:\n\n{format_stats(session)}", None

    if contains_any(text, ["help", "menu"]):
        return HELP_TEXT, None

    if contains_any(text, ["stats", "statistics", "summary"]):
        return format_stats(session), None

    if contains_any(text, ["quiz"]):
        q0 = quiz_question_text(0)
        return f"Python Quiz time! 5 questions, answer with a/b/c/d.\n\n{q0}", \
            {"type": "quiz", "step": "q0", "data": {"index": 0, "score": 0}}

    if contains_any(text, ["add task", "add a task", "new task"]):
        if ":" in raw_text:
            task_text = raw_text.split(":", 1)[1].strip()
            if task_text:
                tasks_col.insert_one({
                    "session_id": session_id, "text": task_text,
                    "created_at": datetime.now(timezone.utc),
                })
                sessions_col.update_one({"_id": session_id}, {"$inc": {"tasks_added": 1}})
                count = tasks_col.count_documents({"session_id": session_id})
                return f"Added task -> '{task_text}'. You have {count} task(s) now.", None
        return "What's the task?", {"type": "add_task", "step": "text", "data": {}}

    if contains_any(text, ["view task", "show task", "todo list", "my tasks", "list tasks"]):
        display, _ = list_tasks_text(session_id)
        return display, None

    if contains_any(text, ["remove task", "delete task"]):
        display, tasks = list_tasks_text(session_id)
        if not tasks:
            return "Nothing to remove — your to-do list is empty.", None
        prompt = f"{display}\nEnter the number of the task to remove:"
        return prompt, {"type": "remove_task", "step": "choose", "data": {"tasks": tasks}}

    if contains_any(text, ["calculate", "calculator", "calc"]):
        return "Calculator ready. Enter the first number:", \
            {"type": "calculator", "step": "num1", "data": {}}

    if contains_any(text, ["analyze number", "number analysis", "check number", "even or odd"]):
        return "Enter a number to analyze:", {"type": "number_analysis", "step": "number", "data": {}}

    if contains_any(text, ["analyze text", "text analysis", "count words", "count vowels"]):
        return "Enter some text to analyze:", {"type": "text_analysis", "step": "text", "data": {}}

    if "my name is" in text:
        name = text.split("my name is", 1)[1].strip()
        if name:
            sessions_col.update_one({"_id": session_id}, {"$set": {"name": name.title()}})
            return f"Got it, I'll call you {name.title()} from now on.", None

    if contains_any(text, THANKS_KEYWORDS):
        return "You're welcome!", None

    if contains_any(text, HOW_ARE_YOU_KEYWORDS):
        return "I'm just a rule-based program, but I'm running smoothly! How can I help?", None

    if contains_any(text, GREETING_KEYWORDS):
        return f"Hello, {session['name']}! Type 'help' to see what I can do.", None

    for keywords, answer in KNOWLEDGE_BASE:
        if contains_any(text, keywords):
            return answer, None

    return "I'm not sure how to respond to that. Type 'help' to see what I can do.", None


# ---------------------------------------------------------------------
# Public entry point used by main.py
# ---------------------------------------------------------------------

def process_message(session_id: str, raw_text: str) -> str:
    session = sessions_col.find_one({"_id": session_id})
    if session is None:
        raise ValueError(f"Session '{session_id}' not found.")

    sessions_col.update_one({"_id": session_id}, {"$inc": {"messages_sent": 1}})
    session["messages_sent"] += 1  # keep the in-memory copy consistent for format_stats()

    pending = session.get("pending")
    if pending:
        reply, new_pending = continue_pending(session, pending, raw_text)
    else:
        reply, new_pending = start_intent(session, raw_text)

    sessions_col.update_one({"_id": session_id}, {"$set": {"pending": new_pending}})

    now = datetime.now(timezone.utc)
    messages_col.insert_one({"session_id": session_id, "sender": "user", "text": raw_text, "ts": now})
    messages_col.insert_one({"session_id": session_id, "sender": "bot", "text": reply, "ts": now})

    return reply
