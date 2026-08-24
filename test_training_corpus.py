import unittest
import os
import sqlite3
import json
import tempfile
import sys

# Ensure host module is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'host'))
from native_host import (
    init_db,
    db_auto_distill_all_sessions,
    db_get_persistent_memory,
    db_delete_persistent_item,
    PM_TRAINING_CORPUS_DIR,
    DB_PATH
)

class TestTrainingCorpus(unittest.TestCase):
    def setUp(self):
        init_db()
        # Seed a dummy session for test
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        dummy_messages = [
            {"role": "user", "content": "Tolong carikan rumah minimalis 2 lantai di Sidoarjo dekat Juanda budget 400 jt."},
            {
                "role": "assistant",
                "content": "Baik bro, saya carikan unit terbaik di area Juanda.",
                "tool_calls": [
                    {
                        "function": {
                            "name": "browser_navigate",
                            "arguments": json.dumps({"url": "https://tiarproperty.com/juanda"})
                        }
                    }
                ]
            },
            {"role": "user", "content": "Tolong simulasikan angsuran KPR nya juga ya."},
            {"role": "assistant", "content": "Simulasi KPR DP 0% cicilan mulai 1.8 jt per bulan tenor 20 tahun."}
        ]
        cursor.execute("""
            INSERT INTO sessions (id, title, model, message_count, preview, messages_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET messages_json=excluded.messages_json
        """, (
            "test_sess_training_corpus_01",
            "KPR Juanda Sidoarjo 400 Juta",
            "gemini-2.5-flash",
            4,
            "Tolong carikan rumah...",
            json.dumps(dummy_messages),
            1700000000000,
            1700000000000
        ))
        conn.commit()
        conn.close()

    def test_01_auto_distill_sessions(self):
        res = db_auto_distill_all_sessions()
        self.assertEqual(res.get("status"), "ok")
        self.assertGreaterEqual(res.get("distilled_count", 0), 1)
        self.assertGreaterEqual(res.get("total_tokens_saved", 0), 0)

        # Check file exists on disk
        fpath = os.path.join(PM_TRAINING_CORPUS_DIR, "test_sess_training_corpus_01.md")
        self.assertTrue(os.path.exists(fpath), f"File {fpath} should exist")
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
            self.assertIn("Training Point: KPR Juanda Sidoarjo 400 Juta", content)
            self.assertIn("User Core Intent", content)
            self.assertIn("Juanda", content)

    def test_02_get_persistent_memory_has_training(self):
        mem = db_get_persistent_memory()
        self.assertEqual(mem.get("status"), "ok")
        corpus = mem.get("training_corpus", [])
        self.assertGreaterEqual(len(corpus), 1)
        found = any(t.get("session_id") == "test_sess_training_corpus_01" for t in corpus)
        self.assertTrue(found, "Seed training item should be returned in training_corpus")

    def test_03_delete_training_item(self):
        res = db_delete_persistent_item("training", "train_test_sess_training_corpus_01")
        self.assertEqual(res.get("status"), "ok")
        fpath = os.path.join(PM_TRAINING_CORPUS_DIR, "test_sess_training_corpus_01.md")
        self.assertFalse(os.path.exists(fpath), "File should be removed upon delete")

    def test_04_session_deletion_keeps_training_intact(self):
        from native_host import db_save_session, db_delete_session, db_get_session
        
        # Save a new session - auto-distillation should happen in real-time
        test_sid = "test_sess_auto_retained_999"
        save_res = db_save_session({
            "id": test_sid,
            "title": "Optimasi Meta Ads CPR Murah",
            "model": "auto",
            "messages": [
                {"role": "user", "content": "Tolong audit Meta Ads campaign Tiar Property budget 100rb CPR dibawah 10rb."},
                {"role": "assistant", "content": "Siap bro, gunakan Advantage+ CBO dan filter junk leads dari luar Surabaya Sidoarjo."}
            ]
        })
        self.assertEqual(save_res.get("status"), "ok")

        # Verify training corpus was created automatically
        mem_before = db_get_persistent_memory()
        corpus_before = mem_before.get("training_corpus", [])
        found_before = any(t.get("session_id") == test_sid for t in corpus_before)
        self.assertTrue(found_before, "Session should be automatically distilled on save")

        # Now DELETE raw chat session
        del_sess_res = db_delete_session(test_sid)
        self.assertEqual(del_sess_res.get("status"), "ok")
        get_sess = db_get_session(test_sid)
        self.assertEqual(get_sess.get("status"), "error", "Raw session must be deleted")

        # Verify training corpus and disk file STILL EXIST and were NOT deleted!
        mem_after = db_get_persistent_memory()
        corpus_after = mem_after.get("training_corpus", [])
        found_after = any(t.get("session_id") == test_sid for t in corpus_after)
        self.assertTrue(found_after, "Distilled training corpus MUST remain retained even after raw chat deletion!")

        fpath = os.path.join(PM_TRAINING_CORPUS_DIR, f"{test_sid}.md")
        self.assertTrue(os.path.exists(fpath), "Markdown training file on disk MUST remain intact!")

        # Clean up
        db_delete_persistent_item("training", f"train_{test_sid}")

if __name__ == '__main__':
    unittest.main()
