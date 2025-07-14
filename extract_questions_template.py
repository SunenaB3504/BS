import os
import json
import re

# Path to the chapter txt file and output json
chapter_txt = os.path.join('lebs101.txt')  # Change as needed
output_json = os.path.join('chapters', 'chapter101', 'questions.json')

# Helper functions for parsing

def parse_mcq(lines, idx):
    question = lines[idx+1].strip()
    options = []
    answer = None
    explanation = ""
    i = idx+2
    while i < len(lines):
        line = lines[i].strip()
        if re.match(r'^[a-dA-D][).]', line):
            options.append(line[2:].strip())
        elif line.startswith('Answer:'):
            ans_letter = line.split(':',1)[1].strip().lower()
            answer = ord(ans_letter) - ord('a')
        elif line.startswith('Explanation:'):
            explanation = line.split(':',1)[1].strip()
        elif line.startswith('['):
            break
        i += 1
    return {
        "question": question,
        "options": options,
        "answer": answer if answer is not None else 0,
        "explanation": explanation
    }, i-idx

def parse_one_word(lines, idx):
    question = lines[idx+1].strip()
    answer = ""
    i = idx+2
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith('Answer:'):
            answer = line.split(':',1)[1].strip()
        elif line.startswith('['):
            break
        i += 1
    return {
        "question": question,
        "answer": answer
    }, i-idx

def parse_assertion_reason(lines, idx):
    assertion = ""
    reason = ""
    options = []
    answer = 0
    i = idx+1
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith('Assertion'):
            assertion = line.split(':',1)[1].strip()
        elif line.startswith('Reason'):
            reason = line.split(':',1)[1].strip()
        elif re.match(r'^[a-dA-D][).]', line):
            options.append(line[2:].strip())
        elif line.startswith('Answer:'):
            ans_letter = line.split(':',1)[1].strip().lower()
            answer = ord(ans_letter) - ord('a')
        elif line.startswith('['):
            break
        i += 1
    # Default options if not present
    if not options:
        options = [
            "Both A and R are true, and R is the correct explanation of A.",
            "Both A and R are true, but R is not the correct explanation of A.",
            "A is true, R is false.",
            "A is false, R is true."
        ]
    return {
        "assertion": assertion,
        "reason": reason,
        "options": options,
        "answer": answer
    }, i-idx

def parse_short_answer(lines, idx):
    question = lines[idx+1].strip()
    answer = ""
    i = idx+2
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith('Answer:'):
            answer = line.split(':',1)[1].strip()
        elif line.startswith('['):
            break
        i += 1
    return {
        "question": question,
        "answer": answer
    }, i-idx

def parse_long_answer(lines, idx):
    question = lines[idx+1].strip()
    answer = ""
    i = idx+2
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith('Answer:'):
            answer = line.split(':',1)[1].strip()
        elif line.startswith('['):
            break
        i += 1
    return {
        "question": question,
        "answer": answer
    }, i-idx

# Main parsing logic
questions = {
    "mcq": [],
    "one_word": [],
    "assertion_reason": [],
    "short_answer": [],
    "long_answer": []
}

with open(chapter_txt, 'r', encoding='utf-8') as f:
    lines = f.readlines()

idx = 0
while idx < len(lines):
    line = lines[idx].strip()
    if line == '[MCQ]':
        q, skip = parse_mcq(lines, idx)
        questions["mcq"].append(q)
        idx += skip
    elif line == '[ONE_WORD]':
        q, skip = parse_one_word(lines, idx)
        questions["one_word"].append(q)
        idx += skip
    elif line == '[ASSERTION_REASON]':
        q, skip = parse_assertion_reason(lines, idx)
        questions["assertion_reason"].append(q)
        idx += skip
    elif line == '[SHORT_ANSWER]':
        q, skip = parse_short_answer(lines, idx)
        questions["short_answer"].append(q)
        idx += skip
    elif line == '[LONG_ANSWER]':
        q, skip = parse_long_answer(lines, idx)
        questions["long_answer"].append(q)
        idx += skip
    else:
        idx += 1

with open(output_json, 'w', encoding='utf-8') as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)

print(f"Questions extracted and written to {output_json}.")
