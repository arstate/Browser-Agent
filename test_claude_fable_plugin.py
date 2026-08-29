#!/usr/bin/env python3
"""
Unit Test Suite for Claude Fable 5 Cognitive & Memory Distillation Plugin
"""

import unittest
import subprocess
import os

class TestClaudeFablePlugin(unittest.TestCase):
    def run_node_eval(self, script):
        cmd = ["node", "-e", script]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            print("STDERR:", proc.stderr)
        self.assertEqual(proc.returncode, 0, f"Node script failed: {proc.stderr}")
        return proc.stdout.strip()

    def test_fable_system_directive_generation(self):
        script = """
        const { getClaudeFableSystemDirective } = require('./extension/plugins/claude_fable/claude_fable_optimizer.js');
        
        // Test Balanced Tier
        const balanced = getClaudeFableSystemDirective({ mode: 'balanced', reasoningEffort: 60 });
        if (!balanced.includes('<antml:reasoning_effort>60</antml:reasoning_effort>')) process.exit(1);
        if (!balanced.includes('EPISTEMIC MEMORY FILESYSTEM')) process.exit(2);
        if (!balanced.includes('HORIZON TEST')) process.exit(3);
        if (!balanced.includes('HIGH-DIGNITY')) process.exit(4);

        // Test Mythos Tier
        const mythos = getClaudeFableSystemDirective({ mode: 'mythos', reasoningEffort: 90 });
        if (!mythos.includes('<antml:reasoning_effort>90</antml:reasoning_effort>')) process.exit(5);
        if (!mythos.includes('MYTHOS-TIER REASONING STANDARDS')) process.exit(6);

        console.log('PASS_DIRECTIVE_GENERATION');
        """
        out = self.run_node_eval(script)
        self.assertIn("PASS_DIRECTIVE_GENERATION", out)

    def test_fable_effort_calibration(self):
        script = """
        const { claudeFableCalibrateEffort } = require('./extension/plugins/claude_fable/claude_fable_optimizer.js');
        
        const routineEffort = claudeFableCalibrateEffort('tolong download musik mp3 wirang');
        if (routineEffort > 40) process.exit(1);

        const complexEffort = claudeFableCalibrateEffort('lakukan analisis mendalam audit on-page SEO dan arsitektur database');
        if (complexEffort < 70) process.exit(2);

        console.log('PASS_EFFORT_CALIBRATION');
        """
        out = self.run_node_eval(script)
        self.assertIn("PASS_EFFORT_CALIBRATION", out)

    def test_fable_horizon_test_and_formatting(self):
        script = """
        const { isDurableFact, formatDurableFact } = require('./extension/plugins/claude_fable/claude_fable_optimizer.js');

        // Ephemeral fact (should fail Horizon test)
        if (isDurableFact('hari ini lagi error download mp3')) process.exit(1);

        // Durable fact (should pass Horizon test)
        if (!isDurableFact('saya bekerja sebagai lead engineer di platform tiar property')) process.exit(2);

        // Formatting fact with wiki-links
        const formatted = formatDurableFact('lead engineer di tiar property mengelola arsitektur', ['tiar property', 'arsitektur']);
        if (!formatted.startsWith('- [stated]')) process.exit(3);
        if (!formatted.includes('[[tiar property]]')) process.exit(4);
        if (!formatted.includes('[[arsitektur]]')) process.exit(5);

        console.log('PASS_HORIZON_AND_FORMATTING');
        """
        out = self.run_node_eval(script)
        self.assertIn("PASS_HORIZON_AND_FORMATTING", out)

if __name__ == '__main__':
    unittest.main()
