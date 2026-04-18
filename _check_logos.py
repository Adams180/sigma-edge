import sqlite3
conn = sqlite3.connect("bet_data.db")
conn.row_factory = sqlite3.Row

with_logos = conn.execute("SELECT COUNT(*) FROM teams WHERE logo_url IS NOT NULL").fetchone()[0]
without_logos = conn.execute("SELECT COUNT(*) FROM teams WHERE logo_url IS NULL").fetchone()[0]
print(f"Teams with logos: {with_logos}")
print(f"Teams without logos: {without_logos}")
print()

print("=== Sample teams ===")
rows = conn.execute("SELECT name, logo_url FROM teams LIMIT 20").fetchall()
for r in rows:
    print(f"  {r['name']}: {r['logo_url'] or 'NULL'}")

print()
print("=== Teams WITH logos ===")
rows = conn.execute("SELECT name, logo_url FROM teams WHERE logo_url IS NOT NULL LIMIT 10").fetchall()
for r in rows:
    print(f"  {r['name']}: {r['logo_url'][:80]}")
