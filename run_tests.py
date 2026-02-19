import sys
import subprocess
import os

# Set PYTHONPATH to include the module root
module_root = os.path.join(os.getcwd(), "Noise filter module")
os.environ["PYTHONPATH"] = module_root + os.pathsep + os.environ.get("PYTHONPATH", "")

if __name__ == "__main__":
    with open("test_output_utf8.txt", "w", encoding="utf-8") as f:
        subprocess.run([sys.executable, "-m", "pytest", "Noise filter module/tests", "-v"], stdout=f, stderr=f)
    print("Tests finished. Output in test_output_utf8.txt")
