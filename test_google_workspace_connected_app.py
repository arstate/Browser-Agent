#!/usr/bin/env python3
"""
Unit Test Suite for Google Workspace (Docs & Sheets) Connected App
"""

import unittest
import subprocess
import os

class TestGoogleWorkspaceConnectedApp(unittest.TestCase):
    def run_node_eval(self, script):
        cmd = ["node", "-e", script]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            print("STDERR:", proc.stderr)
        self.assertEqual(proc.returncode, 0, f"Node script failed: {proc.stderr}")
        return proc.stdout.strip()

    def test_id_parsers(self):
        script = """
        const { GoogleWorkspaceService } = require('./extension/connected-apps/google_workspace/google_workspace_service.js');
        const svc = new GoogleWorkspaceService();

        // 1. Test Spreadsheet URL parser
        const sheetUrl = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0";
        const sheetId = svc.parseSpreadsheetId(sheetUrl);
        if (sheetId !== "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms") process.exit(1);

        const rawSheetId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
        if (svc.parseSpreadsheetId(rawSheetId) !== rawSheetId) process.exit(2);

        // 2. Test Document URL parser
        const docUrl = "https://docs.google.com/document/d/195j9eDD3ccGJ354_cnbv9M55TMddubNDQzOmjejE525/edit?tab=t.0";
        const docId = svc.parseDocumentId(docUrl);
        if (docId !== "195j9eDD3ccGJ354_cnbv9M55TMddubNDQzOmjejE525") process.exit(3);

        const rawDocId = "195j9eDD3ccGJ354_cnbv9M55TMddubNDQzOmjejE525";
        if (svc.parseDocumentId(rawDocId) !== rawDocId) process.exit(4);

        console.log('PASS_ID_PARSERS');
        """
        out = self.run_node_eval(script)
        self.assertIn("PASS_ID_PARSERS", out)

    def test_default_credentials(self):
        script = """
        const { GoogleWorkspaceService } = require('./extension/connected-apps/google_workspace/google_workspace_service.js');
        const svc = new GoogleWorkspaceService();

        if (!svc.clientId.startsWith("526037622722")) process.exit(1);
        if (!svc.clientSecret.startsWith("GOCSPX-")) process.exit(2);

        console.log('PASS_DEFAULT_CREDENTIALS');
        """
        out = self.run_node_eval(script)
        self.assertIn("PASS_DEFAULT_CREDENTIALS", out)

    def test_service_methods_exist(self):
        script = """
        const { GoogleWorkspaceService } = require('./extension/connected-apps/google_workspace/google_workspace_service.js');
        const svc = new GoogleWorkspaceService();

        if (typeof svc.appendSpreadsheetRow !== 'function') process.exit(1);
        if (typeof svc.updateSpreadsheetRange !== 'function') process.exit(2);
        if (typeof svc.clearSpreadsheetRange !== 'function') process.exit(3);
        if (typeof svc.readSpreadsheet !== 'function') process.exit(4);
        if (typeof svc.createSpreadsheet !== 'function') process.exit(5);
        if (typeof svc.createDocument !== 'function') process.exit(6);
        if (typeof svc.appendDocumentText !== 'function') process.exit(7);
        if (typeof svc.replaceDocumentContent !== 'function') process.exit(8);
        if (typeof svc.readDocument !== 'function') process.exit(9);
        if (typeof svc.searchDrive !== 'function') process.exit(10);
        if (typeof svc.listRecentFiles !== 'function') process.exit(11);
        if (typeof svc.googleWebSearch !== 'function') process.exit(12);
        if (typeof svc.googleNewsSearch !== 'function') process.exit(13);

        console.log('PASS_SERVICE_METHODS');
        """
        out = self.run_node_eval(script)
        self.assertIn("PASS_SERVICE_METHODS", out)

if __name__ == '__main__':
    unittest.main()
