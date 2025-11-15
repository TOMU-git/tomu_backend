#!/usr/bin/env python3
"""
Script to convert lesson JSON files from old structure to new structure.
Converts all lesson_*.json files in data/ar/module_1/ directory.
"""

import json
import os
import re
from pathlib import Path

def extract_lesson_number(filename):
    """Extract lesson number from filename like 'lesson_1.json' -> 1"""
    match = re.search(r'lesson_(\d+)\.json', filename)
    return int(match.group(1)) if match else None

def convert_vocabulary_item(vocab, index):
    """Convert vocabulary item from old to new structure"""
    return {
        "id": vocab.get("id") or f"word_{index + 1}",
        "arabic": vocab.get("word") or vocab.get("arabic", ""),
        "lemma": vocab.get("lemma", ""),
        "translationUz": vocab.get("translationUz", ""),
        "category": vocab.get("category") or vocab.get("pos", ""),
        "exampleAr": vocab.get("example") or vocab.get("exampleAr", ""),
        "exampleUz": vocab.get("exampleUz")
    }

def convert_dialogue_turn(turn, index):
    """Convert dialogue turn from old to new structure"""
    # Extract turnIndex from turn or use array index
    turn_index = turn.get("turnIndex", index + 1)
    
    return {
        "id": f"turn_{turn_index}",
        "speaker": turn.get("speaker", "").strip() or None,
        "textAr": turn.get("text") or turn.get("textAr", ""),
        "textUz": turn.get("translationUz") or turn.get("textUz")
    }

def convert_segments_to_dialogue(segments):
    """Convert segments array to dialogue format"""
    dialogue = []
    for segment in segments:
        index = segment.get("index", len(dialogue) + 1)
        dialogue.append({
            "id": f"turn_{index}",
            "speaker": None,
            "textAr": segment.get("text", ""),
            "textUz": segment.get("translationUz")
        })
    return dialogue

def convert_monologue_to_dialogue(monologue):
    """Convert monologue to dialogue format (single turn)"""
    if not monologue or not isinstance(monologue, dict):
        return []
    
    return [{
        "id": "turn_1",
        "speaker": None,
        "textAr": monologue.get("text", ""),
        "textUz": monologue.get("translationUz")
    }]

def determine_topic(keywords, summary):
    """Determine topic from keywords or summary"""
    if not keywords:
        return None
    
    # Common topics
    topic_keywords = {
        "meva": ["meva", "fruit"],
        "uy": ["uy", "house", "home"],
        "kasb": ["kasb", "profession", "job"],
        "joy": ["joy", "place", "location"],
        "salomlashuv": ["salomlashuv", "greeting", "introduction"]
    }
    
    keywords_lower = [k.lower() for k in keywords]
    for topic, topic_kws in topic_keywords.items():
        if any(kw in keywords_lower for kw in topic_kws):
            return topic
    
    # Return first keyword as topic
    return keywords[0] if keywords else None

def determine_difficulty(lesson_number):
    """Determine difficulty based on lesson number"""
    if lesson_number <= 20:
        return "A1"
    elif lesson_number <= 50:
        return "A2"
    elif lesson_number <= 100:
        return "B1"
    else:
        return "B2"

def convert_lesson_file(file_path):
    """Convert a single lesson file from old to new structure"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            old_data = json.load(f)
        
        # Check if already in new structure
        if "meta" in old_data and "info" in old_data:
            print(f"  ✓ Already in new structure: {file_path.name}")
            return True
        
        # Extract lesson number
        lesson_number = old_data.get("lessonNumber") or old_data.get("lessonOrder") or extract_lesson_number(file_path.name) or 1
        
        # Build new structure
        new_data = {
            "meta": {
                "id": old_data.get("id", f"ar_m1_l{lesson_number}"),
                "language": old_data.get("language", "ar"),
                "module": old_data.get("moduleNumber", 1),
                "lesson": lesson_number,
                "createdAt": old_data.get("createdAt", "2025-10-12T12:00:00Z"),
                "updatedAt": old_data.get("updatedAt", "2025-10-12T12:00:00Z")
            },
            "info": {
                "title": old_data.get("title", ""),
                "summary": old_data.get("lessonSummary") or old_data.get("summary", ""),
                "keywords": old_data.get("keywords", []),
                "topic": determine_topic(old_data.get("keywords", []), old_data.get("lessonSummary", "")),
                "difficulty": determine_difficulty(lesson_number)
            },
            "vocabulary": [],
            "dialogue": []
        }
        
        # Convert vocabulary
        vocabulary = old_data.get("vocabulary", [])
        for idx, vocab in enumerate(vocabulary):
            new_data["vocabulary"].append(convert_vocabulary_item(vocab, idx))
        
        # Convert dialogue
        dialogue = old_data.get("dialogue", [])
        if dialogue:
            for idx, turn in enumerate(dialogue):
                new_data["dialogue"].append(convert_dialogue_turn(turn, idx))
        else:
            # Try segments
            segments = old_data.get("segments", [])
            if segments:
                new_data["dialogue"] = convert_segments_to_dialogue(segments)
            else:
                # Try monologue
                monologue = old_data.get("monologue")
                if monologue:
                    new_data["dialogue"] = convert_monologue_to_dialogue(monologue)
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(new_data, f, ensure_ascii=False, indent=2)
        
        print(f"  ✓ Converted: {file_path.name}")
        return True
        
    except Exception as e:
        print(f"  ✗ Error converting {file_path.name}: {e}")
        return False

def main():
    """Main function to convert all lesson files"""
    module_dir = Path("data/ar/module_1")
    
    if not module_dir.exists():
        print(f"Error: Directory {module_dir} does not exist")
        return
    
    lesson_files = sorted(module_dir.glob("lesson_*.json"), key=lambda p: extract_lesson_number(p.name) or 0)
    
    print(f"Found {len(lesson_files)} lesson files to convert...")
    print()
    
    converted = 0
    failed = 0
    skipped = 0
    
    for file_path in lesson_files:
        # Check if already converted
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if "meta" in data and "info" in data:
                    skipped += 1
                    continue
        except:
            pass
        
        if convert_lesson_file(file_path):
            converted += 1
        else:
            failed += 1
    
    print()
    print(f"Conversion complete!")
    print(f"  ✓ Converted: {converted}")
    print(f"  - Skipped (already converted): {skipped}")
    print(f"  ✗ Failed: {failed}")

if __name__ == "__main__":
    main()




