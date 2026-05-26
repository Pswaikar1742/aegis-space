"""
AegiSpace — SQLite Database Layer

Provides a thread-safe SQLite database with schema initialization and seed data.
Replaces Supabase for a self-contained, zero-dependency deployment.
"""

import logging
import os
import sqlite3
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

DB_PATH = os.environ.get("AEGIS_DB_PATH", os.path.join(os.path.dirname(__file__), "..", "..", "aegispace.db"))

def _dict_factory(cursor: sqlite3.Cursor, row: tuple) -> dict:
    """Row factory that returns dictionaries instead of tuples."""
    columns = [col[0] for col in cursor.description]
    return dict(zip(columns, row))

def get_connection() -> sqlite3.Connection:
    """Create a new SQLite connection with dict row factory."""
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = _dict_factory
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

# Module-level connection singleton
_conn: sqlite3.Connection | None = None

def get_db() -> sqlite3.Connection:
    """Return the singleton database connection."""
    global _conn
    if _conn is None:
        _conn = get_connection()
    return _conn

# ── Schema ────────────────────────────────────────────────────────────────

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    branch_id TEXT NOT NULL REFERENCES branches(id),
    external_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1,
    monthly_rate REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'available',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(branch_id, name)
);

CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    branch_id TEXT NOT NULL REFERENCES branches(id),
    company_name TEXT NOT NULL,
    contact_email TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    deal_size REAL DEFAULT 0,
    next_steps TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id),
    lead_id TEXT REFERENCES leads(id),
    branch_id TEXT NOT NULL REFERENCES branches(id),
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    monthly_rate_locked REAL NOT NULL DEFAULT 0,
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    total_value REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    branch_id TEXT NOT NULL REFERENCES branches(id),
    inventory_item_id TEXT,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    branch_id TEXT NOT NULL REFERENCES branches(id),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendance_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    branch_id TEXT NOT NULL REFERENCES branches(id),
    member_id TEXT,
    member_name TEXT NOT NULL,
    punch_in_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'clocked_in',
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS member_perks (
    member_id TEXT PRIMARY KEY,
    monthly_credits INTEGER DEFAULT 0,
    printing_quota INTEGER DEFAULT 0,
    active_status INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS visitors (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    branch_id TEXT NOT NULL REFERENCES branches(id),
    visitor_name TEXT NOT NULL,
    company TEXT,
    purpose TEXT NOT NULL,
    host_member_id TEXT,
    status TEXT NOT NULL DEFAULT 'pre_registered',
    checked_in_at TEXT,
    checked_out_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS facility_tasks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    branch_id TEXT NOT NULL REFERENCES branches(id),
    area TEXT NOT NULL DEFAULT '',
    task_type TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    assigned_to TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    branch_id TEXT NOT NULL,
    user_id TEXT,
    type TEXT NOT NULL,
    payload TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    company_name TEXT NOT NULL,
    branch_id TEXT NOT NULL REFERENCES branches(id),
    base_rent REAL NOT NULL DEFAULT 0,
    incidentals REAL NOT NULL DEFAULT 0,
    total_due REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now'))
);
"""


# ── Seed Data ────────────────────────────────────────────────────────────

KALYAN_ID  = "4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d"
BKC_ID     = "8b9c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e"
HYD_ID     = "9c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f"
STARK_ID   = "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"

def _seed(conn: sqlite3.Connection):
    """Insert initial data only if tables are empty."""
    cur = conn.cursor()
    count = cur.execute("SELECT COUNT(*) as c FROM branches").fetchone()["c"]
    if count > 0:
        logger.info("Database already seeded (%d branches), ensuring feature tables are populated.", count)
        _ensure_feature_seed(conn)
        return

    logger.info("Seeding database with initial data...")

    # Branches
    cur.executemany(
        "INSERT INTO branches (id, name, city, address) VALUES (?, ?, ?, ?)",
        [
            (KALYAN_ID,  "Kalyan Center",  "Mumbai Metropolitan Region", "Kalyan West, Thane District"),
            (BKC_ID,     "BKC Tower",      "Mumbai",                     "Bandra Kurla Complex, Mumbai 400051"),
            (HYD_ID,     "Hyderabad Hub",  "Hyderabad",                  "HITEC City, Madhapur, Hyderabad 500081"),
        ]
    )

    # Inventory — Kalyan
    kalyan_inv = [
        (str(uuid.uuid4()), KALYAN_ID, "hot_desk_1",        "HD-01",                 "hot_desk",       1,  220, "available"),
        (str(uuid.uuid4()), KALYAN_ID, "hot_desk_2",        "HD-02",                 "hot_desk",       1,  220, "available"),
        (str(uuid.uuid4()), KALYAN_ID, "hot_desk_3",        "HD-03",                 "hot_desk",       1,  220, "available"),
        (str(uuid.uuid4()), KALYAN_ID, "hot_desk_4",        "HD-04",                 "hot_desk",       1,  220, "available"),
        (str(uuid.uuid4()), KALYAN_ID, "hot_desk_5",        "HD-05",                 "hot_desk",       1,  220, "available"),
        (str(uuid.uuid4()), KALYAN_ID, "hot_desk_6",        "HD-06",                 "hot_desk",       1,  220, "available"),
        (str(uuid.uuid4()), KALYAN_ID, "dedicated_seat_40", "Dedicated Seat #40",    "dedicated_desk", 1,  350, "available"),
        (str(uuid.uuid4()), KALYAN_ID, "conference_alpha",  "Conference Room Alpha", "meeting_room",   12, 1800, "available"),
        (str(uuid.uuid4()), KALYAN_ID, "suite_203",         "Private Suite 203",     "private_suite",  6,  4200, "available"),
        (str(uuid.uuid4()), KALYAN_ID, "phone_booth_a",     "Phone Booth A",         "meeting_room",   2,  520, "available"),
    ]
    # Inventory — BKC
    bkc_inv = [
        (str(uuid.uuid4()), BKC_ID, "bkc_hot_1",   "BKC-HD-01",          "hot_desk",       1,  280, "available"),
        (str(uuid.uuid4()), BKC_ID, "bkc_hot_2",   "BKC-HD-02",          "hot_desk",       1,  280, "available"),
        (str(uuid.uuid4()), BKC_ID, "bkc_hot_3",   "BKC-HD-03",          "hot_desk",       1,  280, "available"),
        (str(uuid.uuid4()), BKC_ID, "bkc_ded_1",   "BKC-DS-01",          "dedicated_desk", 1,  450, "available"),
        (str(uuid.uuid4()), BKC_ID, "bkc_conf_a",  "BKC Conference A",   "meeting_room",   10, 2200, "available"),
        (str(uuid.uuid4()), BKC_ID, "bkc_suite_1", "BKC Executive Suite","private_suite",  8,  5200, "available"),
    ]
    # Inventory — Hyderabad
    hyd_inv = [
        (str(uuid.uuid4()), HYD_ID, "hyd_hot_1",   "HYD-HD-01",          "hot_desk",       1,  200, "available"),
        (str(uuid.uuid4()), HYD_ID, "hyd_hot_2",   "HYD-HD-02",          "hot_desk",       1,  200, "available"),
        (str(uuid.uuid4()), HYD_ID, "hyd_ded_1",   "HYD-DS-01",          "dedicated_desk", 1,  380, "available"),
        (str(uuid.uuid4()), HYD_ID, "hyd_conf_a",  "HYD Conference A",   "meeting_room",   8,  1600, "available"),
        (str(uuid.uuid4()), HYD_ID, "hyd_suite_1", "HYD Innovation Suite","private_suite", 10, 3800, "available"),
    ]

    cur.executemany(
        "INSERT INTO inventory_items (id, branch_id, external_id, name, type, capacity, monthly_rate, status) VALUES (?,?,?,?,?,?,?,?)",
        kalyan_inv + bkc_inv + hyd_inv,
    )

    # Leads
    cur.executemany(
        "INSERT INTO leads (id, branch_id, company_name, contact_email, status, deal_size, next_steps) VALUES (?,?,?,?,?,?,?)",
        [
            (str(uuid.uuid4()), KALYAN_ID, "Wayne Enterprises",  "bruce@wayne.com",   "new",           15000, "Site visit scheduled"),
            (str(uuid.uuid4()), KALYAN_ID, "Stark Industries",   "pepper@stark.com",  "closed_won",    42000, "Contract signed"),
            (str(uuid.uuid4()), BKC_ID,    "Oscorp",             "norman@oscorp.com", "proposal_sent", 28000, "Awaiting VP approval"),
            (str(uuid.uuid4()), HYD_ID,    "LexCorp",            "lex@lexcorp.com",   "new",           22000, "Initial inquiry"),
        ]
    )

    # Member Perks
    cur.execute(
        "INSERT INTO member_perks (member_id, monthly_credits, printing_quota, active_status) VALUES (?, ?, ?, ?)",
        (STARK_ID, 240, 1000, 1),
    )
    cur.execute(
        "INSERT INTO member_perks (member_id, monthly_credits, printing_quota, active_status) VALUES (?, ?, ?, ?)",
        ("ten-0001", 180, 500, 1),
    )

    # Members / demo auth identities
    cur.executemany(
        "INSERT INTO members (id, company_name, email, password, role, branch_id) VALUES (?,?,?,?,?,?)",
        [
            ("cfo-0001", "AegiSpace Finance", "cfo@aegis.local", "AegisSpace2026!CFO", "cfo", KALYAN_ID),
            ("mgr-0001", "Kalyan Center Ops", "manager@aegis.local", "AegisSpace2026!MGR", "manager", KALYAN_ID),
            ("mem-0001", "Stark Industries", "member@aegis.local", "AegisSpace2026!MEM", "member", KALYAN_ID),
            ("ten-0001", "Stark Industries", "tenant-admin@aegis.local", "AegisSpace2026!TEN", "tenant_admin", KALYAN_ID),
            ("front-0001", "AegiSpace Front Desk", "front-desk@aegis.local", "AegisSpace2026!FRONT", "front_desk", KALYAN_ID),
            ("it-0001", "AegiSpace IT", "it-admin@aegis.local", "AegisSpace2026!IT", "it_admin", KALYAN_ID),
            ("vend-0001", "AegiSpace Facilities", "vendor@aegis.local", "AegisSpace2026!VEND", "vendor", KALYAN_ID),
        ],
    )

    # Attendance logs
    cur.executemany(
        "INSERT INTO attendance_logs (id, branch_id, member_id, member_name, punch_in_time, status, note) VALUES (?,?,?,?,?,?,?)",
        [
            (str(uuid.uuid4()), KALYAN_ID, "cfo-0001", "Natasha Romanoff", "2026-05-26 08:42:00", "clocked_in", "CFO floor review"),
            (str(uuid.uuid4()), KALYAN_ID, "mgr-0001", "Happy Hogan", "2026-05-26 09:05:00", "clocked_in", "Morning ops standup"),
            (str(uuid.uuid4()), KALYAN_ID, "mem-0001", "Tony Stark", "2026-05-26 09:18:00", "clocked_in", "Seat HD-02"),
        ],
    )

    # Invoices / accounts receivable seed
    cur.executemany(
        "INSERT INTO invoices (id, company_name, branch_id, base_rent, incidentals, total_due, status) VALUES (?,?,?,?,?,?,?)",
        [
            (str(uuid.uuid4()), "Stark Industries", KALYAN_ID, 42000, 1200, 43200, "issued"),
            (str(uuid.uuid4()), "Wayne Enterprises", KALYAN_ID, 15000, 0, 15000, "draft"),
            (str(uuid.uuid4()), "Oscorp", BKC_ID, 22000, 450, 22450, "issued"),
        ],
    )

    # Visitors (Front-Desk seed)
    cur.executemany(
        "INSERT INTO visitors (id, branch_id, visitor_name, company, purpose, host_member_id, status) VALUES (?,?,?,?,?,?,?)",
        [
            (str(uuid.uuid4()), KALYAN_ID, "Tony Stark",       "Stark Industries",  "Facility Tour",     STARK_ID, "pre_registered"),
            (str(uuid.uuid4()), KALYAN_ID, "Pepper Potts",     "Stark Industries",  "Monthly Check-in",  STARK_ID, "checked_in"),
            (str(uuid.uuid4()), BKC_ID,    "Norman Osborn",    "Oscorp",            "Sales Meeting",     None,     "pre_registered"),
            (str(uuid.uuid4()), HYD_ID,    "Lex Luthor",       "LexCorp",           "Site Inspection",   None,     "pre_registered"),
        ]
    )

    # Facility Tasks (Vendor seed)
    cur.executemany(
        "INSERT INTO facility_tasks (id, branch_id, area, task_type, description, priority, status) VALUES (?,?,?,?,?,?,?)",
        [
            (str(uuid.uuid4()), KALYAN_ID, "3rd Floor East Wing",    "cleaning",    "Deep clean carpets and sanitize desks",        "high",    "pending"),
            (str(uuid.uuid4()), KALYAN_ID, "Conference Room Alpha",  "repair",      "Projector bulb replacement required",          "urgent",  "pending"),
            (str(uuid.uuid4()), BKC_ID,    "Executive Suite",        "inspection",  "Fire safety inspection due this week",         "normal",  "pending"),
            (str(uuid.uuid4()), HYD_ID,    "Main Lobby",             "cleaning",    "Evening janitorial sweep and trash collection", "normal",  "pending"),
        ]
    )

    # Notifications
    cur.executemany(
        "INSERT INTO notifications (id, branch_id, user_id, type, payload, read) VALUES (?,?,?,?,?,?)",
        [
            (str(uuid.uuid4()), KALYAN_ID, None, "system_startup",   '{"message": "AegiSpace SQLite backend initialized"}', 0),
            (str(uuid.uuid4()), KALYAN_ID, None, "booking_created",  '{"message": "Stark Industries contract activated"}',  0),
        ]
    )

    conn.commit()
    logger.info("Database seeded successfully with 3 branches and %d inventory items.", len(kalyan_inv) + len(bkc_inv) + len(hyd_inv))


def _ensure_feature_seed(conn: sqlite3.Connection) -> None:
    """Populate newly introduced tables on existing databases without duplicating legacy data."""
    cur = conn.cursor()

    member_count = cur.execute("SELECT COUNT(*) as c FROM members").fetchone()["c"] if _table_exists(cur, "members") else 0
    if member_count == 0:
        cur.executemany(
            "INSERT INTO members (id, company_name, email, password, role, branch_id) VALUES (?,?,?,?,?,?)",
            [
                ("cfo-0001", "AegiSpace Finance", "cfo@aegis.local", "AegisSpace2026!CFO", "cfo", KALYAN_ID),
                ("mgr-0001", "Kalyan Center Ops", "manager@aegis.local", "AegisSpace2026!MGR", "manager", KALYAN_ID),
                ("mem-0001", "Stark Industries", "member@aegis.local", "AegisSpace2026!MEM", "member", KALYAN_ID),
                ("ten-0001", "Stark Industries", "tenant-admin@aegis.local", "AegisSpace2026!TEN", "tenant_admin", KALYAN_ID),
                ("front-0001", "AegiSpace Front Desk", "front-desk@aegis.local", "AegisSpace2026!FRONT", "front_desk", KALYAN_ID),
                ("it-0001", "AegiSpace IT", "it-admin@aegis.local", "AegisSpace2026!IT", "it_admin", KALYAN_ID),
                ("vend-0001", "AegiSpace Facilities", "vendor@aegis.local", "AegisSpace2026!VEND", "vendor", KALYAN_ID),
            ],
        )
    else:
        existing_emails = {
            row[0] for row in cur.execute("SELECT email FROM members").fetchall()
        }
        missing_members = [
            ("front-0001", "AegiSpace Front Desk", "front-desk@aegis.local", "AegisSpace2026!FRONT", "front_desk", KALYAN_ID),
            ("it-0001", "AegiSpace IT", "it-admin@aegis.local", "AegisSpace2026!IT", "it_admin", KALYAN_ID),
            ("vend-0001", "AegiSpace Facilities", "vendor@aegis.local", "AegisSpace2026!VEND", "vendor", KALYAN_ID),
        ]
        for row in missing_members:
            if row[2] not in existing_emails:
                cur.execute(
                    "INSERT INTO members (id, company_name, email, password, role, branch_id) VALUES (?,?,?,?,?,?)",
                    row,
                )

    if _table_exists(cur, "member_perks"):
        perks_exists = cur.execute("SELECT COUNT(*) as c FROM member_perks WHERE member_id=?", ("ten-0001",)).fetchone()["c"]
        if perks_exists == 0:
            cur.execute(
                "INSERT INTO member_perks (member_id, monthly_credits, printing_quota, active_status) VALUES (?, ?, ?, ?)",
                ("ten-0001", 180, 500, 1),
            )

    attendance_count = cur.execute("SELECT COUNT(*) as c FROM attendance_logs").fetchone()["c"] if _table_exists(cur, "attendance_logs") else 0
    if attendance_count == 0:
        cur.executemany(
            "INSERT INTO attendance_logs (id, branch_id, member_id, member_name, punch_in_time, status, note) VALUES (?,?,?,?,?,?,?)",
            [
                (str(uuid.uuid4()), KALYAN_ID, "cfo-0001", "Natasha Romanoff", "2026-05-26 08:42:00", "clocked_in", "CFO floor review"),
                (str(uuid.uuid4()), KALYAN_ID, "mgr-0001", "Happy Hogan", "2026-05-26 09:05:00", "clocked_in", "Morning ops standup"),
                (str(uuid.uuid4()), KALYAN_ID, "mem-0001", "Tony Stark", "2026-05-26 09:18:00", "clocked_in", "Seat HD-02"),
            ],
        )

    invoices_count = cur.execute("SELECT COUNT(*) as c FROM invoices").fetchone()["c"] if _table_exists(cur, "invoices") else 0
    if invoices_count == 0:
        cur.executemany(
            "INSERT INTO invoices (id, company_name, branch_id, base_rent, incidentals, total_due, status) VALUES (?,?,?,?,?,?,?)",
            [
                (str(uuid.uuid4()), "Stark Industries", KALYAN_ID, 42000, 1200, 43200, "issued"),
                (str(uuid.uuid4()), "Wayne Enterprises", KALYAN_ID, 15000, 0, 15000, "draft"),
                (str(uuid.uuid4()), "Oscorp", BKC_ID, 22000, 450, 22450, "issued"),
            ],
        )

    conn.commit()


def _table_exists(cur: sqlite3.Cursor, table_name: str) -> bool:
    row = cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,),
    ).fetchone()
    return row is not None


def init_db():
    """Initialize the database schema and seed data."""
    conn = get_db()
    conn.executescript(SCHEMA_SQL)
    _seed(conn)
    logger.info("SQLite database initialized at %s", os.path.abspath(DB_PATH))

