import json
import os
import subprocess
import time

# Extension details
ext_id = "lifodpllfgehiendpgpomfjbejhfffik"
ext_path = "/home/arya/antigravity-chrome-extension/extension"

def is_chrome_running():
    try:
        # Check for chrome processes
        out = subprocess.check_output(["pgrep", "-f", "/opt/google/chrome/chrome"])
        return len(out.strip()) > 0
    except subprocess.CalledProcessError:
        return False

def inject():
    pref_path = os.path.expanduser("~/.config/google-chrome/Profile 2/Preferences")
    if not os.path.exists(pref_path):
        print(f"Error: Preferences file not found at {pref_path}")
        return False
        
    print("Reading Chrome Preferences...")
    with open(pref_path, "r") as f:
        prefs = json.load(f)
        
    if "extensions" not in prefs:
        prefs["extensions"] = {}
    if "settings" not in prefs["extensions"]:
        prefs["extensions"]["settings"] = {}
        
    settings = prefs["extensions"]["settings"]
    
    # Inject extension configuration
    settings[ext_id] = {
        "active_permissions": {
            "api": ["sidePanel", "nativeMessaging", "cookies", "scripting", "tabs", "debugger", "storage", "webNavigation"],
            "explicit_host": ["<all_urls>"]
        },
        "creation_flags": 1,
        "from_bookmark": False,
        "from_webstore": False,
        "granted_permissions": {
            "api": ["sidePanel", "nativeMessaging", "cookies", "scripting", "tabs", "debugger", "storage", "webNavigation"],
            "explicit_host": ["<all_urls>"]
        },
        "install_time": str(int(time.time() * 1000000)),
        "location": 4, # 4 = unpacked
        "path": ext_path,
        "state": 1, # 1 = enabled
        "type": 1 # 1 = extension
    }
    
    print("Writing updated Chrome Preferences...")
    with open(pref_path, "w") as f:
        json.dump(prefs, f, indent=2)
    print("Extension injected successfully!")
    return True

if __name__ == "__main__":
    if is_chrome_running():
        print("Google Chrome is running. Closing it automatically to inject preferences...")
        try:
            subprocess.run(["pkill", "-f", "/opt/google/chrome/chrome"], check=False)
            time.sleep(2)
        except Exception as e:
            print(f"Error closing Chrome: {e}")
            
    if inject():
        print("Restarting Google Chrome with Profile 2...")
        try:
            subprocess.Popen(
                ["google-chrome-stable", "--profile-directory=Profile 2", "chrome://extensions/"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                stdin=subprocess.DEVNULL,
                preexec_fn=os.setsid
            )
            print("Chrome restarted successfully.")
        except Exception as e:
            print(f"Failed to restart Chrome: {e}")
