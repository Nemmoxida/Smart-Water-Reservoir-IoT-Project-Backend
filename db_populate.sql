WITH params AS (
    SELECT
        2000.0::numeric AS tank_capacity_l,
        4.0::numeric        AS people,
        150.0::numeric      AS avg_use_per_person_per_day_l,
        80.0::numeric       AS start_level_percent,   -- starting level in percent
        0.8::numeric        AS noise_scale_percent,  -- random jitter ±percent
        ((4.0 * 150.0) / 2000.0) * 100.0::numeric AS daily_use_percent
),
timeline AS (
    SELECT
        generate_series(0, 438000 - 1) AS gs,
        TIMESTAMP '2026-01-01 00:00:00' + (interval '1 minute' * generate_series(0, 438000 - 1)) AS ts
)
INSERT INTO sensor_data (date, distance)
SELECT
    t.ts AS date,
    -- Compose level: start minus per-day usage (distributed through the day),
    -- plus intra-day variation (morning/evening peaks) and small noise. Bound 0..100.
    ROUND(
        CAST(
            LEAST(
                100.0::numeric,
                GREATEST(
                    0.0::numeric,
                    (
                        p.start_level_percent
                        -- spread the expected daily consumption across the day (resets each day)
                        - (p.daily_use_percent * ((EXTRACT(epoch FROM t.ts) % 86400) / 86400.0))::numeric
                        -- intra-day pattern: sin() gives peaks (scaled to half the daily amplitude)
                        - ((p.daily_use_percent * 0.5) * (sin(2 * pi() * ((EXTRACT(hour FROM t.ts) * 60 + EXTRACT(minute FROM t.ts)) / 1440.0))))::numeric
                        -- small random jitter to avoid perfect determinism
                        + ((random() - 0.5) * 2.0 * p.noise_scale_percent)::numeric
                    )
                )
            ) AS numeric)
        , 2) AS distance
FROM timeline t
CROSS JOIN params p;