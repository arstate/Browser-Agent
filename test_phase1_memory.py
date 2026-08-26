#!/usr/bin/env python3
"""
Test Suite for Phase 1: Persistent Memory & SQLite Dual-Sync Engine
"""
import os
import sys
import json
import sqlite3
import unittest

# Point to host module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "host"))
import native_host

class TestPersistentMemoryPhase1(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        native_host.init_db()

    def test_01_save_personal_memory(self):
        res = native_host.db_save_personal_memory({
            "id": "mem_test_001",
            "category": "rule",
            "content": "Semua backup wajib format .zip lengkap dengan aset gambar",
            "source": "autonomous_ai",
            "reason": "Instruksi user pada sesi backup GitHub"
        })
        self.assertEqual(res.get("status"), "ok")
        self.assertEqual(res.get("id"), "mem_test_001")

        # Verify SQLite
        conn = sqlite3.connect(native_host.DB_PATH)
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT content, category, source FROM user_memories WHERE id = ?", ("mem_test_001",))
            row = cursor.fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row[0], "Semua backup wajib format .zip lengkap dengan aset gambar")
            self.assertEqual(row[1], "rule")
        finally:
            conn.close()

    def test_02_save_experience_distillation(self):
        res = native_host.db_save_experience_distillation({
            "id": "exp_test_001",
            "session_id": "sess_test_123",
            "title": "Fix Broken Image Thumbnails",
            "distilled_markdown": "### Pembelajaran Kunci:\n- Simpan semua gambar ke IndexedDB.\n- Pasang data-image-id pada thumb.",
            "key_learnings": ["Gunakan IndexedDB untuk gambar besar", "Auto-hydrate saat resume"],
            "tags": "indexeddb,images,fix"
        })
        self.assertEqual(res.get("status"), "ok")
        self.assertEqual(res.get("id"), "exp_test_001")

        # Verify SQLite
        conn = sqlite3.connect(native_host.DB_PATH)
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT title, distilled_markdown FROM experience_ledger WHERE id = ?", ("exp_test_001",))
            row = cursor.fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row[0], "Fix Broken Image Thumbnails")
        finally:
            conn.close()

    def test_03_save_anti_pattern(self):
        res = native_host.db_save_anti_pattern({
            "id": "ap_test_001",
            "target_domain": "GitHub Backup",
            "mistake_description": "Zip terabaikan oleh .gitignore",
            "root_cause": "Aturan *.zip tanpa whitelist",
            "winning_fix": "Tambahkan !antigravity_session/*.zip",
            "prevention_rule": "Cek git status sebelum konfirmasi push"
        })
        self.assertEqual(res.get("status"), "ok")

        # Verify SQLite
        conn = sqlite3.connect(native_host.DB_PATH)
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT target_domain, winning_fix FROM anti_patterns WHERE id = ?", ("ap_test_001",))
            row = cursor.fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row[0], "GitHub Backup")
        finally:
            conn.close()

    def test_04_save_autonomous_skill(self):
        res = native_host.db_save_autonomous_skill({
            "id": "skill_auto_test_001",
            "name": "Auto Table Scraper",
            "description": "Scrape table rows directly to JSON",
            "workflow_markdown": "1. Cari elemen table.\n2. Ekstrak th dan tr.\n3. Return data array.",
            "version": "v1.0.0"
        })
        self.assertEqual(res.get("status"), "ok")

        # Verify Markdown file written
        expected_file = os.path.join(native_host.PM_AUTONOMOUS_SKILLS_DIR, "skill_auto_test_001.md")
        self.assertTrue(os.path.exists(expected_file))

    def test_05_save_autonomous_agent(self):
        res = native_host.db_save_autonomous_agent({
            "id": "agent_auto_test_001",
            "name": "Marketplace Price Scraper",
            "role_description": "Spesialis scraping harga marketplace",
            "system_prompt": "Anda adalah agent spesialis harga.",
            "assigned_skills": ["skill_auto_test_001"],
            "reason": "Dibuat otomatis untuk perbandingan harga"
        })
        self.assertEqual(res.get("status"), "ok")

        # Verify Markdown file written
        expected_file = os.path.join(native_host.PM_AUTONOMOUS_AGENTS_DIR, "agent_auto_test_001.md")
        self.assertTrue(os.path.exists(expected_file))

    def test_06_get_persistent_memory(self):
        # Insert test items to ensure table has entries
        native_host.db_save_personal_memory({"id": "mem_test_get", "category": "profile", "content": "Test fact"})
        native_host.db_save_experience_distillation({"id": "exp_test_get", "title": "Test exp", "distilled_markdown": "Test exp content"})
        native_host.db_save_anti_pattern({"id": "ap_test_get", "target_domain": "Test", "mistake_description": "Test", "winning_fix": "Fix", "prevention_rule": "Rule"})

        res = native_host.db_get_persistent_memory()
        self.assertEqual(res.get("status"), "ok")
        self.assertGreaterEqual(len(res.get("user_memories", [])), 1)
        self.assertGreaterEqual(len(res.get("experience_ledger", [])), 1)
        self.assertGreaterEqual(len(res.get("anti_patterns", [])), 1)
        self.assertGreaterEqual(len(res.get("autonomous_skills", [])), 1)
    def test_07_handle_local_rpc_persistent_memory(self):
        # 1. Save via RPC
        rpc_save = native_host.handle_local_rpc({
            "id": "rpc_req_1",
            "action": "db_save_personal_memory",
            "memory": {
                "id": "mem_test_rpc_001",
                "category": "preference",
                "content": "RPC Persistent Memory Test"
            }
        })
        self.assertEqual(rpc_save.get("status"), "ok")
        self.assertEqual(rpc_save.get("id"), "rpc_req_1")

        # 2. Get via RPC
        rpc_get = native_host.handle_local_rpc({
            "id": "rpc_req_2",
            "action": "db_get_persistent_memory",
            "search": "RPC Persistent"
        })
        self.assertEqual(rpc_get.get("status"), "ok")
        self.assertEqual(len(rpc_get.get("user_memories", [])), 1)

        # 3. Delete via RPC
        rpc_del = native_host.handle_local_rpc({
            "id": "rpc_req_3",
            "action": "db_delete_persistent_item",
            "item_type": "memory",
            "item_id": "mem_test_rpc_001"
        })
        self.assertEqual(rpc_del.get("status"), "ok")

        # 4. Sync files via RPC
        rpc_sync = native_host.handle_local_rpc({
            "id": "rpc_req_4",
            "action": "db_sync_persistent_memory_files"
        })
        self.assertEqual(rpc_sync.get("status"), "ok")

    def test_07_session_pin_and_rename(self):
        # 1. Save dummy session
        save_res = native_host.db_save_session({
            "id": "sess_pin_test_001",
            "title": "Initial Session Title",
            "model": "gemini-2.5-flash",
            "messages": [{"role": "user", "content": "Hello test"}],
            "created_at": 1700000000000
        })
        self.assertEqual(save_res.get("status"), "ok")

        # 2. Pin session
        pin_res = native_host.db_pin_session("sess_pin_test_001", True)
        self.assertEqual(pin_res.get("status"), "ok")
        self.assertTrue(pin_res.get("is_pinned"))

        # 3. Rename session
        rename_res = native_host.db_rename_session("sess_pin_test_001", "Renamed Pinned Project")
        self.assertEqual(rename_res.get("status"), "ok")
        self.assertEqual(rename_res.get("title"), "Renamed Pinned Project")

        # 4. Verify get sessions returns pinned session first with new title
        list_res = native_host.db_get_sessions("Renamed Pinned")
        self.assertEqual(list_res.get("status"), "ok")
        sessions = list_res.get("sessions", [])
        self.assertTrue(len(sessions) >= 1)
        target = next((s for s in sessions if s["id"] == "sess_pin_test_001"), None)
        self.assertIsNotNone(target)
        self.assertEqual(target["title"], "Renamed Pinned Project")
        self.assertEqual(target["is_pinned"], 1)

        # 5. Unpin session
        unpin_res = native_host.db_pin_session("sess_pin_test_001", False)
        self.assertEqual(unpin_res.get("status"), "ok")
        self.assertFalse(unpin_res.get("is_pinned"))

        # 6. Clean up
        native_host.db_delete_session("sess_pin_test_001")

    def test_09_transcribe_audio_empty_payload(self):
        res = native_host.transcribe_audio_file("")
        self.assertEqual(res.get("status"), "error")
        self.assertIn("No audio data", res.get("error", ""))

    @classmethod
    def tearDownClass(cls):
        # Clean up test records
        try:
            conn = sqlite3.connect(native_host.DB_PATH)
            try:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM user_memories WHERE id LIKE 'mem_test_%'")
                cursor.execute("DELETE FROM experience_ledger WHERE id LIKE 'exp_test_%'")
                cursor.execute("DELETE FROM anti_patterns WHERE id LIKE 'ap_test_%'")
                cursor.execute("DELETE FROM autonomous_skills WHERE id LIKE 'skill_auto_test_%'")
                cursor.execute("DELETE FROM autonomous_agents WHERE id LIKE 'agent_auto_test_%'")
                conn.commit()
            finally:
                conn.close()

            test_skill_f = os.path.join(native_host.PM_AUTONOMOUS_SKILLS_DIR, "skill_auto_test_001.md")
            if os.path.exists(test_skill_f):
                os.remove(test_skill_f)
            test_agent_f = os.path.join(native_host.PM_AUTONOMOUS_AGENTS_DIR, "agent_auto_test_001.md")
            if os.path.exists(test_agent_f):
                os.remove(test_agent_f)
        except Exception:
            pass

if __name__ == "__main__":
    unittest.main()
