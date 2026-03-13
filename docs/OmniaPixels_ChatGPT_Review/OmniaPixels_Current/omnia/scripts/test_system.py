#!/usr/bin/env python3
"""
Comprehensive system test for OmniaPixels
Tests all components and reports status
"""

import sys
import os
import requests
import time
import json
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_api_endpoints():
    """Test all API endpoints"""
    base_url = "http://localhost:8000"
    results = {}
    
    endpoints = [
        ("GET", "/", "Root endpoint"),
        ("GET", "/health", "Health check"),
        ("GET", "/version", "Version info"),
        ("GET", "/docs", "API documentation"),
        ("GET", "/v1/models", "AI models list"),
        ("GET", "/v1/presets", "Processing presets"),
    ]
    
    print("🔍 Testing API Endpoints...")
    for method, path, description in endpoints:
        try:
            response = requests.get(f"{base_url}{path}", timeout=5)
            status = "✅ PASS" if response.status_code == 200 else f"❌ FAIL ({response.status_code})"
            results[path] = {
                "status": response.status_code,
                "success": response.status_code == 200,
                "description": description
            }
            print(f"  {status} {method} {path} - {description}")
        except Exception as e:
            results[path] = {
                "status": "ERROR",
                "success": False,
                "error": str(e),
                "description": description
            }
            print(f"  ❌ ERROR {method} {path} - {e}")
    
    return results

def test_imports():
    """Test all critical imports"""
    print("\n🔍 Testing Python Imports...")
    imports = [
        ("core.config", "Configuration"),
        ("core.models", "Database models"),
        ("core.database", "Database connection"),
        ("core.queue", "Job queue"),
        ("storage.s3", "Storage service"),
        ("models.registry", "Model registry"),
        ("api.routes", "API routes"),
        ("workers.process_job", "Job processor"),
    ]
    
    results = {}
    for module, description in imports:
        try:
            __import__(module)
            results[module] = {"success": True, "description": description}
            print(f"  ✅ PASS {module} - {description}")
        except Exception as e:
            results[module] = {"success": False, "error": str(e), "description": description}
            print(f"  ❌ FAIL {module} - {e}")
    
    return results

def test_services():
    """Test external services"""
    print("\n🔍 Testing External Services...")
    
    # Test Redis
    try:
        from core.queue import redis_conn
        redis_conn.ping()
        print("  ✅ PASS Redis - Connection successful")
        redis_ok = True
    except Exception as e:
        print(f"  ❌ FAIL Redis - {e}")
        redis_ok = False
    
    # Test MinIO
    try:
        from storage.s3 import minio_client
        minio_client.bucket_exists('test-bucket')
        print("  ✅ PASS MinIO - Connection successful")
        minio_ok = True
    except Exception as e:
        print(f"  ❌ FAIL MinIO - {e}")
        minio_ok = False
    
    # Test Database
    try:
        from core.database import engine
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
        print("  ✅ PASS Database - Connection successful")
        db_ok = True
    except Exception as e:
        print(f"  ❌ FAIL Database - {e}")
        db_ok = False
    
    return {
        "redis": redis_ok,
        "minio": minio_ok,
        "database": db_ok
    }

def test_job_creation():
    """Test job creation workflow"""
    print("\n🔍 Testing Job Creation...")
    
    try:
        # Test job creation endpoint
        response = requests.post(
            "http://localhost:8000/v1/jobs",
            json={
                "processing_type": "enhance",
                "input_key": "test/input.jpg",
                "preset_name": "auto_enhance"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            job_data = response.json()
            print(f"  ✅ PASS Job creation - Job ID: {job_data.get('job_id')}")
            return True
        else:
            print(f"  ❌ FAIL Job creation - Status: {response.status_code}")
            print(f"    Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"  ❌ FAIL Job creation - {e}")
        return False

def generate_report(api_results, import_results, service_results, job_test):
    """Generate comprehensive test report"""
    print("\n" + "="*60)
    print("📊 OMNIAPIXELS SYSTEM TEST REPORT")
    print("="*60)
    print(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # API Summary
    api_passed = sum(1 for r in api_results.values() if r['success'])
    api_total = len(api_results)
    print(f"\n🌐 API Endpoints: {api_passed}/{api_total} passed")
    
    # Import Summary
    import_passed = sum(1 for r in import_results.values() if r['success'])
    import_total = len(import_results)
    print(f"📦 Python Imports: {import_passed}/{import_total} passed")
    
    # Services Summary
    service_passed = sum(1 for r in service_results.values() if r)
    service_total = len(service_results)
    print(f"🔧 External Services: {service_passed}/{service_total} passed")
    
    # Job Test
    job_status = "✅ PASS" if job_test else "❌ FAIL"
    print(f"⚙️ Job Creation: {job_status}")
    
    # Overall Status
    total_passed = api_passed + import_passed + service_passed + (1 if job_test else 0)
    total_tests = api_total + import_total + service_total + 1
    overall_percentage = (total_passed / total_tests) * 100
    
    print(f"\n🎯 OVERALL SYSTEM STATUS: {total_passed}/{total_tests} ({overall_percentage:.1f}%)")
    
    if overall_percentage >= 80:
        print("✅ SYSTEM STATUS: HEALTHY")
    elif overall_percentage >= 60:
        print("⚠️ SYSTEM STATUS: PARTIAL")
    else:
        print("❌ SYSTEM STATUS: CRITICAL")
    
    # Recommendations
    print("\n📋 RECOMMENDATIONS:")
    if not service_results['redis']:
        print("  • Start Redis server for job queue functionality")
    if not service_results['minio']:
        print("  • Start MinIO server for file storage")
    if not service_results['database']:
        print("  • Start PostgreSQL or use SQLite fallback")
    if api_passed < api_total:
        print("  • Check API endpoint implementations")
    
    return overall_percentage >= 80

def main():
    """Main test function"""
    print("🚀 Starting OmniaPixels System Test...")
    
    # Run all tests
    api_results = test_api_endpoints()
    import_results = test_imports()
    service_results = test_services()
    job_test = test_job_creation()
    
    # Generate report
    system_healthy = generate_report(api_results, import_results, service_results, job_test)
    
    return 0 if system_healthy else 1

if __name__ == "__main__":
    sys.exit(main())
