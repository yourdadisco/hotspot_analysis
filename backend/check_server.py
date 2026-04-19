#!/usr/bin/env python3
"""
检查服务器状态
"""

import sys
import urllib.request
import urllib.error

def check_server():
    url = "http://localhost:8001/api/v1/health"

    try:
        print(f"Checking server at {url}...")
        response = urllib.request.urlopen(url, timeout=5)

        if response.status == 200:
            data = response.read().decode('utf-8')
            print(f"[OK] Server is running (status: {response.status})")
            print(f"Response: {data}")
            return True
        else:
            print(f"[ERROR] Server returned status: {response.status}")
            return False

    except urllib.error.URLError as e:
        print(f"[ERROR] Server not reachable: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Error checking server: {e}")
        return False

if __name__ == "__main__":
    success = check_server()
    sys.exit(0 if success else 1)