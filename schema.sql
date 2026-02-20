-- Rental Management System — D1 Schema
-- All dates stored as ISO 8601 text: 'YYYY-MM-DD'

CREATE TABLE IF NOT EXISTS device_asset (
    device_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    device_name  TEXT    NOT NULL,
    device_type  TEXT    NOT NULL CHECK(device_type IN ('camerabody', 'lense')),
    color        TEXT    NOT NULL  -- hex color string, e.g. '#3a8fd4'
);

CREATE TABLE IF NOT EXISTS concert_calendar (
    concert_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    title          TEXT    NOT NULL,
    location_type  TEXT    NOT NULL CHECK(location_type IN ('local', 'remote')),
    start_date     TEXT    NOT NULL,
    end_date       TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS rental_orders (
    order_id            INTEGER PRIMARY KEY AUTOINCREMENT,
    concert_id          INTEGER NOT NULL  REFERENCES concert_calendar(concert_id),
    start_date          TEXT    NOT NULL,
    end_date            TEXT    NOT NULL,
    camerabody_id       INTEGER           REFERENCES device_asset(device_id),
    lense_id            INTEGER           REFERENCES device_asset(device_id),
    daily_rate          REAL    NOT NULL  DEFAULT 0,
    shipping_fee        REAL    NOT NULL  DEFAULT 0,
    intern_fee          REAL    NOT NULL  DEFAULT 0,
    occupy_mode         TEXT    NOT NULL  DEFAULT 'safe'
                                         CHECK(occupy_mode IN ('safe', 'aggressive', 'custom', 'shipping')),
    buffer_days_before  INTEGER NOT NULL  DEFAULT 0,
    buffer_days_after   INTEGER NOT NULL  DEFAULT 0,
    notes               TEXT,
    CHECK (camerabody_id IS NOT NULL OR lense_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS device_calendar (
    calendar_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id      INTEGER NOT NULL  REFERENCES rental_orders(order_id) ON DELETE CASCADE,
    camerabody_id INTEGER           REFERENCES device_asset(device_id),
    lense_id      INTEGER           REFERENCES device_asset(device_id),
    start_date    TEXT    NOT NULL,  -- adjusted start (includes buffer_days_before)
    end_date      TEXT    NOT NULL   -- adjusted end   (includes buffer_days_after)
);

CREATE TABLE IF NOT EXISTS occupied_dates (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id  INTEGER NOT NULL  REFERENCES device_asset(device_id),
    date       TEXT    NOT NULL,  -- single ISO date, one row per device per occupied day
    order_id   INTEGER NOT NULL  REFERENCES rental_orders(order_id) ON DELETE CASCADE,
    UNIQUE(device_id, date)       -- hard constraint: double-booking is impossible at DB level
);

-- Admin system: issued client URLs and admin credentials
CREATE TABLE IF NOT EXISTS client_urls (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id   TEXT    NOT NULL UNIQUE,          -- 16-char random string used in URL
    label       TEXT    NOT NULL,                  -- human label, e.g. 'Mr. Chen - Shanghai'
    locale      TEXT    NOT NULL DEFAULT 'en-us',
    created_at  TEXT    NOT NULL DEFAULT (date('now')),
    is_active   INTEGER NOT NULL DEFAULT 1         -- 0 = revoked, 1 = active
);

CREATE TABLE IF NOT EXISTS admin_credentials (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL                 -- bcrypt hash; verified server-side
);
