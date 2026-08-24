#!/usr/bin/env python3
"""
Test Suite for Epistemic Knowledge Hypergraph, Mathematical Decay, and Conflict Resolution Engine
"""
import os
import sys
import json
import sqlite3
import time
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "host"))
import native_host

class TestCognitiveEpistemicEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        native_host.init_db()

    def test_01_mathematical_decay_calculation(self):
        # Initial confidence 1.0, 0 elapsed time -> 1.0
        now_ms = int(time.time() * 1000)
        c0 = native_host.calculate_epistemic_decay(1.0, now_ms, decay_tau=2592000.0)
        self.assertAlmostEqual(c0, 1.0, places=2)

        # After 1 half-life (30 days = 2,592,000s) -> should be ~0.50
        past_30d_ms = now_ms - int(2592000.0 * 1000)
        c_half = native_host.calculate_epistemic_decay(1.0, past_30d_ms, decay_tau=2592000.0)
        self.assertAlmostEqual(c_half, 0.50, places=2)

        # After 2 half-lives (60 days) -> should be ~0.25
        past_60d_ms = now_ms - int(2592000.0 * 2 * 1000)
        c_quarter = native_host.calculate_epistemic_decay(1.0, past_60d_ms, decay_tau=2592000.0)
        self.assertAlmostEqual(c_quarter, 0.25, places=2)

    def test_02_upsert_and_dynamic_conflict_resolution(self):
        # 1. Insert initial fact: "Cluster Sukodono" -> "promo_bunga" -> "4.5%" (from web_search 60 days ago)
        sixty_days_ago_ms = int(time.time() * 1000) - int(2592000.0 * 2 * 1000)
        t1_id = "test_trip_promo_01"
        res1 = native_host.db_upsert_epistemic_triplet({
            "id": t1_id,
            "subject": "Cluster Sukodono",
            "predicate": "promo_bunga",
            "object": "4.5%",
            "confidence": 0.95,
            "source_kappa": "web_search"
        })
        self.assertEqual(res1.get("status"), "ok")

        # Manually age this fact in DB to simulate 60 days passing
        conn = sqlite3.connect(native_host.DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE graph_epistemic_triplets SET updated_at = ? WHERE id = ?", (sixty_days_ago_ms, t1_id))
        conn.commit()
        conn.close()

        # 2. Insert new fact from user/bash: "Cluster Sukodono" -> "promo_bunga" -> "3.4%" (Confidence 1.0)
        res2 = native_host.db_upsert_epistemic_triplet({
            "subject": "Cluster Sukodono",
            "predicate": "promo_bunga",
            "object": "3.4%",
            "confidence": 1.0,
            "source_kappa": "user_direct"
        })
        self.assertEqual(res2.get("status"), "ok")
        t2_id = res2.get("id")

        # 3. Verify old fact was PRUNED because Delta c > Threshold
        conn = sqlite3.connect(native_host.DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT status FROM graph_epistemic_triplets WHERE id = ?", (t1_id,))
        old_status = cursor.fetchone()[0]
        cursor.execute("SELECT status, object FROM graph_epistemic_triplets WHERE id = ?", (t2_id,))
        new_row = cursor.fetchone()
        conn.close()

        self.assertEqual(old_status, "pruned")
        self.assertEqual(new_row[0], "active")
        self.assertEqual(new_row[1], "3.4%")

    def test_03_multi_hop_knowledge_traversal(self):
        # Setup multi-hop chain:
        # Arya -> manages -> Tiar Property -> operates_in -> Sidoarjo & Surabaya -> has_feature -> DP 0%
        native_host.db_upsert_epistemic_triplet({"subject": "Arya Test", "predicate": "manages", "object": "Tiar Property Test", "confidence": 1.0})
        native_host.db_upsert_epistemic_triplet({"subject": "Tiar Property Test", "predicate": "operates_in", "object": "Surabaya & Sidoarjo", "confidence": 1.0})
        native_host.db_upsert_epistemic_triplet({"subject": "Surabaya & Sidoarjo", "predicate": "has_feature", "object": "DP 0% All-In", "confidence": 1.0})

        # Traverse starting from "Arya Test" with depth 2
        trav_res = native_host.db_traverse_knowledge_graph("Arya Test", max_depth=2)
        self.assertEqual(trav_res.get("status"), "ok")
        graph_paths = trav_res.get("graph", [])
        self.assertGreaterEqual(len(graph_paths), 2)
        
        # Verify first hop
        first_hop = [p for p in graph_paths if p["relation"] == "manages"]
        self.assertEqual(len(first_hop), 1)
        self.assertEqual(first_hop[0]["to"], "Tiar Property Test")

    def test_04_negative_constraint_and_markdown_sync(self):
        # Insert negative constraint (forbidden route)
        neg_res = native_host.db_upsert_epistemic_triplet({
            "subject": "BLT Marketing Commission",
            "predicate": "forbidden_mention",
            "object": "Buyer Leads",
            "confidence": 1.0,
            "negative_constraint": 1
        })
        self.assertEqual(neg_res.get("status"), "ok")
        self.assertEqual(neg_res.get("negative_constraint"), 1)

        # Verify markdown file exists and contains the negative badge
        triplets_md_path = os.path.join(native_host.PM_KNOWLEDGE_GRAPH_DIR, "triplets.md")
        self.assertTrue(os.path.exists(triplets_md_path))
        with open(triplets_md_path, "r", encoding="utf-8") as f:
            md_text = f.read()
        self.assertIn("BLT Marketing Commission", md_text)
        self.assertIn("Terlarang (Negative)", md_text)

if __name__ == "__main__":
    unittest.main()
