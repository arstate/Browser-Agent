#!/usr/bin/env python3
"""
Unit Test Suite for Self-Correction & Reflection Engine (Option 1)
and Goal-Driven Deep Reasoning & Milestone Tracker Loop (Option 3)
"""

import unittest
import subprocess
import json
import os

class TestAgenticLoopEngines(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Run node-based assertions on the JS modules
        pass

    def run_node_eval(self, script):
        cmd = ["node", "-e", script]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            print("STDERR:", proc.stderr)
        self.assertEqual(proc.returncode, 0, f"Node script failed: {proc.stderr}")
        return proc.stdout.strip()

    def test_self_correction_failure_detection(self):
        script = """
        const engine = require('./extension/core/self_correction_engine.js');
        
        // Test 1: Explicit error status
        if (!engine.isToolExecutionFailure('browser_click', { status: 'error', message: 'Element not found' })) {
            process.exit(1);
        }

        // Test 2: Click intercepted / not visible
        if (!engine.isToolExecutionFailure('browser_click', { status: 'failed', error: 'node is not visible' })) {
            process.exit(2);
        }

        // Test 3: Bash non-zero exit
        if (!engine.isToolExecutionFailure('run_bash_command', 'Error: Command failed: exit status 127')) {
            process.exit(3);
        }

        // Test 4: Successful tool execution
        if (engine.isToolExecutionFailure('browser_click', { status: 'success', clicked: true })) {
            process.exit(4);
        }

        console.log('PASS_FAILURE_DETECTION');
        """
        out = self.run_node_eval(script)
        self.assertIn("PASS_FAILURE_DETECTION", out)

    def test_self_correction_reflection_prompt_and_tracker(self):
        script = """
        const engine = require('./extension/core/self_correction_engine.js');
        
        const reflection = engine.generateReflectionPrompt('browser_click', { selector: '#btn-submit' }, { error: 'Element not clickable' }, 1);
        if (!reflection.includes('SYSTEM SELF-CORRECTION & REFLECTION') || !reflection.includes('browser_click')) {
            process.exit(1);
        }

        const tracker = engine.createFailureTracker(3);
        const args = { target: 'login_btn' };
        
        if (tracker.recordFailure('browser_click', args) !== 1) process.exit(2);
        if (tracker.recordFailure('browser_click', args) !== 2) process.exit(3);
        if (tracker.hasExceededMaxRetries('browser_click', args)) process.exit(4);
        
        if (tracker.recordFailure('browser_click', args) !== 3) process.exit(5);
        if (!tracker.hasExceededMaxRetries('browser_click', args)) process.exit(6);

        tracker.reset('browser_click', args);
        if (tracker.hasExceededMaxRetries('browser_click', args)) process.exit(7);

        console.log('PASS_REFLECTION_TRACKER');
        """
        out = self.run_node_eval(script)
        self.assertIn("PASS_REFLECTION_TRACKER", out)

    def test_goal_tracker_decomposition_and_directives(self):
        script = """
        const tracker = require('./extension/core/goal_tracker.js');

        // Test 1: Goal task detection
        if (!tracker.isGoalTask('/goal buka youtube lalu cari lagu wirang dan download mp3')) {
            process.exit(1);
        }
        if (!tracker.isGoalTask('1. Analisis web 2. Ekstrak data 3. Simpan PDF')) {
            process.exit(2);
        }
        if (tracker.isGoalTask('halo apa kabar')) {
            process.exit(3);
        }

        // Test 2: Milestone extraction
        const milestones = tracker.extractGoalMilestones('1. Buka dashboard\\n2. Ambil data analitik\\n3. Buat laporan PDF');
        if (milestones.length !== 3) process.exit(4);
        if (!milestones[0].title.includes('Buka dashboard')) process.exit(5);

        // Test 3: Directive builder
        const directive = tracker.buildGoalPromptDirective(milestones);
        if (!directive.includes('MANDAT GOAL CHECKLIST MATRIX') || !directive.includes('Milestone 1')) {
            process.exit(6);
        }

        // Test 4: Pending check & continuation prompt
        if (!tracker.hasPendingMilestones(milestones)) process.exit(7);
        const contPrompt = tracker.generateGoalContinuationPrompt(milestones);
        if (!contPrompt.includes('SYSTEM GOAL COMPLETION GUARD') || !contPrompt.includes('Milestone 1')) {
            process.exit(8);
        }

        console.log('PASS_GOAL_TRACKER');
        """
        out = self.run_node_eval(script)
        self.assertIn("PASS_GOAL_TRACKER", out)

if __name__ == '__main__':
    unittest.main()
