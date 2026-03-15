#!/usr/bin/env python3
"""
OmniaPixels Integration Test Suite
Comprehensive testing for FAZ-1 monorepo structure
"""

import requests
import time
import json
import os
import sys
from pathlib import Path

# Add backend to Python path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

class OmniaPixelsIntegrationTest:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.results = []
        
    def test_api_health(self):
        """Test API health endpoint"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            assert response.status_code == 200
            self.results.append({"test": "API Health", "status": "PASS"})
        except Exception as e:
            self.results.append({"test": "API Health", "status": f"FAIL: {e}"})
    
    def test_api_endpoints(self):
        """Test all API endpoints"""
        endpoints = [
            ("/", "Root endpoint"),
            ("/docs", "Swagger docs"),
            ("/v1/models", "AI models"),
            ("/v1/presets", "Processing presets")
        ]
        
        for endpoint, name in endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=5)
                if response.status_code == 200:
                    self.results.append({"test": name, "status": "PASS"})
                else:
                    self.results.append({"test": name, "status": f"❌ FAIL: {response.status_code}"})
            except Exception as e:
                self.results.append({"test": name, "status": f"❌ FAIL: {e}"})
    
    def test_mobile_structure(self):
        """Test mobile app structure"""
        flutter_path = Path(__file__).parent.parent / "mobile" / "flutter"
        android_path = Path(__file__).parent.parent / "mobile" / "android"
        
        # Flutter structure
        if flutter_path.exists() and (flutter_path / "pubspec.yaml").exists():
            self.results.append({"test": "Flutter Structure", "status": "✅ PASS"})
        else:
            self.results.append({"test": "Flutter Structure", "status": "❌ FAIL: Missing files"})
            
        # Android structure
        if android_path.exists() and (android_path / "app" / "build.gradle").exists():
            self.results.append({"test": "Android Structure", "status": "✅ PASS"})
        else:
            self.results.append({"test": "Android Structure", "status": "❌ FAIL: Missing files"})
    
    def test_environment_config(self):
        """Test environment configuration"""
        env_example = Path(__file__).parent.parent / ".env.example"
        
        if env_example.exists():
            content = env_example.read_text()
            required_vars = ["POSTGRES_URL", "REDIS_URL", "MINIO_ENDPOINT"]
            
            missing = [var for var in required_vars if var not in content]
            if not missing:
                self.results.append({"test": "Environment Config", "status": "✅ PASS"})
            else:
                self.results.append({"test": "Environment Config", "status": f"❌ FAIL: Missing {missing}"})
        else:
            self.results.append({"test": "Environment Config", "status": "❌ FAIL: .env.example missing"})
    
    def test_docker_compose(self):
        """Test Docker Compose configuration"""
        compose_file = Path(__file__).parent.parent / "docker-compose.yml"
        
        if compose_file.exists():
            content = compose_file.read_text()
            required_services = ["db", "redis", "minio", "api", "worker"]
            
            missing = [svc for svc in required_services if svc not in content]
            if not missing:
                self.results.append({"test": "Docker Compose", "status": "✅ PASS"})
            else:
                self.results.append({"test": "Docker Compose", "status": f"❌ FAIL: Missing {missing}"})
        else:
            self.results.append({"test": "Docker Compose", "status": "❌ FAIL: docker-compose.yml missing"})
    
    def run_all_tests(self):
        """Run all integration tests"""
        print("Running OmniaPixels FAZ-1 Integration Tests...\n")
        
        self.test_api_health()
        self.test_api_endpoints()
        self.test_mobile_structure()
        self.test_environment_config()
        self.test_docker_compose()
        
        # Print results
        print("Test Results:")
        print("=" * 50)
        
        passed = 0
        failed = 0
        
        for result in self.results:
            print(f"{result['status']} {result['test']}")
            if "✅" in result['status']:
                passed += 1
            else:
                failed += 1
        
        print("=" * 50)
        print(f"Summary: {passed} passed, {failed} failed")
        
        if failed == 0:
            print("All tests passed! FAZ-1 ready for PR.")
        else:
            print("Some tests failed. Fix issues before PR.")
        
        return failed == 0

if __name__ == "__main__":
    tester = OmniaPixelsIntegrationTest()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
