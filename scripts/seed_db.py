import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.services.firestore_service import db_service


def main():
    print("=== Muscle Memory Incident Database Seeder ===")
    incidents = db_service.get_all_incidents()
    print(f"Successfully loaded {len(incidents)} historical incidents into memory bank:")
    for inc in incidents:
        print(f"  [{inc.severity}] {inc.id}: {inc.title} ({inc.service})")

    stats = db_service.get_stats()
    print(f"\nCurrent Stats: {stats}")


if __name__ == "__main__":
    main()
