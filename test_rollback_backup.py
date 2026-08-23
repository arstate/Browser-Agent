#!/usr/bin/env python3
"""
Test Suite for Pre-Edit Snapshot Backup & Rollback Engine
"""
import os
import sys
import json
import sqlite3
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "host"))
import native_host

class TestRollbackBackup(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        native_host.init_db()

    def test_01_manual_skill_edit_backup_and_rollback(self):
        # 1. Create initial skill
        sk_id = "test_manual_skill_01"
        res1 = native_host.save_md_item(native_host.SKILLS_DIR, {
            "id": sk_id,
            "name": "Initial Manual Skill",
            "description": "Original user skill",
            "content": "### Step 1: Do initial manual steps",
            "source": "user"
        })
        self.assertEqual(res1.get("status"), "ok")

        # 2. Agent improves the skill
        res2 = native_host.save_md_item(native_host.SKILLS_DIR, {
            "id": sk_id,
            "name": "Improved Manual Skill by Agent",
            "description": "Upgraded with zero error flow",
            "content": "### Step 1: Improved steps with automated fallback\n### Step 2: Verification",
            "edited_by": "autonomous_ai",
            "change_summary": "Added automated fallback"
        })
        self.assertEqual(res2.get("status"), "ok")

        # 3. Verify history exists
        hist_res = native_host.db_list_item_history("skill", sk_id)
        self.assertEqual(hist_res.get("status"), "ok")
        history = hist_res.get("history", [])
        self.assertGreaterEqual(len(history), 1)
        self.assertEqual(history[0]["item_name"], "Initial Manual Skill")
        self.assertIn("Do initial manual steps", history[0]["previous_content"])

        # 4. Perform rollback
        rb_res = native_host.db_rollback_item("skill", sk_id)
        self.assertEqual(rb_res.get("status"), "ok")

        # 5. Verify restored file
        restored = native_host.parse_md_file(os.path.join(native_host.SKILLS_DIR, f"{sk_id}.md"))
        self.assertIsNotNone(restored)
        self.assertEqual(restored.get("meta", {}).get("name"), "Initial Manual Skill")
        self.assertIn("Do initial manual steps", restored.get("content"))

    def test_02_autonomous_agent_edit_backup_and_rollback(self):
        # 1. Create initial agent
        ag_id = "test_agent_rollback_01"
        res1 = native_host.db_save_autonomous_agent({
            "id": ag_id,
            "name": "Original Agent",
            "role_description": "Initial persona",
            "system_prompt": "You are a junior assistant",
            "assigned_skills": ["skill_auto_meta_ads_auditor"],
            "source": "user"
        })
        self.assertEqual(res1.get("status"), "ok")

        # 2. Agent upgrades persona
        res2 = native_host.db_save_autonomous_agent({
            "id": ag_id,
            "name": "Senior Specialist Agent",
            "role_description": "Upgraded master persona",
            "system_prompt": "You are a senior master architect with 100% zero error guarantee",
            "assigned_skills": ["skill_auto_meta_ads_auditor", "skill_auto_wa_qualification_sop"],
            "source": "autonomous_ai",
            "reason": "Autonomous self-upgrade"
        })
        self.assertEqual(res2.get("status"), "ok")

        # 3. Check history
        hist_res = native_host.db_list_item_history("autonomous_agent", ag_id)
        self.assertEqual(hist_res.get("status"), "ok")
        history = hist_res.get("history", [])
        self.assertGreaterEqual(len(history), 1)
        self.assertEqual(history[0]["item_name"], "Original Agent")

        # 4. Rollback
        rb_res = native_host.db_rollback_item("autonomous_agent", ag_id)
        self.assertEqual(rb_res.get("status"), "ok")

        # 5. Verify restored agent in SQLite
        conn = sqlite3.connect(native_host.DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT name, system_prompt FROM autonomous_agents WHERE id = ?", (ag_id,))
        row = cursor.fetchone()
        conn.close()
        self.assertIsNotNone(row)
        self.assertEqual(row[0], "Original Agent")
        self.assertEqual(row[1], "You are a junior assistant")

if __name__ == "__main__":
    unittest.main()
